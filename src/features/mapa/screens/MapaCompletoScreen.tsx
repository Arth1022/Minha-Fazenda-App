import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';

import { AppIcon, ConfirmacaoSheet, type ItemConfirmacao } from '@/components/ui';
import { AgroColors, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, useLiveQuery, type Talhao } from '@/database';
import {
  contarPontosAbertos,
  criarMarcador,
  listarMarcadoresAtivos,
  resolverMarcador,
} from '@/services/marcadorService';
import { ocupacaoDasAreas, TABELAS_OCUPACAO } from '@/services/movimentacaoService';
import {
  atualizarTalhao,
  criarTalhao,
  deletarTalhao,
  listarTalhoesAtivos,
} from '@/services/talhaoService';
import { podeEditarGeometria } from '@/services/usuario';
import { calcularPerimetroKm, calcularPerimetroM, type Coordenada } from '@/utils/geoMath';
import { BarraBuscaMapa, BotaoQuadrado, type AnimalBuscado } from '../components/BarraBuscaMapa';
import { CamadaDesenho } from '../components/CamadaDesenho';
import { CamadaDivisaFazenda } from '../components/CamadaDivisaFazenda';
import {
  CamadaMarcadoresMapa,
  COR_POR_TIPO_MARCADOR,
  ROTULO_TIPO_MARCADOR,
} from '../components/CamadaMarcadoresMapa';
import { CamadasSheet } from '../components/CamadasSheet';
import { CamadaTalhoesSalvos } from '../components/CamadaTalhoesSalvos';
import { BotaoMapa, CoresTexto } from '../components/elementos';
import { MapaBase, type MapaBaseHandle, type VistaMapa } from '../components/MapaBase';
import { OpcoesAreaSheet } from '../components/OpcoesAreaSheet';
import { PainelArea } from '../components/PainelArea';
import { SafraLavouraSheet, type DadosSafra } from '../components/SafraLavouraSheet';
import { SalvarAreaSheet, type DadosSalvarArea } from '../components/SalvarAreaSheet';
import { SalvarFazendaSheet } from '../components/SalvarFazendaSheet';
import { SalvarMarcadorSheet, type DadosSalvarMarcador } from '../components/SalvarMarcadorSheet';
import { lerCamadas, salvarCamadas, type CamadasMapa } from '../data/camadasMapa';
import {
  obterFazendaMapa,
  pontosForaDaFazenda,
  salvarFazendaMapa,
  useFazendaMapa,
} from '../data/fazendaMapa';
import { useDesenhoTalhao, type ResultadoDesenhoTalhao } from '../hooks/useDesenhoTalhao';
import {
  bloqueioExclusao,
  consequenciasExclusao,
  consequenciasRedesenho,
  perimetroDaAreaM,
  type OpcaoArea,
} from '../services/areas';
import { formatarDistancia, formatarHectares } from '../services/calculos';
import { identificacaoAnimal, mapaDeOcupacao, type LinhaOcupacao } from '../services/ocupacao';
import { vistaDaFazenda } from '../services/vista';

const ZOOM_BUSCA = 15;
const MARGEM = 12;
/** Espaço livre entre a área enquadrada e o painel / a barra de busca */
const FOLGA_PAINEL = 24;
const FOLGA_TOPO = 64;
/** Altura mínima de mapa que sobra para a área ao enquadrar acima do painel */
const MAPA_MINIMO = 140;

/** O que está sendo desenhado: a divisa, uma área nova ou o contorno de uma existente */
type AlvoDesenho =
  | { tipo: 'divisa' }
  | { tipo: 'area' }
  | { tipo: 'contorno'; talhaoId: string; nome: string };

/** "Redesenhar Pasto 1?" / "Excluir Pasto 1?" */
interface Confirmacao {
  acao: 'redesenhar' | 'excluir';
  area: Pick<Talhao, 'id' | 'nome'>;
  itens: ItemConfirmacao[];
  /** Não dá para confirmar agora (RN-011: pasto com animais) */
  bloqueio?: string | null;
}

/**
 * Mapa em tela cheia. Fluxo: achar a terra (busca, GPS, camadas) → marcar a
 * divisa da fazenda → separar a fazenda em áreas. Tocar numa área abre o painel
 * inferior com o resumo e o que dá para fazer nela, com o mapa visível atrás.
 * Desenhar, redesenhar e excluir é só do admin.
 */
export default function MapaCompletoScreen() {
  const insets = useSafeAreaInsets();
  const { height: alturaTela } = useWindowDimensions();
  const { talhao: talhaoInicialId, desenhar } = useLocalSearchParams<{
    talhao?: string;
    desenhar?: 'divisa' | 'area';
  }>();
  const { data: talhoes, updatedAt, error } = useLiveQuery(listarTalhoesAtivos());
  const { data: marcadores } = useLiveQuery(listarMarcadoresAtivos());
  // Animais em cada pasto: uma leitura do índice, refeita uma vez por movimentação gravada
  const { dados: linhasOcupacao } = useConsultaAoVivo<LinhaOcupacao[]>(
    () => ocupacaoDasAreas(),
    TABELAS_OCUPACAO,
    'ocupacao',
    [],
  );
  const ocupacoes = useMemo(() => mapaDeOcupacao(linhasOcupacao), [linhasOcupacao]);
  const carregado = updatedAt !== undefined || error !== undefined;
  const fazenda = useFazendaMapa();
  const admin = podeEditarGeometria();
  const pedidoDesenho = admin && (desenhar === 'divisa' || desenhar === 'area');

  const mapaRef = useRef<MapaBaseHandle>(null);
  const enquadradaRef = useRef<string | null>(null);
  const [vistaInicial, setVistaInicial] = useState<VistaMapa | null>(null);
  const [camadas, setCamadas] = useState<CamadasMapa>(lerCamadas);
  const [camadasVisivel, setCamadasVisivel] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(talhaoInicialId ?? null);
  const [marcadorId, setMarcadorId] = useState<string | null>(null);
  const [modoMarcador, setModoMarcador] = useState(false);
  const [talhaoMarcadorId, setTalhaoMarcadorId] = useState<string | null>(null);
  const [coordenadaMarcador, setCoordenadaMarcador] = useState<Coordenada | null>(null);
  // Atalho da tela anterior: sem divisa marcada, qualquer desenho começa por ela
  const [alvo, setAlvo] = useState<AlvoDesenho>(() =>
    desenhar === 'divisa' || (desenhar === 'area' && !obterFazendaMapa())
      ? { tipo: 'divisa' }
      : { tipo: 'area' },
  );
  const [rascunho, setRascunho] = useState<ResultadoDesenhoTalhao | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [safraId, setSafraId] = useState<string | null>(null);
  // Folhas que somem deslizando: o conteúdo fica até a próxima abertura
  const [opcoesId, setOpcoesId] = useState<string | null>(null);
  const [opcoesVisivel, setOpcoesVisivel] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  // Destino escolhido ao mover animais (tracejado branco) e o animal achado na busca, cada um
  // guardado com a área do painel: em outra área, não valem
  const [destaqueDestino, setDestaqueDestino] = useState<{ areaId: string; destinoId: string } | null>(null);
  const [animalEmDestaque, setAnimalEmDestaque] = useState<{ areaId: string; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | undefined>();

  // Área nova precisa ficar dentro da divisa (se ela já foi marcada)
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
    doQue: alvo.tipo === 'divisa' ? 'da divisa' : 'da área',
    restricao,
    comecarDesenhando: pedidoDesenho,
  });

  const comecarDesenho = useCallback(
    (novoAlvo: AlvoDesenho) => {
      setSelecionadoId(null);
      setMarcadorId(null);
      setModoMarcador(false);
      setAlvo(novoAlvo);
      limpar();
      iniciar();
    },
    [iniciar, limpar],
  );

  /** Sai do desenho sem salvar; um redesenho cancelado volta ao painel da área */
  const sairDoDesenho = useCallback(() => {
    cancelar();
    if (alvo.tipo === 'contorno') setSelecionadoId(alvo.talhaoId);
    setAlvo({ tipo: 'area' });
  }, [cancelar, alvo]);

  const sairDoModoMarcador = useCallback(() => {
    setModoMarcador(false);
    setCoordenadaMarcador(null);
    setTalhaoMarcadorId(null);
  }, []);

  // A câmera abre uma vez só, quando as áreas terminam de carregar
  if (carregado && !vistaInicial) {
    const foco = talhoes.find((t) => t.id === talhaoInicialId);
    setVistaInicial(
      foco
        ? { tipo: 'area', ne: [foco.maxLng, foco.maxLat], sw: [foco.minLng, foco.minLat] }
        : vistaDaFazenda(obterFazendaMapa(), talhoes),
    );
  }

  // Com a camada de áreas desligada, o desenho ainda mostra as vizinhas (evita sobrepor)
  const mostrarAreas = camadas.areas || modoDesenho;
  const selecionado = useMemo(
    () =>
      modoDesenho || modoMarcador || !camadas.areas
        ? null
        : (talhoes.find((t) => t.id === selecionadoId) ?? null),
    [modoDesenho, modoMarcador, camadas.areas, talhoes, selecionadoId],
  );
  const marcadorSelecionado = useMemo(
    () =>
      modoDesenho || modoMarcador || !camadas.pontos
        ? null
        : (marcadores.find((m) => m.id === marcadorId) ?? null),
    [modoDesenho, modoMarcador, camadas.pontos, marcadores, marcadorId],
  );
  const pastos = useMemo(() => talhoes.filter((t) => t.tipo === 'pasto'), [talhoes]);
  const editando = talhoes.find((t) => t.id === editandoId) ?? null;
  const areaSafra = talhoes.find((t) => t.id === safraId) ?? null;
  const areaOpcoes = talhoes.find((t) => t.id === opcoesId) ?? null;

  // Painel fechado: a próxima abertura (mesmo da mesma área) enquadra de novo
  useEffect(() => {
    if (!selecionado) enquadradaRef.current = null;
  }, [selecionado]);

  const destinoDestacado =
    selecionado && destaqueDestino?.areaId === selecionado.id ? destaqueDestino.destinoId : null;

  // Voltar do Android sai do desenho, do ponto de atenção ou fecha o painel antes de sair da tela
  useEffect(() => {
    if (!modoDesenho && !modoMarcador && !selecionado) return;
    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modoMarcador) sairDoModoMarcador();
      else if (modoDesenho) sairDoDesenho();
      else setSelecionadoId(null);
      return true;
    });
    return () => inscricao.remove();
  }, [modoDesenho, modoMarcador, selecionado, sairDoDesenho, sairDoModoMarcador]);

  // Contorno novo de uma área existente: grava direto, mantendo nome, tipo e histórico
  useEffect(() => {
    if (!rascunho || alvo.tipo !== 'contorno') return;
    const talhaoId = alvo.talhaoId;
    atualizarTalhao(talhaoId, { coordenadas: rascunho.pontos })
      .then(() => {
        limpar();
        setRascunho(null);
        setAlvo({ tipo: 'area' });
        setSelecionadoId(talhaoId);
      })
      .catch((err: unknown) => {
        setRascunho(null);
        iniciar();
        Alert.alert('Não foi possível salvar', err instanceof Error ? err.message : String(err));
      });
  }, [rascunho, alvo, limpar, iniciar]);

  const aoTocarMapa = useCallback(
    (coordenada: Coordenada) => {
      if (modoMarcador) {
        setErroSalvar(undefined);
        setCoordenadaMarcador(coordenada);
        return;
      }
      adicionarPonto(coordenada);
    },
    [modoMarcador, adicionarPonto],
  );

  const selecionarTalhao = useCallback(
    (id: string, coord?: Coordenada) => {
      if (modoMarcador) {
        setTalhaoMarcadorId(id);
        const ponto =
          coord ??
          (() => {
            const t = talhoes.find((item) => item.id === id);
            return t ? ([t.centroLng, t.centroLat] as Coordenada) : null;
          })();
        if (ponto) aoTocarMapa(ponto);
        return;
      }
      if (modoDesenho) {
        if (coord) adicionarPonto(coord);
        return;
      }
      setMarcadorId(null);
      setAnimalEmDestaque(null);
      setSelecionadoId((atual) => (atual === id ? null : id));
    },
    [modoMarcador, modoDesenho, talhoes, aoTocarMapa, adicionarPonto],
  );

  const selecionarMarcador = useCallback(
    (id: string, coord?: Coordenada) => {
      if (modoMarcador) {
        if (coord) aoTocarMapa(coord);
        return;
      }
      if (modoDesenho) return;
      setSelecionadoId(null);
      setMarcadorId((atual) => (atual === id ? null : id));
    },
    [modoMarcador, modoDesenho, aoTocarMapa],
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

  const mudarCamadas = (novas: CamadasMapa) => {
    setCamadas(novas);
    salvarCamadas(novas);
  };

  /** Área escolhida na busca: liga a camada de áreas, se preciso, e abre o painel dela */
  const escolherAreaDaBusca = (area: Talhao) => {
    if (!camadas.areas) mudarCamadas({ ...camadas, areas: true });
    setMarcadorId(null);
    setSelecionadoId(area.id);
  };

  /** Animal escolhido na busca: abre o pasto em que está (RF-027); sem local, abre a ficha dele */
  const escolherAnimalDaBusca = (animal: AnimalBuscado) => {
    if (!animal.areaId) {
      router.push({ pathname: '/animal/[id]', params: { id: animal.id } });
      return;
    }
    setAnimalEmDestaque({ areaId: animal.areaId, texto: identificacaoAnimal(animal) });
    if (!camadas.areas) mudarCamadas({ ...camadas, areas: true });
    setMarcadorId(null);
    setSelecionadoId(animal.areaId);
  };

  const topo = insets.top + MARGEM;
  const base = insets.bottom + MARGEM;

  /** Mostra a área escolhida inteira no pedaço de mapa acima do painel */
  const enquadrarSelecionada = (alturaPainel: number) => {
    if (!selecionado) return;
    const { id, minLat, maxLat, minLng, maxLng } = selecionado;
    const chave = `${id}:${minLat}:${maxLat}:${minLng}:${maxLng}`;
    if (enquadradaRef.current === chave) return;
    enquadradaRef.current = chave;
    const cima = topo + FOLGA_TOPO;
    const baixo = Math.min(alturaPainel + FOLGA_PAINEL, alturaTela - cima - MAPA_MINIMO);
    mapaRef.current?.enquadrar([maxLng, maxLat], [minLng, minLat], {
      top: cima,
      bottom: Math.max(baixo, FOLGA_PAINEL),
      left: 40,
      right: 40,
    });
  };

  const abrirConfirmacao = (nova: Confirmacao) => {
    setConfirmacao(nova);
    setConfirmando(true);
  };

  const escolherOpcao = async (opcao: OpcaoArea) => {
    const area = areaOpcoes;
    setOpcoesVisivel(false);
    if (!area) return;
    setErroSalvar(undefined);
    switch (opcao) {
      case 'editar':
        setEditandoId(area.id);
        break;
      case 'pontoAtencao':
        setTalhaoMarcadorId(area.id);
        setModoMarcador(true);
        break;
      case 'redesenhar':
        abrirConfirmacao({
          acao: 'redesenhar',
          area,
          itens: consequenciasRedesenho(ocupacoes.get(area.id)?.cabecas ?? 0),
        });
        break;
      case 'excluir': {
        const pontosAbertos = await contarPontosAbertos(area.id).catch(() => 0);
        abrirConfirmacao({
          acao: 'excluir',
          area,
          itens: consequenciasExclusao(pontosAbertos),
          bloqueio: bloqueioExclusao(ocupacoes.get(area.id)?.cabecas ?? 0),
        });
        break;
      }
    }
  };

  const confirmar = () => {
    if (!confirmacao) return;
    const { acao, area } = confirmacao;
    setConfirmando(false);
    if (acao === 'redesenhar') {
      comecarDesenho({ tipo: 'contorno', talhaoId: area.id, nome: area.nome });
      return;
    }
    setSelecionadoId(null);
    deletarTalhao(area.id).catch((err: unknown) =>
      Alert.alert('Não foi possível excluir', err instanceof Error ? err.message : String(err)),
    );
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
      setAlvo({ tipo: 'area' });
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : 'Não foi possível salvar a fazenda.');
    }
  };

  /** Envolve um salvamento: liga o "salvando", guarda o erro para a folha mostrar */
  const comSalvando = async (acao: () => Promise<void>, erroPadrao: string) => {
    try {
      setSalvando(true);
      setErroSalvar(undefined);
      await acao();
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : erroPadrao);
    } finally {
      setSalvando(false);
    }
  };

  const salvarAreaNova = ({ nome, tipo }: DadosSalvarArea) => {
    if (!rascunho) return;
    comSalvando(async () => {
      const nova = await criarTalhao({ nome, tipo, coordenadas: rascunho.pontos });
      limpar();
      setRascunho(null);
      setSelecionadoId(nova.id);
    }, 'Não foi possível salvar a área.');
  };

  const salvarEdicao = ({ nome, tipo }: DadosSalvarArea) => {
    if (!editando) return;
    comSalvando(async () => {
      await atualizarTalhao(editando.id, { nome, tipo });
      setEditandoId(null);
    }, 'Não foi possível salvar a área.');
  };

  const salvarSafra = (safra: DadosSafra) => {
    if (!areaSafra) return;
    comSalvando(async () => {
      await atualizarTalhao(areaSafra.id, safra);
      setSafraId(null);
    }, 'Não foi possível salvar a safra.');
  };

  const salvarMarcadorNovo = ({ tipo, titulo, descricao }: DadosSalvarMarcador) => {
    if (!coordenadaMarcador) return;
    comSalvando(async () => {
      const novo = await criarMarcador({
        talhaoId: talhaoMarcadorId ?? undefined,
        tipo,
        titulo,
        descricao,
        lng: coordenadaMarcador[0],
        lat: coordenadaMarcador[1],
      });
      sairDoModoMarcador();
      setSelecionadoId(null);
      setMarcadorId(novo.id);
    }, 'Não foi possível salvar o ponto.');
  };

  const desenhandoDivisa = alvo.tipo === 'divisa';
  const rascunhoDoQue = rascunho && alvo.tipo !== 'contorno' ? alvo.tipo : null;
  const mostrarNovaArea =
    admin && fazenda !== null && !modoDesenho && !modoMarcador && !selecionado && !marcadorSelecionado;

  return (
    <View style={estilos.raiz}>
      <StatusBar style="light" />

      {vistaInicial ? (
        <MapaBase
          ref={mapaRef}
          vistaInicial={vistaInicial}
          estilo={camadas.estilo}
          centralizarNoGpsAoAbrir={!fazenda && talhoes.length === 0}
          folga={{ top: topo + 140, bottom: base + 240, left: 40, right: 40 }}
          onMapPress={aoTocarMapa}
          style={StyleSheet.absoluteFill}>
          {fazenda && !(modoDesenho && desenhandoDivisa) ? (
            <CamadaDivisaFazenda divisa={fazenda.divisa} />
          ) : null}
          {mostrarAreas ? (
            <CamadaTalhoesSalvos
              talhoes={talhoes}
              ocupacoes={ocupacoes}
              selecionadoId={selecionado?.id ?? null}
              destacadoId={destinoDestacado}
              // Rótulo em cima do mapa atrapalharia o toque nos cantos e no ponto de atenção
              mostrarNomes={!modoDesenho && !modoMarcador}
              mostrarRebanho={camadas.rebanho}
              onPressTalhao={selecionarTalhao}
            />
          ) : null}
          {camadas.pontos ? (
            <CamadaMarcadoresMapa
              marcadores={marcadores}
              selecionadoId={marcadorSelecionado?.id ?? null}
              onPressMarcador={selecionarMarcador}
            />
          ) : null}
          <CamadaDesenho pontos={pontos} erroTopologico={erroTopologico} />
        </MapaBase>
      ) : (
        <View style={[StyleSheet.absoluteFill, estilos.carregando]}>
          <ActivityIndicator color={AgroColors.textInverse} />
        </View>
      )}

      {/* Mira no centro do mapa enquanto procura a terra */}
      {!modoDesenho && !modoMarcador && !fazenda ? (
        <View style={estilos.miraCamada} pointerEvents="none">
          <View style={estilos.mira}>
            <View style={estilos.miraPonto} />
          </View>
        </View>
      ) : null}

      {modoDesenho || modoMarcador ? (
        <View style={[estilos.cartaoTopo, { top: topo }]}>
          <Pressable
            onPress={modoMarcador ? sairDoModoMarcador : sairDoDesenho}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            style={({ pressed }) => [estilos.fecharDesenho, pressed && estilos.pressionado]}>
            <AppIcon name="x" size={24} color={CoresTexto.escuro} />
          </Pressable>
          <View style={estilos.cartaoTopoTextos}>
            <Text style={estilos.cartaoTopoTitulo} numberOfLines={1}>
              {modoMarcador
                ? 'Ponto de atenção'
                : desenhandoDivisa
                  ? 'Divisa da fazenda'
                  : alvo.tipo === 'contorno'
                    ? `Redesenhar ${alvo.nome}`
                    : 'Nova área'}
            </Text>
            <Text
              style={[estilos.cartaoTopoSub, erroTopologico ? estilos.textoErro : null]}
              numberOfLines={2}>
              {modoMarcador
                ? 'Toque no satélite onde está a praga, planta daninha ou erosão'
                : (erroTopologico ??
                  (pontos.length === 0
                    ? 'Toque no mapa no primeiro canto'
                    : podeConcluir
                      ? 'Feche o contorno e toque em Concluir'
                      : 'Continue tocando nos cantos'))}
            </Text>
          </View>
        </View>
      ) : (
        <BarraBuscaMapa
          topo={topo}
          onVoltar={() => router.back()}
          modo={
            fazenda
              ? {
                  tipo: 'areas',
                  areas: talhoes,
                  ocupacoes,
                  onEscolher: escolherAreaDaBusca,
                  onEscolherAnimal: escolherAnimalDaBusca,
                }
              : { tipo: 'locais', onEscolher: (r) => mapaRef.current?.voarPara(r.coordenada, ZOOM_BUSCA) }
          }
          controles={
            <View style={estilos.controles}>
              <BotaoQuadrado
                icone="layers"
                rotulo="Camadas do mapa"
                onPress={() => setCamadasVisivel(true)}
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

      {selecionado ? (
        <PainelArea
          // Remonta ao trocar de área: o onLayout dispara de novo e a câmera reenquadra
          key={selecionado.id}
          area={selecionado}
          ocupacao={ocupacoes.get(selecionado.id)}
          pastos={pastos}
          ocupacoes={ocupacoes}
          destaque={animalEmDestaque?.areaId === selecionado.id ? animalEmDestaque.texto : null}
          onDestaque={(destinoId) =>
            setDestaqueDestino(destinoId ? { areaId: selecionado.id, destinoId } : null)
          }
          onOpcoes={() => {
            setOpcoesId(selecionado.id);
            setOpcoesVisivel(true);
          }}
          onFechar={() => {
            setSelecionadoId(null);
            setAnimalEmDestaque(null);
          }}
          onSafra={() => setSafraId(selecionado.id)}
          onAltura={enquadrarSelecionada}
        />
      ) : mostrarNovaArea ? (
        <View style={[estilos.rodapeNovaArea, { bottom: base + Spacing.two }]} pointerEvents="box-none">
          <Pressable
            onPress={() => comecarDesenho({ tipo: 'area' })}
            accessibilityRole="button"
            accessibilityLabel="Desenhar nova área"
            style={({ pressed }) => [estilos.novaArea, pressed && estilos.pressionado]}>
            <AppIcon name="plus" size={22} color={AgroColors.textInverse} />
            <Text style={estilos.novaAreaTexto}>Nova área</Text>
          </Pressable>
        </View>
      ) : modoMarcador || modoDesenho || marcadorSelecionado || !fazenda ? (
        <View style={[estilos.rodape, { bottom: base }]} pointerEvents="box-none">
          <View style={estilos.cartaoRodape}>
            {modoMarcador ? (
              <>
                <Text style={estilos.cartaoTexto}>
                  Toque no ponto exato do campo para registrar uma ocorrência georreferenciada.
                </Text>
                <BotaoMapa rotulo="Cancelar" variante="contorno" onPress={sairDoModoMarcador} />
              </>
            ) : modoDesenho ? (
              <>
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
                    icone="check"
                    desabilitado={!podeConcluir}
                    onPress={concluir}
                    style={estilos.acao}
                  />
                </View>
              </>
            ) : marcadorSelecionado ? (
              <>
                <View style={estilos.cabecalhoMarcador}>
                  <View
                    style={[
                      estilos.pontoCor,
                      { backgroundColor: COR_POR_TIPO_MARCADOR[marcadorSelecionado.tipo] },
                    ]}
                  />
                  <Text style={estilos.cartaoTitulo} numberOfLines={1}>
                    {marcadorSelecionado.titulo}
                  </Text>
                  <Pressable
                    onPress={() => setMarcadorId(null)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar ponto de atenção"
                    style={estilos.fecharMarcador}>
                    <AppIcon name="x" size={20} color={CoresTexto.suave} />
                  </Pressable>
                </View>
                <Text style={estilos.cartaoTexto}>
                  {ROTULO_TIPO_MARCADOR[marcadorSelecionado.tipo]}
                  {marcadorSelecionado.descricao ? ` · ${marcadorSelecionado.descricao}` : ''}
                </Text>
                <BotaoMapa
                  rotulo="Marcar como resolvido"
                  icone="check"
                  onPress={async () => {
                    const id = marcadorSelecionado.id;
                    setMarcadorId(null);
                    await resolverMarcador(id);
                  }}
                  style={estilos.botaoPrincipal}
                />
              </>
            ) : (
              <>
                <Text style={estilos.cartaoTitulo}>Encontre a sua terra</Text>
                <Text style={estilos.cartaoTexto}>
                  {admin
                    ? 'Arraste o mapa com um dedo e aproxime com dois. Ou busque pela cidade ou coordenada. Depois marque a divisa da fazenda.'
                    : 'A divisa da fazenda ainda não foi marcada. Peça ao dono da fazenda para marcar.'}
                </Text>
                {admin ? (
                  <BotaoMapa
                    rotulo="Marcar a divisa aqui"
                    icone="pentagon"
                    onPress={() => comecarDesenho({ tipo: 'divisa' })}
                    style={estilos.botaoPrincipal}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      ) : null}

      <SalvarFazendaSheet
        visible={rascunhoDoQue === 'divisa'}
        nomeAtual={fazenda?.nome}
        areaHa={rascunho?.areaHectares ?? 0}
        perimetroKm={rascunho ? calcularPerimetroKm(rascunho.pontos) : 0}
        erro={erroSalvar}
        onSalvar={salvarFazenda}
        onClose={voltarAoDesenho}
      />

      <SalvarAreaSheet
        visible={rascunhoDoQue === 'area'}
        areaHa={rascunho?.areaHectares ?? 0}
        perimetroM={rascunho ? calcularPerimetroM(rascunho.pontos) : 0}
        salvando={salvando}
        erro={erroSalvar}
        onSalvar={salvarAreaNova}
        onClose={voltarAoDesenho}
      />

      <SalvarAreaSheet
        visible={editando !== null}
        area={editando}
        cabecas={editando ? (ocupacoes.get(editando.id)?.cabecas ?? 0) : 0}
        areaHa={editando?.areaHectares ?? 0}
        perimetroM={editando ? perimetroDaAreaM(editando) : 0}
        salvando={salvando}
        erro={erroSalvar}
        onSalvar={salvarEdicao}
        onClose={() => setEditandoId(null)}
      />

      <SafraLavouraSheet
        visible={areaSafra !== null}
        area={areaSafra}
        salvando={salvando}
        onSalvar={salvarSafra}
        onClose={() => setSafraId(null)}
      />

      <OpcoesAreaSheet
        visible={opcoesVisivel && areaOpcoes !== null}
        area={areaOpcoes}
        podeEditarGeometria={admin}
        onClose={() => setOpcoesVisivel(false)}
        onSelect={escolherOpcao}
      />

      <ConfirmacaoSheet
        visible={confirmando}
        titulo={
          confirmacao
            ? `${confirmacao.acao === 'redesenhar' ? 'Redesenhar' : 'Excluir'} ${confirmacao.area.nome}?`
            : ''
        }
        itens={confirmacao?.itens ?? []}
        confirmar={confirmacao?.acao === 'excluir' ? 'Excluir' : 'Redesenhar'}
        perigo={confirmacao?.acao === 'excluir'}
        bloqueio={confirmacao?.bloqueio ?? null}
        onConfirmar={confirmar}
        onClose={() => setConfirmando(false)}
      />

      <SalvarMarcadorSheet
        visible={coordenadaMarcador !== null}
        salvando={salvando}
        erro={erroSalvar}
        onSalvar={salvarMarcadorNovo}
        onClose={() => {
          setCoordenadaMarcador(null);
          setTalhaoMarcadorId(null);
        }}
      />

      <CamadasSheet
        visible={camadasVisivel}
        camadas={camadas}
        onChange={mudarCamadas}
        onClose={() => setCamadasVisivel(false)}
        onRedesenharDivisa={
          admin && fazenda
            ? () => {
                setCamadasVisivel(false);
                comecarDesenho({ tipo: 'divisa' });
              }
            : undefined
        }
      />
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

  controles: { alignSelf: 'flex-end', gap: Spacing.two },

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

  rodapeNovaArea: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  novaArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 56,
    paddingHorizontal: Spacing.four,
    borderRadius: 28,
    backgroundColor: AgroColors.forest,
    ...Shadows.fab,
  },
  novaAreaTexto: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: AgroColors.textInverse },

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
  cabecalhoMarcador: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pontoCor: { width: 14, height: 14, borderRadius: 7 },
  fecharMarcador: { marginLeft: 'auto', padding: 4 },

  medidas: { flexDirection: 'row', paddingVertical: Spacing.xs },
  medida: { flex: 1, gap: 4 },
  medidaRotulo: { fontSize: 14, fontWeight: '600', color: CoresTexto.suave },
  medidaValor: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: CoresTexto.escuro },
  acoes: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.two },
  acao: { flex: 1 },
});
