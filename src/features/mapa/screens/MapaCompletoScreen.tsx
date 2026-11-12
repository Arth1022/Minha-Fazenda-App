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
import { SafeAreaInsetsContext, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useIsFocused, useLocalSearchParams, type Href } from 'expo-router';

import {
  AppIcon,
  ConfirmacaoSheet,
  Header,
  posicionarBotoesFlutuantes,
  type ItemConfirmacao,
  type PosicaoBotoesFlutuantes,
} from '@/components/ui';
import { AgroColors, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import {
  useConsultaAoVivo,
  useLiveQuery,
  type PontoRastro,
  type Talhao,
  type TarefaOcorrencia,
} from '@/database';
import { useFazendaAtiva } from '@/features/fazenda';
import { ICONE_CATEGORIA_TAREFA } from '@/features/tarefas';
import {
  concluirOcorrencia,
  iniciarOcorrencia,
  listarOcorrenciasNoMapa,
  ROTULO_CATEGORIA_TAREFA,
  TABELAS_OCORRENCIAS,
  type OcorrenciaNoMapa,
} from '@/services/ocorrenciaService';
import {
  iniciarRastro,
  reabrirUso,
  sessaoCompleta,
  simplificarLinha,
  TABELAS_POSICOES,
  TABELAS_SESSAO,
  TABELAS_TRAJETOS,
  trajetosDoPeriodo,
  ultimasPosicoes,
  useOperacaoMaquina,
  useUsoAtual,
  type PosicaoDaMaquina,
  type SessaoCompleta,
  type TrajetoDoPeriodo,
} from '@/features/maquinas';
import { existeCercaSalva } from '@/services/cercaService';
import { existeCicloAtivo, ROTA_TAREFAS, TABELAS_TAREFAS, tarefasDe, type Tarefa } from '@/services/cicloService';
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
import { podeEditarGeometria, podeIniciarOuConcluirTarefa, useUsuarioAtual } from '@/services/usuario';
import { calcularPerimetroKm, calcularPerimetroM, type Coordenada } from '@/utils/geoMath';
import { BarraBuscaMapa, BotaoQuadrado, type AnimalBuscado } from '../components/BarraBuscaMapa';
import { CamadaDesenho } from '../components/CamadaDesenho';
import { CartaoFazendaMapa } from '../components/CartaoFazendaMapa';
import { CamadaDivisaFazenda } from '../components/CamadaDivisaFazenda';
import {
  CamadaMarcadoresMapa,
  COR_POR_TIPO_MARCADOR,
  ROTULO_TIPO_MARCADOR,
} from '../components/CamadaMarcadoresMapa';
import { CamadaOcorrenciasMapa } from '../components/CamadaOcorrenciasMapa';
import { CamadasSheet } from '../components/CamadasSheet';
import { CamadaTalhoesSalvos } from '../components/CamadaTalhoesSalvos';
import { CamadaTrajetos, type MarcaDeMaquina, type TrajetoNoMapa } from '../components/CamadaTrajetos';
import { BotaoMapa, CoresTexto } from '../components/elementos';
import { InsumosAreaSheet } from '../components/InsumosAreaSheet';
import { BotaoListaAreas, ListaAreasMapa } from '../components/ListaAreasMapa';
import { MapaBase, type MapaBaseHandle, type VistaMapa } from '../components/MapaBase';
import { OpcoesAreaSheet } from '../components/OpcoesAreaSheet';
import { PainelArea, type VistaArea } from '../components/PainelArea';
import { PainelGravando, SeloGravando } from '../components/painel/PainelGravando';
import { PainelSessao } from '../components/painel/PainelSessao';
import { SalvarAreaSheet, type DadosSalvarArea } from '../components/SalvarAreaSheet';
import { SalvarFazendaSheet } from '../components/SalvarFazendaSheet';
import {
  BarraTrajetos,
  ListaTrajetos,
  PeriodoTrajetosSheet,
  type ItemTrajeto,
  type MaquinaDoFiltro,
} from '../components/Trajetos';
import { SalvarMarcadorSheet, type DadosSalvarMarcador } from '../components/SalvarMarcadorSheet';
import { lerCamadas, salvarCamadas, type CamadasMapa } from '../data/camadasMapa';
import {
  obterFazendaMapa,
  pontosForaDaFazenda,
  salvarFazendaMapa,
  useFazendaMapa,
} from '../data/fazendaMapa';
import { FimDoMapaContext } from '../hooks/useAlturaTeclado';
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
import {
  corDaMaquina,
  intervaloDoPeriodo,
  podeDesfazer,
  textoHa,
  type PeriodoTrajetos,
} from '../services/trajetos';
import { resumoFazenda, vistaDaFazenda } from '../services/vista';

const ZOOM_BUSCA = 15;
const MARGEM = 12;
/** Espaço livre entre a área enquadrada e o painel / a barra de busca */
const FOLGA_PAINEL = 24;
const FOLGA_TOPO = 64;
/** Altura mínima de mapa que sobra para a área ao enquadrar acima do painel */
const MAPA_MINIMO = 140;
/** Os botões flutuantes (Relatar e QR) somem se tivessem de subir além desta fração do mapa */
const LIMITE_BOTOES = 0.55;
/** Altura dos dois botões flutuantes empilhados, com o espaço entre eles */
const ALTURA_BOTOES = 52 * 2 + Spacing.two;

/** O que ocupa o rodapé do mapa (decide onde ficam os botões flutuantes) */
type Rodape = 'sessao' | 'area' | 'trajetos' | 'gravando' | 'lista' | 'pilula' | 'cartao' | null;

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
 * Aba Mapa: o mapa é a tela. Fluxo: achar a terra (busca, GPS, camadas) →
 * marcar a divisa da fazenda → separar a fazenda em áreas. A fazenda fica num
 * cartão no topo; a lista de áreas sobe por cima do mapa só quando pedida.
 * Tocar numa área (no mapa ou na lista) abre o painel inferior com o resumo e o
 * que dá para fazer nela. Desenhar, redesenhar e excluir é só do admin.
 */
export default function MapaCompletoScreen() {
  const insets = useSafeAreaInsets();
  const { height: alturaTela } = useWindowDimensions();
  const focada = useIsFocused();
  // Outras telas e os avisos abrem o mapa numa área ou num uso (ver rotaDoMapa)
  const { talhao: talhaoInicialId, vista, uso: usoInicialId } = useLocalSearchParams<{
    talhao?: string;
    /** "ciclo": abre a linha do tempo da lavoura (toque no aviso de uma etapa) */
    vista?: 'ciclo';
    /** Resumo de um uso de máquina (toque no aviso de fim automático, com o "Desfazer") */
    uso?: string;
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
  const nomeFazenda = useFazendaAtiva().fazenda?.nome ?? fazenda?.nome ?? '';
  const eu = useUsuarioAtual();
  const admin = podeEditarGeometria(eu);
  // Tarefas de lavoura de quem está com o celular: o atalho aparece quando há o que fazer
  const euId = eu.id;
  const { dados: tarefasLavoura } = useConsultaAoVivo<Tarefa[]>(() => tarefasDe(euId), TABELAS_TAREFAS, euId, []);
  const paraFazer = tarefasLavoura.filter((t) => t.etapa.realizadaEm === null && t.cicloStatus === 'ativo').length;

  const mapaRef = useRef<MapaBaseHandle>(null);
  const enquadradaRef = useRef<string | null>(null);
  // A câmera abre na área pedida ao montar; depois, pedidos novos abrem o painel (que enquadra)
  const [focoInicialId] = useState(talhaoInicialId);
  const [vistaInicial, setVistaInicial] = useState<VistaMapa | null>(null);
  const [alturaMapa, setAlturaMapa] = useState(alturaTela);
  const mapaViewRef = useRef<React.ComponentRef<typeof View>>(null);
  const [fimDoMapa, setFimDoMapa] = useState<number | null>(null);
  const [listaAberta, setListaAberta] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  // Altura do que está no rodapé, com o que era (um painel de outra área não vale)
  const [rodapeMedido, setRodapeMedido] = useState<{ chave: string; altura: number } | null>(null);
  const [camadas, setCamadas] = useState<CamadasMapa>(lerCamadas);
  const [camadasVisivel, setCamadasVisivel] = useState(false);
  const { dados: ocorrenciasMapa } = useConsultaAoVivo<OcorrenciaNoMapa[]>(
    () => (camadas.ocorrencias ? listarOcorrenciasNoMapa() : Promise.resolve([])),
    TABELAS_OCORRENCIAS,
    camadas.ocorrencias ? 'ocorrencias-mapa' : 'ocorrencias-mapa:off',
    [],
  );
  const [selecionadoId, setSelecionadoId] = useState<string | null>(talhaoInicialId ?? null);
  const [marcadorId, setMarcadorId] = useState<string | null>(null);
  const [ocorrenciaId, setOcorrenciaId] = useState<string | null>(null);
  const [modoMarcador, setModoMarcador] = useState(false);
  const [talhaoMarcadorId, setTalhaoMarcadorId] = useState<string | null>(null);
  const [coordenadaMarcador, setCoordenadaMarcador] = useState<Coordenada | null>(null);
  const [alvo, setAlvo] = useState<AlvoDesenho>({ tipo: 'area' });
  const [rascunho, setRascunho] = useState<ResultadoDesenhoTalhao | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  // Folhas que somem deslizando: o conteúdo fica até a próxima abertura
  const [opcoesId, setOpcoesId] = useState<string | null>(null);
  const [opcoesVisivel, setOpcoesVisivel] = useState(false);
  const [insumosId, setInsumosId] = useState<string | null>(null);
  const [insumosVisivel, setInsumosVisivel] = useState(false);
  // O que o painel da área mostra no lugar do resumo ("Cercar", horas de máquina), com a área
  const [vistaArea, setVistaArea] = useState<{ areaId: string; vista: VistaArea } | null>(null);
  // Resumo de um uso de máquina (tela 25): fim da sessão, lista de trajetos, painel da área ou aviso
  const [sessaoId, setSessaoId] = useState<string | null>(usoInicialId ?? null);
  // Camada Trajetos (tela 26): período e máquina filtrada; null fora dela
  const [trajetos, setTrajetos] = useState<{ periodo: PeriodoTrajetos; maquinaId: string | null } | null>(null);
  const [periodoVisivel, setPeriodoVisivel] = useState(false);
  // Aviso de etapa tocado: o painel dessa área abre na linha do tempo do ciclo
  const [cicloAreaId, setCicloAreaId] = useState<string | null>(
    vista === 'ciclo' ? (talhaoInicialId ?? null) : null,
  );
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
    comecarDesenhando: false,
  });

  const comecarDesenho = useCallback(
    (novoAlvo: AlvoDesenho) => {
      setSelecionadoId(null);
      setListaAberta(false);
      setBuscaAberta(false);
      setSessaoId(null);
      setTrajetos(null);
      setMarcadorId(null);
      setOcorrenciaId(null);
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

  // Pedido de outra tela ou de um aviso (a aba já pode estar aberta): abre a área ou o uso.
  // Atendido uma vez; depois os parâmetros saem da rota e o mesmo pedido pode voltar
  const chavePedido =
    talhaoInicialId || usoInicialId ? `${talhaoInicialId ?? ''}|${usoInicialId ?? ''}|${vista ?? ''}` : null;
  const [pedidoAtendido, setPedidoAtendido] = useState<string | null>(null);
  if (chavePedido !== pedidoAtendido) {
    setPedidoAtendido(chavePedido);
    if (chavePedido) {
      setListaAberta(false);
      setBuscaAberta(false);
      setMarcadorId(null);
      setOcorrenciaId(null);
      if (usoInicialId) {
        setSelecionadoId(null);
        setSessaoId(usoInicialId);
      } else if (talhaoInicialId) {
        setSessaoId(null);
        setCicloAreaId(vista === 'ciclo' ? talhaoInicialId : null);
        setSelecionadoId(talhaoInicialId);
      }
    }
  }
  useEffect(() => {
    if (chavePedido) router.setParams({ talhao: undefined, vista: undefined, uso: undefined });
  }, [chavePedido]);

  // A câmera abre uma vez só, quando as áreas terminam de carregar
  if (carregado && !vistaInicial) {
    const foco = talhoes.find((t) => t.id === focoInicialId);
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
  const ocorrenciaSelecionada = useMemo(
    () =>
      modoDesenho || modoMarcador || !camadas.ocorrencias
        ? null
        : (ocorrenciasMapa.find((oc) => oc.id === ocorrenciaId) ?? null),
    [modoDesenho, modoMarcador, camadas.ocorrencias, ocorrenciasMapa, ocorrenciaId],
  );
  const pastos = useMemo(() => talhoes.filter((t) => t.tipo === 'pasto'), [talhoes]);
  const editando = talhoes.find((t) => t.id === editandoId) ?? null;
  const areaOpcoes = talhoes.find((t) => t.id === opcoesId) ?? null;
  const areaInsumos = talhoes.find((t) => t.id === insumosId) ?? null;

  // "Cercar" e horas de máquina valem para o painel aberto: fechar ou trocar de área volta ao resumo
  const painelId = selecionado?.id ?? null;
  const [painelAnteriorId, setPainelAnteriorId] = useState(painelId);
  if (painelId !== painelAnteriorId) {
    // Só o painel da área do aviso abre na linha do tempo; trocar ou fechar, não
    if (painelAnteriorId !== null && painelId !== cicloAreaId) setCicloAreaId(null);
    setPainelAnteriorId(painelId);
    setVistaArea(null);
  }
  const vistaDoPainel: VistaArea =
    painelId !== null && vistaArea?.areaId === painelId ? vistaArea.vista : 'resumo';

  // Máquina em uso neste celular (tela 24): o traçado ao vivo e o cartão com "Encerrar sessão"
  const atual = useUsoAtual();
  const operacao = useOperacaoMaquina();
  const rastroAoVivo = useMemo<PontoRastro[]>(
    () => (atual?.uso.rastreado ? simplificarLinha(atual.pontos, 3).map((p): PontoRastro => [p.lng, p.lat]) : []),
    [atual]
  );
  const corAoVivo = atual ? corDaMaquina(atual.maquina.id) : null;

  // Resumo do uso aberto (tela 25); a consulta anterior não vale para outro id
  const { dados: sessaoLida } = useConsultaAoVivo<SessaoCompleta | null>(
    () => (sessaoId ? sessaoCompleta(sessaoId) : Promise.resolve(null)),
    TABELAS_SESSAO,
    sessaoId ?? '',
    null
  );
  const sessao = sessaoLida && sessaoLida.uso.id === sessaoId ? sessaoLida : null;

  // Camada Trajetos: os usos do período (pelo índice de início) e a última posição de cada máquina
  const intervalo = trajetos ? intervaloDoPeriodo(trajetos.periodo) : null;
  const { dados: doPeriodo } = useConsultaAoVivo<TrajetoDoPeriodo[]>(
    () => (intervalo ? trajetosDoPeriodo(intervalo.desde, intervalo.ate) : Promise.resolve([])),
    TABELAS_TRAJETOS,
    intervalo ? `${trajetos?.periodo}:${intervalo.desde.getTime()}` : '',
    []
  );
  const { dados: posicoes } = useConsultaAoVivo<PosicaoDaMaquina[]>(
    () => (trajetos ? ultimasPosicoes() : Promise.resolve([])),
    TABELAS_POSICOES,
    trajetos ? 'posicoes' : '',
    []
  );
  const filtroMaquina = trajetos?.maquinaId ?? null;
  const doFiltro = trajetos ? doPeriodo.filter((t) => !filtroMaquina || t.maquinaId === filtroMaquina) : [];
  const trajetosNoMapa: TrajetoNoMapa[] = doFiltro.map((t) => ({
    id: t.id,
    cor: corDaMaquina(t.maquinaId),
    rastro: t.rastro ?? [],
  }));
  const marcasDasMaquinas: MarcaDeMaquina[] = trajetos
    ? posicoes
        .filter((p) => !filtroMaquina || p.maquinaId === filtroMaquina)
        .map((p) => ({
          id: p.usoId,
          cor: corDaMaquina(p.maquinaId),
          coordenada: [p.lng, p.lat],
          texto: `${p.maquinaNome} · ${p.emUso ? 'agora' : textoHa(p.em)}`,
        }))
    : [];
  const maquinasDoFiltro: MaquinaDoFiltro[] = [];
  for (const t of doPeriodo) {
    if (!maquinasDoFiltro.some((m) => m.id === t.maquinaId)) {
      maquinasDoFiltro.push({ id: t.maquinaId, nome: t.maquinaNome, cor: corDaMaquina(t.maquinaId) });
    }
  }
  const itensDaLista: ItemTrajeto[] = doFiltro.map((t) => ({
    id: t.id,
    maquinaNome: t.maquinaNome,
    cor: corDaMaquina(t.maquinaId),
    operador: t.operador,
    km: t.kmTotal,
    duracaoMs: (t.fim ?? t.inicio).getTime() - t.inicio.getTime(),
  }));
  // O uso do resumo, quando não está entre os desenhados da camada (ex.: aberto pelo painel da área)
  const rastroDaSessao = sessao?.uso.rastro ?? null;
  const sessaoNoMapa: TrajetoNoMapa | null =
    sessao && rastroDaSessao && rastroDaSessao.length > 1 && !trajetosNoMapa.some((t) => t.id === sessao.uso.id)
      ? { id: sessao.uso.id, cor: corDaMaquina(sessao.maquina.id), rastro: rastroDaSessao }
      : null;
  const marcaDaSessao: MarcaDeMaquina[] =
    sessao && sessaoNoMapa && rastroDaSessao
      ? [
          {
            id: sessao.uso.id,
            cor: sessaoNoMapa.cor,
            coordenada: rastroDaSessao[rastroDaSessao.length - 1],
            texto: `${sessao.maquina.nome} · ${textoHa(sessao.uso.fim ?? new Date())}`,
          },
        ]
      : [];

  // Painel fechado: a próxima abertura (mesmo da mesma área ou do mesmo uso) enquadra de novo
  useEffect(() => {
    if (!selecionado && !sessaoId) enquadradaRef.current = null;
  }, [selecionado, sessaoId]);

  const destinoDestacado =
    selecionado && destaqueDestino?.areaId === selecionado.id ? destaqueDestino.destinoId : null;

  // Voltar do Android sai do desenho, do ponto de atenção, do resumo do uso, do "Cercar", fecha o
  // painel e sai da camada Trajetos, nessa ordem, antes de sair da tela
  // (a aba fica montada atrás das outras: só vale com o mapa na frente)
  const temOQueFechar =
    modoDesenho ||
    modoMarcador ||
    buscaAberta ||
    sessaoId !== null ||
    selecionado !== null ||
    trajetos !== null ||
    listaAberta;
  useEffect(() => {
    if (!temOQueFechar || !focada) return;
    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modoMarcador) sairDoModoMarcador();
      else if (modoDesenho) sairDoDesenho();
      else if (buscaAberta) setBuscaAberta(false);
      else if (sessaoId) setSessaoId(null);
      else if (vistaDoPainel !== 'resumo') setVistaArea(null);
      else if (selecionado) setSelecionadoId(null);
      else if (trajetos) setTrajetos(null);
      else setListaAberta(false);
      return true;
    });
    return () => inscricao.remove();
  }, [
    temOQueFechar,
    focada,
    modoDesenho,
    modoMarcador,
    buscaAberta,
    sessaoId,
    vistaDoPainel,
    selecionado,
    trajetos,
    sairDoDesenho,
    sairDoModoMarcador,
  ]);

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
      setOcorrenciaId(null);
      setAnimalEmDestaque(null);
      setListaAberta(false);
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
      setOcorrenciaId(null);
      setMarcadorId((atual) => (atual === id ? null : id));
    },
    [modoMarcador, modoDesenho, aoTocarMapa],
  );

  const selecionarOcorrencia = useCallback(
    (id: string) => {
      if (modoMarcador || modoDesenho) return;
      setSelecionadoId(null);
      setMarcadorId(null);
      setOcorrenciaId((atual) => (atual === id ? null : id));
    },
    [modoMarcador, modoDesenho],
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

  /** Área escolhida na busca ou na lista: liga a camada de áreas, se preciso, e abre o painel dela */
  const escolherAreaDaBusca = (area: Talhao) => {
    if (!camadas.areas) mudarCamadas({ ...camadas, areas: true });
    setBuscaAberta(false);
    setListaAberta(false);
    setMarcadorId(null);
    setOcorrenciaId(null);
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
    setBuscaAberta(false);
    setMarcadorId(null);
    setSelecionadoId(animal.areaId);
  };

  // O mapa fica entre o cabeçalho e a barra de abas: as bordas seguras já ficaram de fora
  const topo = MARGEM;
  const base = MARGEM;

  /** Mostra a área escolhida inteira no pedaço de mapa acima do painel */
  const enquadrarSelecionada = (alturaPainel: number) => {
    if (!selecionado) return;
    const { id, minLat, maxLat, minLng, maxLng } = selecionado;
    const chave = `${id}:${minLat}:${maxLat}:${minLng}:${maxLng}`;
    if (enquadradaRef.current === chave) return;
    enquadradaRef.current = chave;
    const cima = topo + FOLGA_TOPO;
    const baixo = Math.min(alturaPainel + FOLGA_PAINEL, alturaMapa - cima - MAPA_MINIMO);
    mapaRef.current?.enquadrar([maxLng, maxLat], [minLng, minLat], {
      top: cima,
      bottom: Math.max(baixo, FOLGA_PAINEL),
      left: 40,
      right: 40,
    });
  };

  /** Mostra o trajeto do resumo inteiro no pedaço de mapa acima do painel */
  const enquadrarSessao = (alturaPainel: number) => {
    if (!sessao || !rastroDaSessao || rastroDaSessao.length < 2) return;
    const chave = `uso:${sessao.uso.id}`;
    if (enquadradaRef.current === chave) return;
    enquadradaRef.current = chave;
    let [minLng, minLat, maxLng, maxLat] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [lng, lat] of rastroDaSessao) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    const cima = topo + FOLGA_TOPO;
    const baixo = Math.min(alturaPainel + FOLGA_PAINEL, alturaMapa - cima - MAPA_MINIMO);
    mapaRef.current?.enquadrar([maxLng, maxLat], [minLng, minLat], {
      top: cima,
      bottom: Math.max(baixo, FOLGA_PAINEL),
      left: 40,
      right: 40,
    });
  };

  /** "Encerrar sessão" (tela 24): grava o uso e mostra o resumo dele no mapa (tela 25) */
  const encerrarSessao = async () => {
    if (!atual) return;
    const resultado = await operacao.desligar(atual.maquina.id);
    if (!resultado) return;
    if (resultado.descartado) {
      Alert.alert('Uso descartado', 'A máquina ficou ligada menos de 1 minuto, quase sem andar: não foi registrado.');
    } else if (resultado.uso) {
      setSelecionadoId(null);
      setSessaoId(resultado.uso.id);
    }
  };

  /** "Desfazer" do fim automático (RF-050): o uso volta a correr e o GPS liga de novo */
  const desfazerFim = async () => {
    if (!sessao) return;
    await reabrirUso(sessao.uso.id);
    if (sessao.uso.rastreado) await iniciarRastro(sessao.maquina.nome);
    setSessaoId(null);
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
      case 'cercar':
        setSelecionadoId(area.id);
        setVistaArea({ areaId: area.id, vista: 'cercar' });
        break;
      case 'insumos':
        setInsumosId(area.id);
        setInsumosVisivel(true);
        break;
      case 'editar':
        setEditandoId(area.id);
        break;
      case 'pontoAtencao':
        setTalhaoMarcadorId(area.id);
        setModoMarcador(true);
        break;
      case 'redesenhar': {
        // Cerca e sementes do ciclo ficam desatualizadas com o contorno novo (RF-032, RN-010)
        const [temCerca, temCiclo] = await Promise.all([
          existeCercaSalva(area.id).catch(() => false),
          area.tipo === 'lavoura' ? existeCicloAtivo(area.id).catch(() => false) : false,
        ]);
        abrirConfirmacao({
          acao: 'redesenhar',
          area,
          itens: consequenciasRedesenho(ocupacoes.get(area.id)?.cabecas ?? 0, temCerca, temCiclo),
        });
        break;
      }
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

  const salvarFazenda = async () => {
    if (!rascunho) return;
    try {
      await salvarFazendaMapa(rascunho.pontos);
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

  // O que fica no rodapé, na mesma ordem em que é desenhado lá embaixo
  const painelSessao = sessao !== null && !modoDesenho && !modoMarcador;
  const painelGravando = Boolean(atual && corAoVivo) && !modoDesenho && !modoMarcador;
  const ocioso =
    fazenda !== null && !modoDesenho && !modoMarcador && !selecionado && !marcadorSelecionado && !ocorrenciaSelecionada;
  const rodape: Rodape = painelSessao
    ? 'sessao'
    : selecionado
      ? 'area'
      : trajetos
        ? 'trajetos'
        : painelGravando
          ? 'gravando'
          : ocioso
            ? listaAberta
              ? 'lista'
              : 'pilula'
            : modoMarcador || modoDesenho || marcadorSelecionado || ocorrenciaSelecionada || !fazenda
              ? 'cartao'
              : null;
  const chaveRodape = `${rodape}:${selecionado?.id ?? sessaoId ?? marcadorId ?? ocorrenciaId ?? ''}`;
  const medirRodape = (altura: number) => setRodapeMedido({ chave: chaveRodape, altura });

  // Relatar e QR: no lugar de sempre; acima da lista, do painel ou do cartão do rodapé;
  // escondidos no desenho, na busca e quando teriam de subir demais
  const alturaRodape = rodapeMedido?.chave === chaveRodape ? rodapeMedido.altura : null;
  let posicaoBotoes: PosicaoBotoesFlutuantes = { elevacao: 0, ocultos: buscaAberta };
  if (rodape !== 'pilula' && rodape !== null) {
    const elevacao = alturaRodape === null ? 0 : alturaRodape + (rodape === 'cartao' ? base : 0);
    posicaoBotoes = {
      elevacao,
      ocultos:
        buscaAberta ||
        modoDesenho ||
        modoMarcador ||
        rodape === 'trajetos' ||
        rodape === 'gravando' ||
        alturaRodape === null ||
        elevacao + ALTURA_BOTOES + Spacing.three > alturaMapa * LIMITE_BOTOES,
    };
  }
  const { elevacao: elevacaoBotoes, ocultos: botoesOcultos } = posicaoBotoes;
  useEffect(() => {
    if (!focada) return;
    posicionarBotoesFlutuantes({ elevacao: elevacaoBotoes, ocultos: botoesOcultos });
    return () => posicionarBotoesFlutuantes(null);
  }, [focada, elevacaoBotoes, botoesOcultos]);

  // Dentro do mapa, o cabeçalho e a barra de abas já cuidam das bordas seguras
  const insetsDoMapa = useMemo(() => ({ ...insets, top: 0, bottom: 0 }), [insets]);

  const controles = (
    <View style={estilos.controles}>
      <BotaoQuadrado icone="layers" rotulo="Camadas do mapa" onPress={() => setCamadasVisivel(true)} />
      <BotaoQuadrado icone="locate" rotulo="Centralizar na minha localização" onPress={centralizarNoGps} />
    </View>
  );

  return (
    <View style={estilos.raiz}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <Header title="Mapa da fazenda" />
      </SafeAreaView>

      <SafeAreaInsetsContext.Provider value={insetsDoMapa}>
        <FimDoMapaContext.Provider value={fimDoMapa}>
          <View
            ref={mapaViewRef}
            style={estilos.mapa}
            onLayout={(e) => {
              setAlturaMapa(e.nativeEvent.layout.height);
              mapaViewRef.current?.measureInWindow((_x, y, _largura, altura) => setFimDoMapa(y + altura));
            }}>
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
                {trajetos ? (
                  <CamadaTrajetos
                    id="trajetos"
                    trajetos={trajetosNoMapa}
                    marcas={marcasDasMaquinas}
                    destaqueId={sessaoId}
                    onPress={setSessaoId}
                  />
                ) : null}
                {sessaoNoMapa ? (
                  <CamadaTrajetos id="sessao" trajetos={[sessaoNoMapa]} marcas={marcaDaSessao} destaqueId={sessaoNoMapa.id} />
                ) : null}
                {atual && corAoVivo && rastroAoVivo.length > 0 && !modoDesenho ? (
                  <CamadaTrajetos
                    id="gravando"
                    trajetos={[{ id: atual.uso.id, cor: corAoVivo, rastro: rastroAoVivo }]}
                    ponta={{ coordenada: rastroAoVivo[rastroAoVivo.length - 1], cor: corAoVivo }}
                  />
                ) : null}
                {camadas.pontos ? (
                  <CamadaMarcadoresMapa
                    marcadores={marcadores}
                    selecionadoId={marcadorSelecionado?.id ?? null}
                    onPressMarcador={selecionarMarcador}
                  />
                ) : null}
                {camadas.ocorrencias ? (
                  <CamadaOcorrenciasMapa
                    ocorrencias={ocorrenciasMapa}
                    selecionadaId={ocorrenciaSelecionada?.id ?? null}
                    onPressOcorrencia={selecionarOcorrencia}
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

            {atual && !trajetos && !modoDesenho && !modoMarcador ? (
              <View style={[estilos.seloGravando, { top: topo + 64 }]} pointerEvents="none">
                <SeloGravando />
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
            ) : trajetos ? (
              <BarraTrajetos
                topo={topo}
                periodo={trajetos.periodo}
                maquinas={maquinasDoFiltro}
                maquinaId={trajetos.maquinaId}
                onVoltar={() => {
                  setTrajetos(null);
                  setSessaoId(null);
                }}
                onPeriodo={() => setPeriodoVisivel(true)}
                onMaquina={(maquinaId) => setTrajetos({ ...trajetos, maquinaId })}
              />
            ) : !fazenda ? (
              // Sem divisa: a busca de lugares fica à mostra para achar a terra
              <BarraBuscaMapa
                topo={topo}
                modo={{ tipo: 'locais', onEscolher: (r) => mapaRef.current?.voarPara(r.coordenada, ZOOM_BUSCA) }}
                controles={controles}
              />
            ) : buscaAberta ? (
              <BarraBuscaMapa
                topo={topo}
                autoFocus
                onVoltar={() => setBuscaAberta(false)}
                modo={{
                  tipo: 'areas',
                  areas: talhoes,
                  ocupacoes,
                  onEscolher: escolherAreaDaBusca,
                  onEscolherAnimal: escolherAnimalDaBusca,
                }}
                controles={controles}
              />
            ) : (
              <View style={[estilos.topo, { top: topo }]} pointerEvents="box-none">
                <CartaoFazendaMapa
                  nome={nomeFazenda}
                  resumo={carregado ? resumoFazenda(fazenda, talhoes) : '…'}
                  onBuscar={() => {
                    setListaAberta(false);
                    setBuscaAberta(true);
                  }}
                />
                {controles}
              </View>
            )}

            {sessao && !modoDesenho && !modoMarcador ? (
              <PainelSessao
                key={sessao.uso.id}
                sessao={sessao}
                cor={corDaMaquina(sessao.maquina.id)}
                podeDesfazer={podeDesfazer(sessao.uso, eu.id)}
                onDesfazer={desfazerFim}
                onFechar={() => setSessaoId(null)}
                onAltura={(altura) => {
                  medirRodape(altura);
                  enquadrarSessao(altura);
                }}
              />
            ) : selecionado ? (
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
                onAltura={(altura) => {
                  medirRodape(altura);
                  enquadrarSelecionada(altura);
                }}
                vista={vistaDoPainel}
                onVista={(nova) => setVistaArea(nova === 'resumo' ? null : { areaId: selecionado.id, vista: nova })}
                onAbrirUso={setSessaoId}
                podeCriarCultura={admin}
                abrirLinhaDoTempo={cicloAreaId === selecionado.id}
                onRelatarProblema={() => {
                  const id = selecionado.id;
                  setSelecionadoId(null);
                  router.push({ pathname: '/estoque', params: { relatarAreaId: id } });
                }}
              />
            ) : trajetos ? (
              <ListaTrajetos itens={itensDaLista} periodo={trajetos.periodo} base={base} onAbrir={setSessaoId} />
            ) : atual && corAoVivo && !modoDesenho && !modoMarcador ? (
              <PainelGravando
                atual={atual}
                cor={corAoVivo}
                base={base}
                encerrando={operacao.ocupado}
                onEncerrar={encerrarSessao}
              />
            ) : rodape === 'lista' ? (
              <ListaAreasMapa
                areas={talhoes}
                ocupacoes={ocupacoes}
                hectaresFazenda={fazenda?.areaHectares ?? null}
                alturaMaximaLista={alturaMapa * 0.4}
                onNovaArea={admin ? () => comecarDesenho({ tipo: 'area' }) : undefined}
                onEscolher={escolherAreaDaBusca}
                onFechar={() => setListaAberta(false)}
                onAltura={medirRodape}
              />
            ) : rodape === 'pilula' ? (
              <View style={estilos.rodapePilula} pointerEvents="box-none">
                <BotaoListaAreas quantidade={talhoes.length} onPress={() => setListaAberta(true)} />
                {paraFazer > 0 ? (
                  <Pressable
                    onPress={() => router.push(ROTA_TAREFAS as Href)}
                    accessibilityRole="button"
                    accessibilityLabel={`Minhas tarefas: ${paraFazer} para fazer`}
                    style={({ pressed }) => [estilos.pilulaTarefas, pressed && estilos.pressionado]}>
                    <AppIcon name="check" size={18} color={AgroColors.forest} />
                    <Text style={estilos.pilulaTarefasTexto}>{paraFazer} para fazer</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : rodape === 'cartao' ? (
              <View
                style={[estilos.rodape, { bottom: base }]}
                pointerEvents="box-none"
                onLayout={(e) => medirRodape(e.nativeEvent.layout.height)}>
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
                  ) : ocorrenciaSelecionada ? (
                    <>
                      <View style={estilos.cabecalhoMarcador}>
                        <View
                          style={[
                            estilos.pontoCor,
                            {
                              backgroundColor: ocorrenciaSelecionada.urgente
                                ? AgroColors.danger
                                : AgroColors.warning,
                            },
                          ]}
                        />
                        <AppIcon
                          name={ICONE_CATEGORIA_TAREFA[ocorrenciaSelecionada.categoria]}
                          size={18}
                          color={CoresTexto.escuro}
                        />
                        <Text style={estilos.cartaoTitulo} numberOfLines={1}>
                          {ocorrenciaSelecionada.titulo}
                        </Text>
                        <Pressable
                          onPress={() => setOcorrenciaId(null)}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel="Fechar ocorrência"
                          style={estilos.fecharMarcador}>
                          <AppIcon name="x" size={20} color={CoresTexto.suave} />
                        </Pressable>
                      </View>
                      <Text style={estilos.cartaoTexto}>
                        {ocorrenciaSelecionada.urgente ? 'URGENTE · ' : ''}
                        {ROTULO_CATEGORIA_TAREFA[ocorrenciaSelecionada.categoria]}
                        {ocorrenciaSelecionada.descricao ? ` · ${ocorrenciaSelecionada.descricao}` : ''}
                      </Text>
                      <View style={estilos.acoes}>
                        <BotaoMapa
                          rotulo="Ver em Tarefas"
                          variante="contorno"
                          onPress={() => {
                            setOcorrenciaId(null);
                            router.push('/estoque');
                          }}
                          style={estilos.acao}
                        />
                        {/* Concluir só depois de iniciar */}
                        {podeIniciarOuConcluirTarefa(ocorrenciaSelecionada, eu) ? (
                          ocorrenciaSelecionada.status === 'em_andamento' ? (
                            <BotaoMapa
                              rotulo="Concluir"
                              icone="check"
                              onPress={async () => {
                                const id = ocorrenciaSelecionada.id;
                                setOcorrenciaId(null);
                                await concluirOcorrencia(id, { autor: eu });
                              }}
                              style={estilos.acao}
                            />
                          ) : (
                            <BotaoMapa
                              rotulo="Iniciar"
                              onPress={async () => {
                                const id = ocorrenciaSelecionada.id;
                                setOcorrenciaId(null);
                                await iniciarOcorrencia(id, eu);
                              }}
                              style={estilos.acao}
                            />
                          )
                        ) : null}
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
          </View>
        </FimDoMapaContext.Provider>
      </SafeAreaInsetsContext.Provider>

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

      <InsumosAreaSheet
        visible={insumosVisivel && areaInsumos !== null}
        area={areaInsumos}
        onClose={() => setInsumosVisivel(false)}
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

      <PeriodoTrajetosSheet
        visible={periodoVisivel}
        periodo={trajetos?.periodo ?? 'hoje'}
        onEscolher={(periodo) => {
          setPeriodoVisivel(false);
          setSessaoId(null);
          setTrajetos({ periodo, maquinaId: trajetos?.maquinaId ?? null });
        }}
        onClose={() => setPeriodoVisivel(false)}
      />

      <CamadasSheet
        visible={camadasVisivel}
        camadas={camadas}
        onChange={mudarCamadas}
        onClose={() => setCamadasVisivel(false)}
        onTrajetos={() => {
          setCamadasVisivel(false);
          setSelecionadoId(null);
          setSessaoId(null);
          setTrajetos({ periodo: 'hoje', maquinaId: null });
        }}
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
  raiz: { flex: 1, backgroundColor: AgroColors.headerGreen },
  cabecalho: { backgroundColor: AgroColors.headerGreen },
  mapa: { flex: 1, overflow: 'hidden', backgroundColor: AgroColors.mapTerrainBg },
  topo: { position: 'absolute', left: MARGEM, right: MARGEM, gap: Spacing.three },
  seloGravando: { position: 'absolute', left: MARGEM + 4 },
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

  // Na altura do leitor de QR (52 de altura, 16 acima da barra de abas), do lado esquerdo
  rodapePilula: {
    position: 'absolute',
    left: Spacing.three,
    bottom: Spacing.three + 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pilulaTarefas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: Spacing.three,
    borderRadius: 23,
    backgroundColor: AgroColors.cardBg,
    ...Shadows.md,
  },
  pilulaTarefasTexto: { fontSize: 15, fontWeight: '600', color: AgroColors.forest },

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
