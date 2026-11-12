import { and, eq, isNull } from 'drizzle-orm';

import {
  corDaMaquina,
  CORES_TRAJETO,
  intervaloDoPeriodo,
  PERIODO_PADRAO,
  numerosDaSessao,
  podeDesfazer,
  sugestaoDeEtapa,
  textoFimAutomatico,
  textoHa,
  textoHorario,
  textoKm,
} from '@/features/mapa/services/trajetos';
import { etapasDoInicio, linhaDoTempoPrevista, MODELOS_PRONTOS } from '@/features/mapa/services/plantio';
import { cadastrarMaquina } from '@/features/maquinas/data/maquinas';
import {
  sessaoCompleta,
  segundosNaAreaDesde,
  trajetosDoPeriodo,
  ultimasPosicoes,
  usosDaArea,
} from '@/features/maquinas/data/trajetos';
import {
  encerrarUso,
  fecharUso,
  gravarPontos,
  iniciarUso,
  limparPontosAntigos,
  reabrirUso,
} from '@/features/maquinas/data/usos';
import { decidirAutomacao, fimPorSaidaDaFazenda } from '@/features/maquinas/services/automacao';
import type { Poligono } from '@/features/maquinas/services/geo';
import { TEMPOS } from '@/features/maquinas/services/padroes';
import type { PontoLido } from '@/features/maquinas/services/rastro';
import { formatarDuracao } from '@/features/maquinas/services/uso';
import { etapasPendentesNasAreas, iniciarCiclo } from '@/services/cicloService';
import { criarTalhao } from '@/services/talhaoService';
import { usuarioAtual } from '@/services/usuario';
import type { Coordenada } from '@/utils/geoMath';
import { db, initTestDatabase, pontosGps, talhoes, usosArea, usosMaquina, fecharTestDatabase } from './support/database';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

async function rejeita(acao: () => Promise<unknown>): Promise<string | null> {
  try {
    await acao();
    return null;
  } catch (erro) {
    return erro instanceof Error ? erro.message : String(erro);
  }
}

// Geometria em metros a partir de um ponto (-22, -47)
const ORIGEM = { lat: -22, lng: -47 };
const METRO_LNG = 1 / (111_320 * Math.cos((ORIGEM.lat * Math.PI) / 180));
const METRO_LAT = 1 / 110_574;
const SEG = 1000;
const MIN = 60 * SEG;
const T0 = new Date(2026, 10, 10, 7, 10).getTime();

const lngLat = (x: number, y: number): Coordenada => [ORIGEM.lng + x * METRO_LNG, ORIGEM.lat + y * METRO_LAT];
const retangulo = (x0: number, x1: number, y0: number, y1: number): Coordenada[] => [
  lngLat(x0, y0),
  lngLat(x1, y0),
  lngLat(x1, y1),
  lngLat(x0, y1),
];
const poligono = (x0: number, x1: number, y0: number, y1: number): Poligono => ({
  anel: [...retangulo(x0, x1, y0, y1), lngLat(x0, y0)],
  caixa: {
    minLat: ORIGEM.lat + y0 * METRO_LAT,
    maxLat: ORIGEM.lat + y1 * METRO_LAT,
    minLng: ORIGEM.lng + x0 * METRO_LNG,
    maxLng: ORIGEM.lng + x1 * METRO_LNG,
  },
});

function ponto(x: number, y: number, em: number): PontoLido {
  const [lng, lat] = lngLat(x, y);
  return { lat, lng, precisaoM: 5, velocidadeMs: null, simulado: false, em };
}

/** Vai e volta entre `x0` e `x1` (na altura `y`) a `ms` m/s, um ponto a cada 5 s. */
function vaiEVolta(n: number, x0: number, x1: number, y: number, ms: number, desde: number): PontoLido[] {
  const largura = x1 - x0;
  return Array.from({ length: n }, (_, i) => {
    const andado = (i * 5 * ms) % (2 * largura);
    const x = andado <= largura ? x0 + andado : x1 - (andado - largura);
    return ponto(x, y, desde + i * 5 * SEG);
  });
}

/** Linha reta de (x0, y) até (x1, y) em `n` pontos de 5 s. */
function reta(n: number, x0: number, x1: number, y: number, desde: number): PontoLido[] {
  return Array.from({ length: n }, (_, i) => ponto(x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, desde + i * 5 * SEG));
}

function regrasPuras() {
  const cor = corDaMaquina('maquina-1');
  check(
    CORES_TRAJETO.includes(cor as (typeof CORES_TRAJETO)[number]) && corDaMaquina('maquina-1') === cor,
    'cor fixa por máquina, sempre a mesma (RF-062)'
  );
  const agora = new Date(T0);
  const hoje = intervaloDoPeriodo('hoje', agora);
  const seteDias = intervaloDoPeriodo('7dias', agora);
  check(
    hoje.desde.getTime() === new Date(2026, 10, 10).getTime() &&
      hoje.ate.getTime() === new Date(2026, 10, 11).getTime() &&
      seteDias.desde.getTime() === new Date(2026, 10, 4).getTime() &&
      intervaloDoPeriodo('ontem', agora).ate.getTime() === hoje.desde.getTime(),
    'períodos da camada: hoje, ontem, 7 e 30 dias'
  );
  const doisDias = intervaloDoPeriodo(PERIODO_PADRAO, agora);
  check(
    PERIODO_PADRAO === '2dias' &&
      doisDias.desde.getTime() === new Date(2026, 10, 9).getTime() &&
      doisDias.ate.getTime() === hoje.ate.getTime(),
    'padrão da camada: 2 dias (ontem e hoje), o traçado de ontem continua no mapa'
  );
  check(
    [30 * SEG, 20 * MIN, 3 * 60 * MIN, 26 * 60 * MIN, 3 * 24 * 60 * MIN]
      .map((ms) => textoHa(new Date(T0 - ms), agora))
      .join(' | ') === 'agora | há 20 min | há 3 h | há 1 dia | há 3 dias',
    'última posição: "Pulverizador · há 20 min", "Trator 1 · há 3 h" (RF-064)'
  );
  check(
    textoHorario(new Date(T0), new Date(T0 + 92 * MIN), agora) === 'hoje, 07:10 → 08:42' &&
      textoHorario(new Date(T0), null, agora) === 'hoje, desde 07:10' &&
      textoHorario(new Date(2026, 10, 8, 7, 10), new Date(2026, 10, 8, 8), agora) === '08/11, 07:10 → 08:00',
    'tela 25: "João · hoje, 07:10 → 08:42"'
  );

  // Tela 25: 8,4 km, 1 h 32 min, 1 h 10 min em movimento, 22 min parado; fora das áreas 1,0 km
  const numeros = numerosDaSessao(
    {
      inicio: new Date(T0),
      fim: new Date(T0 + 92 * MIN),
      kmTotal: 8.4,
      segTrabalhando: 3600,
      segDeslocando: 600,
      segParada: 1320,
      segPausa: 0,
    },
    [{ km: 5.1 }, { km: 2.3 }]
  );
  check(
    textoKm(numeros.km ?? 0) === '8,4 km' &&
      formatarDuracao(numeros.duracaoMs) === '1h 32 min' &&
      formatarDuracao(numeros.emMovimentoMs ?? 0) === '1h 10 min' &&
      formatarDuracao(numeros.paradoMs ?? 0) === '22 min' &&
      numeros.foraDasAreasKm === 1,
    'tela 25: distância, duração, em movimento, parado e "Fora das áreas 1,0 km" (RF-056)'
  );

  check(
    textoFimAutomatico('parada') === 'Encerrada sozinha · ficou parada' &&
      textoFimAutomatico('fora') === 'Encerrada sozinha · saiu da fazenda' &&
      textoFimAutomatico('manual') === null,
    'faixa do fim automático; quem encerrou na mão não vê'
  );
  const fimAuto = { fim: new Date(T0), fimMotivo: 'parada' as const, operadorId: 'beta' };
  check(
    podeDesfazer(fimAuto, 'beta', new Date(T0 + MIN)) &&
      !podeDesfazer({ ...fimAuto, fimMotivo: 'manual' }, 'beta', new Date(T0 + MIN)) &&
      !podeDesfazer(fimAuto, 'outra', new Date(T0 + MIN)) &&
      !podeDesfazer(fimAuto, 'beta', new Date(T0 + TEMPOS.desfazerMs + MIN)),
    '"Desfazer" só no fim automático, para quem operou, nas últimas 12 h (RF-050)'
  );

  // Sugestão de etapa (RF-059)
  const areas = [
    { areaId: 't3', nome: 'Talhão 3', tipo: 'lavoura' as const, segundos: 52 * 60 },
    { areaId: 'p2', nome: 'Pasto 2', tipo: 'pasto' as const, segundos: 18 * 60 },
  ];
  const pendentes = [
    { areaId: 't3', etapa: { id: 'e1', nome: 'Adubação de cobertura', previstaEm: new Date(2026, 10, 14) } },
    { areaId: 't3', etapa: { id: 'e2', nome: 'Pulverização', previstaEm: new Date(2026, 10, 24) } },
  ];
  const dia = new Date(T0);
  const sugestao = sugestaoDeEtapa({ dia, atividade: null, tipos: ['pulverizador'], areas, pendentes });
  check(
    sugestao?.etapa.nome === 'Pulverização' && sugestao.areaNome === 'Talhão 3',
    'tela 25: "Passou no Talhão 3: marcar Pulverização como feita?"'
  );
  check(
    sugestaoDeEtapa({ dia, atividade: 'trato', tipos: ['trator'], areas, pendentes })?.etapa.nome ===
      'Adubação de cobertura',
    'trator em "trato" sugere a adubação'
  );
  check(
    sugestaoDeEtapa({ dia, atividade: 'transporte', tipos: ['trator'], areas, pendentes }) === null,
    'transporte não sugere etapa'
  );
  check(
    sugestaoDeEtapa({ dia, atividade: null, tipos: ['pulverizador'], areas: [{ ...areas[0], segundos: 120 }], pendentes }) ===
      null,
    'só atravessou a lavoura (menos de 5 min): nada'
  );
  check(
    sugestaoDeEtapa({ dia: new Date(2026, 9, 1), atividade: null, tipos: ['pulverizador'], areas, pendentes }) === null,
    'etapa prevista longe do dia do uso: nada'
  );

  // Saiu da divisa da fazenda (RF-049)
  const fazenda = poligono(-200, 1200, -200, 600);
  const dentro = reta(60, 0, 900, 100, T0);
  const ultimoDentro = dentro[dentro.length - 1].em;
  const fora = reta(140, 1300, 3000, 100, ultimoDentro + 5 * SEG);
  check(
    fimPorSaidaDaFazenda([...dentro, ...fora], fazenda) === ultimoDentro,
    'mais de 10 min fora da divisa: encerra no último ponto dentro'
  );
  const situacao = {
    inicio: T0,
    agora: fora[fora.length - 1].em,
    estacionario: false,
    velocidadeMaxKmh: null,
    pontos: [...dentro, ...fora],
    pausaDesde: null,
    paradaAvisadaEm: null,
    continuaAte: null,
  };
  const decisao = decidirAutomacao({ ...situacao, fazenda });
  check(decisao.tipo === 'encerrar' && decisao.motivo === 'fora', 'a automação encerra com o motivo "fora"');
  check(
    fimPorSaidaDaFazenda([...dentro, ...fora.slice(0, 60)], fazenda) === null,
    'só 5 min fora (a estrada entre dois pedaços): continua'
  );
  check(fimPorSaidaDaFazenda(fora, fazenda) === null, 'ligou fora da fazenda: a regra não vale');
  check(decidirAutomacao(situacao).tipo === 'nada', 'sem divisa marcada, não há regra de saída');
}

async function banco() {
  await initTestDatabase();
  const talhao3 = await criarTalhao({ nome: 'Talhão 3', tipo: 'lavoura', coordenadas: retangulo(0, 500, 0, 300) });
  const pasto2 = await criarTalhao({ nome: 'Pasto 2', tipo: 'pasto', coordenadas: retangulo(600, 900, 0, 300) });
  const pulverizador = await cadastrarMaquina({ codigo: 'PU-01', nome: 'Pulverizador', tipo: 'pulverizador' });
  const trator = await cadastrarMaquina({ codigo: 'TR-01', nome: 'Trator 1', tipo: 'trator' });

  // Sessão: 30 min no Talhão 3, vai ao Pasto 2 e fica 15 min, encerrada pela regra de parada
  const uso = await iniciarUso(pulverizador.id, { rastreado: true, atividade: 'pulverizacao' }, new Date(T0));
  const noTalhao = vaiEVolta(360, 20, 480, 150, 1.5, T0);
  const ida = reta(20, 480, 700, 150, noTalhao[noTalhao.length - 1].em + 5 * SEG);
  const noPasto = vaiEVolta(180, 620, 880, 150, 1.5, ida[ida.length - 1].em + 5 * SEG);
  await gravarPontos(uso.id, [...noTalhao, ...ida, ...noPasto]);
  const fimAuto = new Date(noPasto[noPasto.length - 1].em);
  const fechado = await fecharUso(uso, { fim: fimAuto, motivo: 'parada' });
  check(fechado.uso?.fimMotivo === 'parada' && (fechado.uso.kmTotal ?? 0) > 3, 'fim automático grava o resumo do rastro');

  const porArea = await db.select().from(usosArea).where(eq(usosArea.usoId, uso.id));
  const segundosTalhao = porArea.find((a) => a.areaId === talhao3.id)?.segundos ?? 0;
  const segundosPasto = porArea.find((a) => a.areaId === pasto2.id)?.segundos ?? 0;
  check(
    porArea.length === 2 && segundosTalhao > 25 * 60 && segundosPasto > 12 * 60,
    'tempo e KM por área numa tabela própria (RF-057): Talhão 3 e Pasto 2'
  );
  const pontosGuardados = await db.select().from(pontosGps).where(eq(pontosGps.usoId, uso.id));
  check(pontosGuardados.length > 0, 'fim automático guarda os pontos (para o "Desfazer")');

  const sessao = await sessaoCompleta(uso.id);
  check(
    sessao?.maquina.nome === 'Pulverizador' && sessao.areas[0].nome === 'Talhão 3' && sessao.areas[1].tipo === 'pasto',
    'resumo da sessão: máquina e as áreas, da que teve mais tempo (tela 25)'
  );
  const { desde, ate } = intervaloDoPeriodo('hoje', new Date(T0));
  const trajetos = await trajetosDoPeriodo(desde, ate);
  check(
    trajetos.length === 1 && trajetos[0].maquinaNome === 'Pulverizador' && (trajetos[0].rastro?.length ?? 0) > 1,
    'camada Trajetos: os usos com rastro do dia (RF-060)'
  );
  check(
    (await trajetosDoPeriodo(intervaloDoPeriodo('ontem', new Date(T0)).desde, desde)).length === 0,
    'ontem: nenhum trajeto'
  );
  const daArea = await usosDaArea(talhao3.id);
  check(
    daArea.length === 1 && daArea[0].maquinaNome === 'Pulverizador' && (await segundosNaAreaDesde(talhao3.id, desde)) === segundosTalhao,
    'painel da área: usos que passaram nela e as horas de hoje (RF-066)'
  );
  const posicoes = await ultimasPosicoes();
  const doPulverizador = posicoes.find((p) => p.maquinaId === pulverizador.id);
  check(
    doPulverizador?.em.getTime() === fimAuto.getTime() && !doPulverizador.emUso && posicoes.length === 1,
    'última posição de cada máquina com o horário (RF-064)'
  );

  // Ciclo no Talhão 3 com a pulverização pendente: a sessão sugere marcar (RF-059)
  const milho = MODELOS_PRONTOS[0];
  const plantio = new Date(2026, 9, 20);
  await iniciarCiclo({
    areaId: talhao3.id,
    cultura: milho.nome,
    modeloId: milho.id,
    dataPlantio: plantio,
    areaHa: talhao3.areaHectares,
    taxaKgHa: 20,
    sacoKg: 20,
    sementesKg: 1,
    sacos: 1,
    etapas: etapasDoInicio(linhaDoTempoPrevista(milho.etapas, plantio), plantio, new Date(T0)),
  });
  const pendentes = await etapasPendentesNasAreas(sessao!.areas.map((a) => a.areaId));
  const sugestao = sugestaoDeEtapa({
    dia: new Date(T0),
    atividade: sessao!.uso.atividade,
    tipos: [sessao!.maquina.tipo],
    areas: sessao!.areas,
    pendentes,
  });
  check(sugestao?.etapa.nome === 'Pulverização' && sugestao.areaId === talhao3.id, 'sugere marcar a pulverização do Talhão 3');

  // Desfazer: volta a correr, sem perder o rastro de antes
  const kmAntes = fechado.uso?.kmTotal ?? 0;
  const reaberto = await reabrirUso(uso.id, new Date(fimAuto.getTime() + 5 * MIN));
  check(
    reaberto.fim === null && reaberto.regrasDesde?.getTime() === fimAuto.getTime() + 5 * MIN && reaberto.kmTotal === null,
    '"Desfazer" reabre o uso e as regras recomeçam dali (RF-050)'
  );
  check(
    (await db.select().from(usosArea).where(and(eq(usosArea.usoId, uso.id), isNull(usosArea.deletedAt)))).length === 0,
    'reaberto: o "por área" sai até encerrar de novo'
  );
  await gravarPontos(uso.id, vaiEVolta(24, 620, 880, 150, 1.5, fimAuto.getTime() + 6 * MIN));
  const manual = await encerrarUso(pulverizador.id, { fim: new Date(fimAuto.getTime() + 8 * MIN) });
  check(
    (manual.uso?.kmTotal ?? 0) > kmAntes &&
      (await db.select().from(pontosGps).where(eq(pontosGps.usoId, uso.id))).length === 0 &&
      (await db.select().from(usosArea).where(and(eq(usosArea.usoId, uso.id), isNull(usosArea.deletedAt)))).length === 2,
    'encerrado na mão depois do "Desfazer": rastro inteiro, pontos apagados, por área de volta'
  );
  check(
    (await rejeita(() => reabrirUso(uso.id))) === 'Só dá para desfazer um encerramento feito pelo app.',
    'encerramento feito pela pessoa não é desfeito'
  );

  // Uso novo apaga os pontos guardados dos anteriores; depois dele, o antigo não reabre
  const segundo = await iniciarUso(pulverizador.id, { rastreado: true }, new Date(T0 + 3 * 60 * MIN));
  await gravarPontos(segundo.id, reta(30, 0, 400, 100, T0 + 3 * 60 * MIN));
  await fecharUso(segundo, { fim: new Date(T0 + 3 * 60 * MIN + 150 * SEG), motivo: 'velocidade' });
  await iniciarUso(trator.id, { rastreado: true }, new Date(T0 + 4 * 60 * MIN));
  check(
    (await db.select().from(pontosGps).where(eq(pontosGps.usoId, segundo.id))).length === 0,
    'ligar outra máquina apaga os pontos guardados dos usos anteriores da pessoa'
  );
  check(
    (await rejeita(() => reabrirUso(segundo.id, new Date(T0 + 4 * 60 * MIN + MIN)))) ===
      'Você já ligou outra máquina depois deste uso.',
    'depois de ligar outra máquina, o fim automático anterior não volta'
  );
  await encerrarUso(trator.id, { fim: new Date(T0 + 4 * 60 * MIN + 2 * MIN) });

  // Pontos de usos fechados há mais de 12 h saem na abertura do app
  const terceiro = await iniciarUso(trator.id, { rastreado: true }, new Date(T0 + 5 * 60 * MIN));
  await gravarPontos(terceiro.id, reta(30, 0, 400, 100, T0 + 5 * 60 * MIN));
  await fecharUso(terceiro, { fim: new Date(T0 + 5 * 60 * MIN + 150 * SEG), motivo: 'parada' });
  await limparPontosAntigos(new Date(T0 + 5 * 60 * MIN + MIN));
  check(
    (await db.select().from(pontosGps).where(eq(pontosGps.usoId, terceiro.id))).length > 0,
    'dentro das 12 h os pontos ficam'
  );
  await limparPontosAntigos(new Date(T0 + 5 * 60 * MIN + TEMPOS.desfazerMs + 10 * MIN));
  check(
    (await db.select().from(pontosGps).where(eq(pontosGps.usoId, terceiro.id))).length === 0,
    'passadas 12 h, os pontos do uso saem'
  );

  check(usuarioAtual().id === reaberto.operadorId, 'o uso é de quem está com o celular');

}

async function runTrajetosMapaTest() {
  console.log('🚜 MINHA FAZENDA - TRAJETOS DAS MÁQUINAS (FASE 5)\n');
  regrasPuras();
  await banco();
  console.log('\n🎉 TRAJETOS DAS MÁQUINAS OK!');
}

runTrajetosMapaTest().then(fecharTestDatabase).catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
