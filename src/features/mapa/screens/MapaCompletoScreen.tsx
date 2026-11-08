import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';

import { AppIcon } from '@/components/ui';
import { AgroColors, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useLiveQuery, type Talhao } from '@/database';
import {
  atualizarTalhao,
  criarTalhao,
  deletarTalhao,
  listarTalhoesAtivos,
} from '@/services/talhaoService';
import { calcularPerimetroKm, type Coordenada } from '@/utils/geoMath';
import { CamadaDesenho } from '../components/CamadaDesenho';
import { CamadaDivisaFazenda } from '../components/CamadaDivisaFazenda';
import { CamadaTalhoesSalvos } from '../components/CamadaTalhoesSalvos';
import { BotaoMapa, CoresTexto, LinkMapa } from '../components/elementos';
import {
  MapaBase,
  type EstiloMapa,
  type MapaBaseHandle,
  type VistaMapa,
} from '../components/MapaBase';
import { SalvarFazendaSheet } from '../components/SalvarFazendaSheet';
import { SalvarTalhaoSheet, type DadosSalvarTalhao } from '../components/SalvarTalhaoSheet';
import {
  obterFazendaMapa,
  pontosForaDaFazenda,
  salvarFazendaMapa,
  useFazendaMapa,
} from '../data/fazendaMapa';
import { useDesenhoTalhao, type ResultadoDesenhoTalhao } from '../hooks/useDesenhoTalhao';
import { buscarLocais, type ResultadoBusca } from '../services/busca';
import { formatarDistancia, formatarHectares } from '../services/calculos';
import { vistaDaFazenda } from '../services/vista';

const ROTULO_TIPO: Record<Talhao['tipo'], string> = {
  pasto: 'Pasto',
  lavoura: 'Lavoura',
  reserva: 'Reserva',
  outro: 'Outro',
};

const ZOOM_BUSCA = 15;
const MARGEM = 12;

/** O que está sendo desenhado: a divisa, um talhão novo ou o contorno de um existente */
type AlvoDesenho =
  | { tipo: 'divisa' }
  | { tipo: 'talhao' }
  | { tipo: 'contorno'; talhaoId: string; nome: string };

function perimetroDoTalhao(talhao: Talhao): number {
  return calcularPerimetroKm((talhao.geometriaJson.coordinates[0] ?? []) as Coordenada[]);
}

function confirmarExclusao(talhao: Talhao, aoExcluir: () => void) {
  Alert.alert('Excluir talhão', `Excluir "${talhao.nome}" do mapa?`, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Excluir',
      style: 'destructive',
      onPress: () => {
        aoExcluir();
        deletarTalhao(talhao.id);
      },
    },
  ]);
}

/**
 * Mapa em tela cheia. Fluxo: achar a terra (busca, GPS, camadas) → marcar a
 * divisa da fazenda → separar a fazenda em talhões. Talhões podem ser criados a
 * qualquer momento, editados (nome, tipo, cor, contorno) e excluídos.
 */
export default function MapaCompletoScreen() {
  const insets = useSafeAreaInsets();
  const { talhao: talhaoInicialId, desenhar } = useLocalSearchParams<{
    talhao?: string;
    desenhar?: 'divisa' | 'talhao';
  }>();
  const { data: talhoes, updatedAt, error } = useLiveQuery(listarTalhoesAtivos());
  const carregado = updatedAt !== undefined || error !== undefined;
  const fazenda = useFazendaMapa();

  const mapaRef = useRef<MapaBaseHandle>(null);
  const [vistaInicial, setVistaInicial] = useState<VistaMapa | null>(null);
  const [estilo, setEstilo] = useState<EstiloMapa>('satelite');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(talhaoInicialId ?? null);
  // Atalho da tela anterior: sem divisa marcada, qualquer desenho começa por ela
  const [alvo, setAlvo] = useState<AlvoDesenho>(() =>
    desenhar === 'divisa' || (desenhar === 'talhao' && !obterFazendaMapa())
      ? { tipo: 'divisa' }
      : { tipo: 'talhao' },
  );
  const [rascunho, setRascunho] = useState<ResultadoDesenhoTalhao | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | undefined>();

  // Talhão novo precisa ficar dentro da divisa (se ela já foi marcada)
  const restricao = useMemo(() => {
    if (alvo.tipo === 'divisa' || !fazenda) return undefined;
    return (pontos: Coordenada[]) => {
      const fora = pontosForaDaFazenda(fazenda, pontos);
      if (fora === 0) return null;
      return fora === 1
        ? 'Esse canto ficou fora da divisa da fazenda. Toque em Desfazer.'
        : 'Há cantos fora da divisa da fazenda. Toque em Desfazer.';
    };
  }, [alvo.tipo, fazenda]);

  const {
    pontos,
    modoDesenho,
    areaAtualHa,
    erroTopologico,
    podeConcluir,
    iniciar,
    cancelar,
    adicionarPonto,
    desfazerPonto,
    limpar,
    concluir,
  } = useDesenhoTalhao({
    onConcluir: setRascunho,
    doQue: alvo.tipo === 'divisa' ? 'da divisa' : 'do talhão',
    restricao,
    comecarDesenhando: desenhar === 'divisa' || desenhar === 'talhao',
  });

  const comecarDesenho = useCallback(
    (novoAlvo: AlvoDesenho) => {
      setSelecionadoId(null);
      setAlvo(novoAlvo);
      limpar();
      iniciar();
    },
    [iniciar, limpar],
  );

  // A câmera abre uma vez só, quando os talhões terminam de carregar
  if (carregado && !vistaInicial) {
    const foco = talhoes.find((t) => t.id === talhaoInicialId);
    setVistaInicial(
      foco
        ? { tipo: 'area', ne: [foco.maxLng, foco.maxLat], sw: [foco.minLng, foco.minLat] }
        : vistaDaFazenda(obterFazendaMapa(), talhoes),
    );
  }

  const selecionado = useMemo(
    () => (modoDesenho ? null : (talhoes.find((t) => t.id === selecionadoId) ?? null)),
    [modoDesenho, talhoes, selecionadoId],
  );
  const editando = talhoes.find((t) => t.id === editandoId) ?? null;

  // Voltar do Android sai do desenho antes de sair da tela
  useEffect(() => {
    if (!modoDesenho) return;
    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      cancelar();
      return true;
    });
    return () => inscricao.remove();
  }, [modoDesenho, cancelar]);

  // Contorno novo de um talhão existente: grava direto, sem pedir nome de novo
  useEffect(() => {
    if (!rascunho || alvo.tipo !== 'contorno') return;
    const talhaoId = alvo.talhaoId;
    atualizarTalhao(talhaoId, { coordenadas: rascunho.pontos })
      .then(() => {
        limpar();
        setRascunho(null);
        setAlvo({ tipo: 'talhao' });
        setSelecionadoId(talhaoId);
      })
      .catch((err: unknown) => {
        setRascunho(null);
        iniciar();
        Alert.alert('Não foi possível salvar', err instanceof Error ? err.message : String(err));
      });
  }, [rascunho, alvo, limpar, iniciar]);

  const selecionarTalhao = useCallback(
    (id: string) => {
      if (modoDesenho) return;
      setSelecionadoId((atual) => (atual === id ? null : id));
    },
    [modoDesenho],
  );

  const centralizarNoGps = async () => {
    const conseguiu = await mapaRef.current?.centralizarNoGps();
    if (conseguiu === false) {
      Alert.alert(
        'Localização indisponível',
        'Permita o acesso à localização e ligue o GPS do celular para centralizar o mapa em você.',
      );
    }
  };

  const voltarAoDesenho = () => {
    setRascunho(null);
    setErroSalvar(undefined);
    iniciar();
  };

  const salvarFazenda = (nome: string) => {
    if (!rascunho) return;
    try {
      salvarFazendaMapa(nome, rascunho.pontos);
      limpar();
      setRascunho(null);
      setErroSalvar(undefined);
      setAlvo({ tipo: 'talhao' });
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : 'Não foi possível salvar a fazenda.');
    }
  };

  const salvarTalhaoNovo = async ({ nome, tipo, cor }: DadosSalvarTalhao) => {
    if (!rascunho) return;
    try {
      setSalvando(true);
      setErroSalvar(undefined);
      const novo = await criarTalhao({ nome, tipo, cor, coordenadas: rascunho.pontos });
      limpar();
      setRascunho(null);
      setSelecionadoId(novo.id);
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : 'Não foi possível salvar o talhão.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarEdicao = async (dados: DadosSalvarTalhao) => {
    if (!editando) return;
    try {
      setSalvando(true);
      setErroSalvar(undefined);
      await atualizarTalhao(editando.id, dados);
      setEditandoId(null);
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : 'Não foi possível salvar o talhão.');
    } finally {
      setSalvando(false);
    }
  };

  const topo = insets.top + MARGEM;
  const base = insets.bottom + MARGEM;
  const desenhandoDivisa = alvo.tipo === 'divisa';
  const rascunhoDoQue = rascunho && alvo.tipo !== 'contorno' ? alvo.tipo : null;

  return (
    <View style={estilos.raiz}>
      <StatusBar style="light" />

      {vistaInicial ? (
        <MapaBase
          ref={mapaRef}
          vistaInicial={vistaInicial}
          estilo={estilo}
          centralizarNoGpsAoAbrir={!fazenda && talhoes.length === 0}
          folga={{ top: topo + 140, bottom: base + 240, left: 40, right: 40 }}
          onMapPress={adicionarPonto}
          style={StyleSheet.absoluteFill}>
          {fazenda && !(modoDesenho && desenhandoDivisa) ? (
            <CamadaDivisaFazenda divisa={fazenda.divisa} />
          ) : null}
          <CamadaTalhoesSalvos
            talhoes={talhoes}
            selecionadoId={selecionado?.id ?? null}
            onPressTalhao={selecionarTalhao}
          />
          <CamadaDesenho pontos={pontos} erroTopologico={erroTopologico} />
        </MapaBase>
      ) : (
        <View style={[StyleSheet.absoluteFill, estilos.carregando]}>
          <ActivityIndicator color={AgroColors.textInverse} />
        </View>
      )}

      {/* Mira no centro do mapa enquanto procura a terra */}
      {!modoDesenho && !fazenda ? (
        <View style={estilos.miraCamada} pointerEvents="none">
          <View style={estilos.mira}>
            <View style={estilos.miraPonto} />
          </View>
        </View>
      ) : null}

      {modoDesenho ? (
        <View style={[estilos.cartaoTopo, { top: topo }]}>
          <Pressable
            onPress={() => {
              cancelar();
              setAlvo({ tipo: 'talhao' });
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cancelar desenho"
            style={({ pressed }) => [estilos.fecharDesenho, pressed && estilos.pressionado]}>
            <AppIcon name="x" size={24} color={CoresTexto.escuro} />
          </Pressable>
          <View style={estilos.cartaoTopoTextos}>
            <Text style={estilos.cartaoTopoTitulo} numberOfLines={1}>
              {desenhandoDivisa
                ? 'Divisa da fazenda'
                : alvo.tipo === 'contorno'
                  ? `Novo contorno: ${alvo.nome}`
                  : 'Novo talhão'}
            </Text>
            <Text
              style={[estilos.cartaoTopoSub, erroTopologico ? estilos.textoErro : null]}
              numberOfLines={2}>
              {erroTopologico ??
                (pontos.length === 0
                  ? 'Toque no mapa no primeiro canto'
                  : podeConcluir
                    ? 'Toque em Concluir quando fechar a área'
                    : 'Continue tocando nos cantos')}
            </Text>
          </View>
        </View>
      ) : (
        <BarraBusca
          topo={topo}
          onVoltar={() => router.back()}
          onEscolher={(r) => mapaRef.current?.voarPara(r.coordenada, ZOOM_BUSCA)}
          controles={
            <View style={estilos.controles}>
              <BotaoQuadrado
                icone="layers"
                rotulo={estilo === 'satelite' ? 'Ver mapa de estradas' : 'Ver satélite'}
                onPress={() => setEstilo((atual) => (atual === 'satelite' ? 'mapa' : 'satelite'))}
              />
              <BotaoQuadrado
                icone="locate"
                rotulo="Centralizar na minha localização"
                onPress={centralizarNoGps}
              />
            </View>
          }
        />
      )}

      <View style={[estilos.rodape, { bottom: base }]} pointerEvents="box-none">
        <View style={estilos.cartaoRodape}>
          {modoDesenho ? (
            <>
              <Text style={estilos.explicacao}>
                {desenhandoDivisa
                  ? 'Toque em cada canto da divisa da fazenda, um depois do outro. O app liga os pontos e fecha o contorno sozinho.'
                  : fazenda
                    ? 'Toque em cada canto do talhão, dentro da divisa amarela. O app liga os pontos e fecha a área sozinho.'
                    : 'Toque em cada canto do talhão, um depois do outro. O app liga os pontos e fecha a área sozinho.'}
              </Text>
              <View style={estilos.medidas}>
                <View style={estilos.medida}>
                  <Text style={estilos.medidaRotulo}>Área</Text>
                  <Text style={estilos.medidaValor}>
                    {pontos.length >= 3 ? formatarHectares(areaAtualHa) : '—'}
                  </Text>
                </View>
                <View style={estilos.medida}>
                  <Text style={estilos.medidaRotulo}>Perímetro</Text>
                  <Text style={estilos.medidaValor}>
                    {pontos.length >= 2 ? formatarDistancia(calcularPerimetroKm(pontos)) : '—'}
                  </Text>
                </View>
              </View>
              <View style={estilos.acoes}>
                <BotaoMapa
                  rotulo="Desfazer"
                  icone="undo"
                  variante="contorno"
                  desabilitado={pontos.length === 0}
                  onPress={desfazerPonto}
                  style={estilos.acao}
                />
                <BotaoMapa
                  rotulo="Concluir"
                  desabilitado={!podeConcluir}
                  onPress={concluir}
                  style={estilos.acao}
                />
              </View>
            </>
          ) : selecionado ? (
            <>
              <View style={estilos.cabecalhoTalhao}>
                <View style={[estilos.pontoCor, { backgroundColor: selecionado.cor }]} />
                <Text style={estilos.cartaoTitulo} numberOfLines={1}>
                  {selecionado.nome}
                </Text>
                <Pressable
                  onPress={() => setSelecionadoId(null)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar detalhes do talhão"
                  style={estilos.fecharTalhao}>
                  <AppIcon name="x" size={20} color={CoresTexto.suave} />
                </Pressable>
              </View>
              <Text style={estilos.cartaoTexto}>
                {ROTULO_TIPO[selecionado.tipo]} · {formatarHectares(selecionado.areaHectares)} ·{' '}
                {formatarDistancia(perimetroDoTalhao(selecionado))} de perímetro
              </Text>
              <View style={estilos.acoes}>
                <BotaoMapa
                  rotulo="Editar"
                  icone="edit"
                  variante="contorno"
                  onPress={() => {
                    setErroSalvar(undefined);
                    setEditandoId(selecionado.id);
                  }}
                  style={estilos.acao}
                />
                <BotaoMapa
                  rotulo="Excluir"
                  icone="trash"
                  variante="contorno"
                  onPress={() => confirmarExclusao(selecionado, () => setSelecionadoId(null))}
                  style={estilos.acao}
                />
              </View>
            </>
          ) : !fazenda ? (
            <>
              <Text style={estilos.cartaoTitulo}>Encontre a sua terra</Text>
              <Text style={estilos.cartaoTexto}>
                Arraste o mapa com um dedo e aproxime com dois. Ou busque pela cidade ou
                coordenada. Depois marque a divisa da fazenda.
              </Text>
              <BotaoMapa
                rotulo="Marcar a divisa aqui"
                icone="pentagon"
                onPress={() => comecarDesenho({ tipo: 'divisa' })}
                style={estilos.botaoPrincipal}
              />
            </>
          ) : (
            <>
              <Text style={estilos.cartaoTitulo}>
                {talhoes.length === 0 ? 'Agora separe os talhões' : fazenda.nome}
              </Text>
              <Text style={estilos.cartaoTexto}>
                {talhoes.length === 0
                  ? 'Desenhe cada pasto, lavoura ou reserva dentro da divisa amarela.'
                  : 'Desenhe mais talhões ou toque num talhão para editar ou excluir.'}
              </Text>
              <BotaoMapa
                rotulo={talhoes.length === 0 ? 'Desenhar talhão' : 'Desenhar outro talhão'}
                icone="pentagon"
                onPress={() => comecarDesenho({ tipo: 'talhao' })}
                style={estilos.botaoPrincipal}
              />
              <LinkMapa
                rotulo="Redesenhar a divisa da fazenda"
                icone="mapPin"
                onPress={() => comecarDesenho({ tipo: 'divisa' })}
              />
            </>
          )}
        </View>
      </View>

      <SalvarFazendaSheet
        visible={rascunhoDoQue === 'divisa'}
        nomeAtual={fazenda?.nome}
        areaHa={rascunho?.areaHectares ?? 0}
        perimetroKm={rascunho ? calcularPerimetroKm(rascunho.pontos) : 0}
        erro={erroSalvar}
        onSalvar={salvarFazenda}
        onClose={voltarAoDesenho}
      />

      <SalvarTalhaoSheet
        visible={rascunhoDoQue === 'talhao'}
        areaHa={rascunho?.areaHectares ?? 0}
        perimetroKm={rascunho ? calcularPerimetroKm(rascunho.pontos) : 0}
        salvando={salvando}
        erro={erroSalvar}
        onSalvar={salvarTalhaoNovo}
        onClose={voltarAoDesenho}
      />

      <SalvarTalhaoSheet
        visible={editando !== null}
        inicial={
          editando ? { nome: editando.nome, tipo: editando.tipo, cor: editando.cor } : undefined
        }
        areaHa={editando?.areaHectares ?? 0}
        perimetroKm={editando ? perimetroDoTalhao(editando) : 0}
        salvando={salvando}
        erro={erroSalvar}
        onSalvar={salvarEdicao}
        onClose={() => setEditandoId(null)}
        onRedesenhar={() => {
          if (!editando) return;
          setEditandoId(null);
          comecarDesenho({ tipo: 'contorno', talhaoId: editando.id, nome: editando.nome });
        }}
        onExcluir={() => {
          if (!editando) return;
          confirmarExclusao(editando, () => {
            setEditandoId(null);
            setSelecionadoId(null);
          });
        }}
      />
    </View>
  );
}

function BotaoQuadrado({
  icone,
  rotulo,
  onPress,
}: {
  icone: 'layers' | 'locate';
  rotulo: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [estilos.botaoQuadrado, pressed && estilos.pressionado]}>
      <AppIcon name={icone} size={24} color={CoresTexto.escuro} />
    </Pressable>
  );
}

/** Voltar + busca "Cidade, endereço ou coordenada", com a lista de resultados. */
function BarraBusca({
  topo,
  onVoltar,
  onEscolher,
  controles,
}: {
  topo: number;
  onVoltar: () => void;
  onEscolher: (resultado: ResultadoBusca) => void;
  controles: React.ReactNode;
}) {
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusca[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const buscaAtual = useRef(0);

  const buscar = async () => {
    const termo = texto.trim();
    if (!termo) return;
    const id = ++buscaAtual.current;
    setBuscando(true);
    setErro(null);
    try {
      const encontrados = await buscarLocais(termo);
      if (id !== buscaAtual.current) return;
      if (encontrados.length === 1) {
        escolher(encontrados[0]);
      } else {
        setResultados(encontrados);
        if (encontrados.length === 0) setErro('Nenhum lugar encontrado. Tente outro nome.');
      }
    } catch {
      if (id === buscaAtual.current) {
        setErro('Sem conexão para buscar. Digite a coordenada (ex.: -15.78, -47.93).');
      }
    } finally {
      if (id === buscaAtual.current) setBuscando(false);
    }
  };

  const escolher = (resultado: ResultadoBusca) => {
    Keyboard.dismiss();
    setResultados(null);
    setErro(null);
    onEscolher(resultado);
  };

  const listaAberta = (resultados !== null && resultados.length > 0) || erro !== null;

  return (
    <View style={[estilos.topo, { top: topo }]} pointerEvents="box-none">
      <View style={estilos.linhaBusca}>
        <Pressable
          onPress={onVoltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [estilos.botaoVoltar, pressed && estilos.pressionado]}>
          <AppIcon name="arrowLeft" size={24} color={CoresTexto.escuro} />
        </Pressable>
        <View style={estilos.busca}>
          {buscando ? (
            <ActivityIndicator size="small" color={CoresTexto.suave} />
          ) : (
            <AppIcon name="search" size={22} color={CoresTexto.suave} />
          )}
          <TextInput
            value={texto}
            onChangeText={(novo) => {
              setTexto(novo);
              if (!novo) {
                setResultados(null);
                setErro(null);
              }
            }}
            onSubmitEditing={buscar}
            placeholder="Cidade, endereço ou coordenada"
            placeholderTextColor={CoresTexto.suave}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar cidade, endereço ou coordenada"
            style={estilos.buscaTexto}
          />
        </View>
      </View>

      {listaAberta ? (
        <View style={estilos.resultados}>
          {erro ? <Text style={estilos.resultadoErro}>{erro}</Text> : null}
          {resultados?.map((r, indice) => (
            <Pressable
              key={r.id}
              onPress={() => escolher(r)}
              accessibilityRole="button"
              style={({ pressed }) => [
                estilos.resultado,
                indice > 0 && estilos.resultadoDivisor,
                pressed && estilos.pressionado,
              ]}>
              <AppIcon name="mapPin" size={20} color={AgroColors.forest} />
              <View style={estilos.resultadoTextos}>
                <Text style={estilos.resultadoNome} numberOfLines={1}>
                  {r.nome}
                </Text>
                {r.detalhe ? (
                  <Text style={estilos.resultadoDetalhe} numberOfLines={1}>
                    {r.detalhe}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        controles
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: AgroColors.mapTerrainBg },
  carregando: { alignItems: 'center', justifyContent: 'center' },
  pressionado: { opacity: 0.8 },

  miraCamada: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mira: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: AgroColors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  miraPonto: { width: 6, height: 6, borderRadius: 3, backgroundColor: AgroColors.textInverse },

  topo: { position: 'absolute', left: MARGEM, right: MARGEM, gap: Spacing.three },
  linhaBusca: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  botaoVoltar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AgroColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  busca: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: AgroColors.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  buscaTexto: { flex: 1, fontSize: 16, color: CoresTexto.escuro, paddingVertical: 0 },
  controles: { alignSelf: 'flex-end', gap: Spacing.two },
  botaoQuadrado: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  resultados: {
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
  },
  resultadoDivisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  resultadoTextos: { flex: 1, gap: 1 },
  resultadoNome: { fontSize: 15, fontWeight: '700', color: CoresTexto.escuro },
  resultadoDetalhe: { fontSize: 13, color: CoresTexto.suave },
  resultadoErro: {
    fontSize: 14,
    lineHeight: 20,
    color: CoresTexto.suave,
    padding: Spacing.three,
  },

  cartaoTopo: {
    position: 'absolute',
    left: MARGEM,
    right: MARGEM,
    minHeight: 60,
    borderRadius: 20,
    backgroundColor: AgroColors.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.sm,
    gap: Spacing.three,
    ...Shadows.md,
  },
  fecharDesenho: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  cartaoTopoTextos: { flex: 1 },
  cartaoTopoTitulo: { fontSize: 18, lineHeight: 23, fontWeight: '700', color: CoresTexto.escuro },
  cartaoTopoSub: { fontSize: 14.5, lineHeight: 19, color: CoresTexto.suave },
  textoErro: { color: AgroColors.danger, fontWeight: '600' },

  rodape: {
    position: 'absolute',
    left: MARGEM,
    right: MARGEM,
    alignItems: 'center',
  },
  cartaoRodape: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: 20,
    backgroundColor: AgroColors.cardBg,
    padding: Spacing.three,
    gap: Spacing.two,
    ...Shadows.md,
  },
  cartaoTitulo: {
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: CoresTexto.escuro,
  },
  cartaoTexto: { fontSize: 15, lineHeight: 21, color: CoresTexto.suave },
  botaoPrincipal: { marginTop: Spacing.two },
  confirmacao: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  confirmacaoTexto: { fontSize: 15, fontWeight: '700', color: AgroColors.forest },
  cabecalhoTalhao: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pontoCor: { width: 14, height: 14, borderRadius: 7 },
  fecharTalhao: { marginLeft: 'auto', padding: 4 },

  explicacao: {
    fontSize: 14,
    lineHeight: 19,
    color: CoresTexto.suave,
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  medidas: { flexDirection: 'row', paddingVertical: Spacing.two },
  medida: { flex: 1, gap: 4 },
  medidaRotulo: { fontSize: 14, fontWeight: '600', color: CoresTexto.suave },
  medidaValor: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: CoresTexto.escuro },
  acoes: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.two },
  acao: { flex: 1 },
});
