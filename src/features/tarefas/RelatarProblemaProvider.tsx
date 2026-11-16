import { router } from 'expo-router';
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { useLiveQuery, type CategoriaTarefa } from '@/database';
import { listarMaquinas } from '@/features/maquinas/data/maquinas';
import { listarAnimais } from '@/features/rebanho/data/animais';
import { apagarAudio } from '@/services/audio';
import { ROTA_TAREFAS } from '@/services/cicloService';
import { escolherFoto, guardarFoto, type OrigemFoto } from '@/services/fotos';
import {
  criarOcorrencia,
  gerarTituloOcorrencia,
  identificarAreaNoPonto,
  LIMITE_FOTOS_OCORRENCIA,
  registrarProblemaMaquina,
} from '@/services/ocorrenciaService';
import { listarTalhoesAtivos } from '@/services/talhaoService';
import { useUsuarioAtual } from '@/services/usuario';
import { useGravacaoVoz } from './NotaVozField';
import { CabecalhoDetalhes, EtapaDetalhes, type OrigemLocal } from './relato/EtapaDetalhes';
import { EtapaCategoria } from './relato/EtapaCategoria';
import { EtapaLista, type ItemLista } from './relato/EtapaLista';
import { EtapaRegistrada, type ResumoRegistro } from './relato/EtapaRegistrada';
import { CabecalhoSimples } from './relato/partes';

/** O que já vem escolhido ao abrir o relato (ex.: pela ficha do animal, pela área no mapa ou pelo QR). */
export interface PedidoRelato {
  areaId?: string;
  animalId?: string;
  maquinaId?: string;
  /** O animal ou a máquina veio da leitura do QR Code */
  viaQr?: boolean;
}

type AbrirRelato = (pedido?: PedidoRelato) => void;

const RelatarProblemaContext = createContext<AbrirRelato | null>(null);

/** Tempo da animação de saída da folha antes de desmontar o formulário */
const DURACAO_FECHAR_MS = 350;

/**
 * Relato de problema ("Tarefas e ocorrências") disponível em qualquer aba. O
 * formulário (e as consultas de áreas, animais e máquinas) só fica montado
 * enquanto a folha está aberta, para não manter consultas ao vivo no banco à toa.
 */
export function RelatarProblemaProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<(PedidoRelato & { chave: number }) | null>(null);
  const [visivel, setVisivel] = useState(false);
  const timerFechar = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abrir = useCallback<AbrirRelato>((novo) => {
    if (timerFechar.current) clearTimeout(timerFechar.current);
    setPedido({ ...novo, chave: Date.now() });
    setVisivel(true);
  }, []);

  const fechar = useCallback(() => {
    setVisivel(false);
    timerFechar.current = setTimeout(() => setPedido(null), DURACAO_FECHAR_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerFechar.current) clearTimeout(timerFechar.current);
    },
    []
  );

  return (
    <RelatarProblemaContext.Provider value={abrir}>
      {children}
      {pedido ? (
        <FormularioRelato key={pedido.chave} pedido={pedido} visivel={visivel} onFechar={fechar} />
      ) : null}
    </RelatarProblemaContext.Provider>
  );
}

/** Abre o relato de problema, opcionalmente já com área, animal ou máquina. */
export function useRelatarProblema(): AbrirRelato {
  const abrir = useContext(RelatarProblemaContext);
  if (!abrir) throw new Error('useRelatarProblema precisa estar dentro de RelatarProblemaProvider');
  return abrir;
}

/** "Teste · 23232" (linha do animal) */
function rotuloAnimal(a: { nome: string | null; brinco: string }) {
  const brinco = a.brinco.replace(/^#/, '');
  return a.nome ? `${a.nome} · ${brinco}` : `Brinco ${brinco}`;
}

/** "Teste 23232" (título da ocorrência) */
function rotuloAnimalTitulo(a: { nome: string | null; brinco: string }) {
  const brinco = a.brinco.replace(/^#/, '');
  return a.nome ? `${a.nome} ${brinco}` : `Brinco ${brinco}`;
}

type Etapa =
  | { tipo: 'categoria' }
  | { tipo: 'detalhes' }
  | { tipo: 'lista'; de: 'area' | 'animal' | 'maquina' }
  | { tipo: 'registrada'; resumo: ResumoRegistro };

interface FormularioRelatoProps {
  pedido: PedidoRelato;
  visivel: boolean;
  onFechar: () => void;
}

/**
 * Relato em fases, como no protótipo: "O que aconteceu?" → detalhes da
 * ocorrência (foto, descrição/voz, vínculo, urgente, local) → registrada.
 */
function FormularioRelato({ pedido, visivel, onFechar }: FormularioRelatoProps) {
  const eu = useUsuarioAtual();
  const { data: talhoes } = useLiveQuery(listarTalhoesAtivos());
  const { data: animaisAtivos } = useLiveQuery(listarAnimais());
  const { data: frota } = useLiveQuery(listarMaquinas());

  const categoriaInicial: CategoriaTarefa | null = pedido.maquinaId ? 'maquina' : pedido.animalId ? 'animal' : null;
  const [etapa, setEtapa] = useState<Etapa>(categoriaInicial ? { tipo: 'detalhes' } : { tipo: 'categoria' });
  const [categoria, setCategoria] = useState<CategoriaTarefa>(categoriaInicial ?? 'cerca');
  const [animalId, setAnimalId] = useState<string | null>(pedido.animalId ?? null);
  const [maquinaId, setMaquinaId] = useState<string | null>(pedido.maquinaId ?? null);
  const [vinculoViaQr, setVinculoViaQr] = useState(Boolean(pedido.viaQr));
  const [areaId, setAreaId] = useState<string | null>(pedido.areaId ?? null);
  const [origemLocal, setOrigemLocal] = useState<OrigemLocal>(pedido.areaId ? 'escolhida' : 'buscando');
  const [pontoGps, setPontoGps] = useState<{ lat: number; lng: number } | null>(null);
  /** Título digitado pela pessoa; enquanto for null, vale o título sugerido */
  const [tituloManual, setTituloManual] = useState<string | null>(null);
  const [urgente, setUrgente] = useState(false);
  const [maquinaParada, setMaquinaParada] = useState(true);
  const [descricao, setDescricao] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const gravacao = useGravacaoVoz(setAudioUri);
  const montado = useRef(true);
  /** A pessoa escolheu o local na mão: a resposta do GPS não sobrescreve */
  const localAjustado = useRef(Boolean(pedido.areaId));

  const area = areaId ? talhoes.find((t) => t.id === areaId) : undefined;
  const animal = animalId ? animaisAtivos.find((a) => a.id === animalId) : undefined;
  const maquina = maquinaId ? frota.find((m) => m.id === maquinaId) : undefined;

  // Sem área escolhida de antemão, tenta o GPS para marcar o ponto e achar a área
  useEffect(() => {
    montado.current = true;
    if (pedido.areaId) {
      return () => {
        montado.current = false;
      };
    }
    void (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          if (montado.current && !localAjustado.current) setOrigemLocal('semGps');
          return;
        }
        const pos =
          (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!montado.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        setPontoGps((atual) => atual ?? { lat, lng });
        const achada = await identificarAreaNoPonto(lat, lng);
        if (!montado.current || localAjustado.current) return;
        if (achada) setAreaId(achada.id);
        setOrigemLocal(achada ? 'gps' : 'foraDasAreas');
      } catch {
        // Sem sinal de GPS: o relato segue normalmente sem coordenada
        if (montado.current && !localAjustado.current) setOrigemLocal('semGps');
      }
    })();
    return () => {
      montado.current = false;
    };
  }, [pedido.areaId]);

  const nomeVinculo = useMemo(() => {
    if (categoria === 'animal' && animal) return rotuloAnimalTitulo(animal);
    if (categoria === 'maquina' && maquina) return maquina.nome;
    return area?.nome ?? null;
  }, [categoria, animal, maquina, area?.nome]);

  const titulo = tituloManual?.trim() || gerarTituloOcorrencia(categoria, nomeVinculo);

  const escolherCategoria = (nova: CategoriaTarefa) => {
    setCategoria(nova);
    setTituloManual(null);
    setEtapa({ tipo: 'detalhes' });
  };

  const adicionarFoto = () => {
    const escolher = async (origem: OrigemFoto) => {
      try {
        const uri = await escolherFoto(origem);
        if (uri) setFotos((atuais) => [...atuais, uri].slice(0, LIMITE_FOTOS_OCORRENCIA));
      } catch (erro) {
        Alert.alert('Foto', erro instanceof Error ? erro.message : 'Não foi possível obter a foto.');
      }
    };
    Alert.alert('Foto', undefined, [
      { text: 'Tirar foto', onPress: () => void escolher('camera') },
      { text: 'Da galeria', onPress: () => void escolher('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const itensLista = (de: 'area' | 'animal' | 'maquina'): ItemLista[] => {
    if (de === 'area') {
      return [
        { id: null, titulo: 'Sem área', subtitulo: 'Fica só o ponto do GPS' },
        ...talhoes.map((t) => ({ id: t.id, titulo: t.nome })),
      ];
    }
    if (de === 'animal') {
      return [
        { id: null, titulo: 'Sem animal específico' },
        ...animaisAtivos.map((a) => ({ id: a.id, titulo: rotuloAnimal(a) })),
      ];
    }
    return [
      { id: null, titulo: 'Sem máquina específica' },
      ...frota.filter((m) => m.status !== 'inativa').map((m) => ({ id: m.id, titulo: m.nome, subtitulo: m.codigo })),
    ];
  };

  const escolherDaLista = (de: 'area' | 'animal' | 'maquina', id: string | null) => {
    if (de === 'area') {
      localAjustado.current = true;
      setAreaId(id);
      setOrigemLocal('escolhida');
      const escolhida = id ? talhoes.find((t) => t.id === id) : undefined;
      if (escolhida) setPontoGps({ lat: escolhida.centroLat, lng: escolhida.centroLng });
    } else if (de === 'animal') {
      setAnimalId(id);
      setVinculoViaQr(false);
    } else {
      setMaquinaId(id);
      setVinculoViaQr(false);
    }
    setEtapa({ tipo: 'detalhes' });
  };

  const enviar = async () => {
    if (gravacao.gravando) await gravacao.parar();
    setSalvando(true);
    try {
      const fotosGuardadas = (await Promise.all(fotos.map((uri) => guardarFoto(uri)))).filter(
        (u): u is string => Boolean(u)
      );
      const ponto = { lat: pontoGps?.lat ?? null, lng: pontoGps?.lng ?? null };

      if (categoria === 'maquina' && maquina) {
        // Vira também um registro da máquina (parada ou não), como pela tela de Máquinas
        const fotoMaquina = fotos[0] ? await guardarFoto(fotos[0]) : null;
        await registrarProblemaMaquina({
          maquinaId: maquina.id,
          categoria: 'outro',
          podeUsar: !maquinaParada,
          titulo,
          descricao,
          urgente,
          fotoUri: fotoMaquina,
          fotosTarefa: fotosGuardadas,
          audioUri,
          lat: ponto.lat,
          lng: ponto.lng,
          autor: eu,
        });
      } else {
        await criarOcorrencia({
          titulo,
          categoria,
          urgente,
          descricao,
          responsavelId: null,
          areaId,
          animalId: categoria === 'animal' ? animalId : null,
          audioUri,
          // Sem GPS, o serviço marca o centro da área escolhida
          pontoLat: ponto.lat,
          pontoLng: ponto.lng,
          fotos: fotosGuardadas,
          autor: eu,
        });
      }
      setEtapa({ tipo: 'registrada', resumo: { titulo, urgente, local: area?.nome ?? null } });
    } catch (erro) {
      Alert.alert('Erro ao enviar', erro instanceof Error ? erro.message : 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const verTarefa = () => {
    onFechar();
    router.push(ROTA_TAREFAS);
  };

  let cabecalho: React.ReactNode | undefined;
  let conteudo: React.ReactNode;
  switch (etapa.tipo) {
    case 'categoria':
      cabecalho = undefined;
      conteudo = <EtapaCategoria onEscolher={escolherCategoria} />;
      break;
    case 'detalhes':
      cabecalho = (
        <CabecalhoDetalhes
          categoria={categoria}
          titulo={titulo}
          tituloEditado={tituloManual}
          onEditarTitulo={setTituloManual}
          onVoltar={() => setEtapa({ tipo: 'categoria' })}
        />
      );
      conteudo = (
        <EtapaDetalhes
          categoria={categoria}
          fotos={fotos}
          onAdicionarFoto={adicionarFoto}
          onRemoverFoto={(i) => setFotos((atuais) => atuais.filter((_, idx) => idx !== i))}
          descricao={descricao}
          onDescricao={setDescricao}
          gravacao={gravacao}
          audioUri={audioUri}
          onExcluirAudio={() => {
            apagarAudio(audioUri);
            setAudioUri(null);
          }}
          vinculo={
            categoria === 'animal'
              ? { tipo: 'animal', nome: animal ? rotuloAnimal(animal) : null, viaQr: vinculoViaQr }
              : categoria === 'maquina'
                ? { tipo: 'maquina', nome: maquina?.nome ?? null, viaQr: vinculoViaQr }
                : null
          }
          onAjustarVinculo={() => setEtapa({ tipo: 'lista', de: categoria === 'animal' ? 'animal' : 'maquina' })}
          maquinaParada={maquinaParada}
          onMaquinaParada={setMaquinaParada}
          urgente={urgente}
          onUrgente={setUrgente}
          local={area?.nome ?? null}
          origemLocal={origemLocal}
          onAjustarLocal={() => setEtapa({ tipo: 'lista', de: 'area' })}
          salvando={salvando}
          onEnviar={() => void enviar()}
        />
      );
      break;
    case 'lista': {
      const de = etapa.de;
      const titulos = { area: 'Onde foi?', animal: 'Qual animal?', maquina: 'Qual máquina?' } as const;
      const selecionado = de === 'area' ? areaId : de === 'animal' ? animalId : maquinaId;
      cabecalho = <CabecalhoSimples titulo={titulos[de]} onVoltar={() => setEtapa({ tipo: 'detalhes' })} />;
      conteudo = (
        <EtapaLista itens={itensLista(de)} selecionado={selecionado} onEscolher={(id) => escolherDaLista(de, id)} />
      );
      break;
    }
    case 'registrada':
      cabecalho = null;
      conteudo = <EtapaRegistrada resumo={etapa.resumo} onVerTarefa={verTarefa} onPronto={onFechar} />;
      break;
  }

  return (
    <BottomSheet
      visible={visivel}
      title="O que aconteceu?"
      cabecalho={cabecalho}
      alturaMaxima={etapa.tipo === 'lista' ? 0.6 : 1}
      onClose={onFechar}>
      {conteudo}
    </BottomSheet>
  );
}
