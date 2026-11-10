import type { PontoRastro, UsoNoTalhao } from '@/dtos';

import { distanciaM, dentroDoPoligono, simplificarLinha, type Poligono } from './geo';
import { GPS, TEMPOS } from './padroes';

/**
 * Resumo do uso a partir dos pontos de GPS: KM, tempo trabalhando, deslocando,
 * parada, em pausa e sem sinal, KM e tempo por talhão, área estimada e a
 * qualidade do registro. Tudo calculado no celular, sem internet.
 */

/** Ponto como veio do GPS (o tempo em ms desde 1970). */
export interface PontoLido {
  lat: number;
  lng: number;
  precisaoM: number | null;
  velocidadeMs: number | null;
  simulado: boolean;
  em: number;
}

export interface Intervalo {
  inicio: number;
  /** null = ainda aberto (conta até o fim do uso) */
  fim: number | null;
}

export interface TalhaoDoRastro extends Poligono {
  id: string;
  nome: string;
}

export type EstadoTrecho = 'trabalhando' | 'deslocando' | 'parada';

/** Velocidade que nenhuma máquina da fazenda alcança: ponto que exige isso é erro do GPS. */
const VELOCIDADE_IMPOSSIVEL_KMH = 150;
/** Erro aceito ao simplificar o rastro guardado */
const TOLERANCIA_RASTRO_M = 3;

const kmh = (metros: number, ms: number) => (ms <= 0 ? 0 : (metros / ms) * 3600);

/**
 * Tira os pontos ruins antes de somar: precisão pior que 25 m e salto isolado
 * (um ponto que exigiria velocidade impossível para ir e voltar). Ordena por hora.
 */
export function limparPontos(pontos: PontoLido[]): PontoLido[] {
  const precisos = [...pontos]
    .filter((p) => p.precisaoM === null || p.precisaoM <= GPS.precisaoMaximaM)
    .sort((a, b) => a.em - b.em);
  return precisos.filter((p, i) => {
    const antes = precisos[i - 1];
    const depois = precisos[i + 1];
    if (!antes || !depois) return true;
    const ida = kmh(distanciaM(antes, p), p.em - antes.em);
    const volta = kmh(distanciaM(p, depois), depois.em - p.em);
    return !(ida > VELOCIDADE_IMPOSSIVEL_KMH && volta > VELOCIDADE_IMPOSSIVEL_KMH);
  });
}

/** O trecho entre dois pontos andou de verdade (passou do "tremor" do GPS parado)? */
export function trechoAndou(a: PontoLido, b: PontoLido): boolean {
  const metros = distanciaM(a, b);
  return metros >= GPS.deslocamentoMinimoM && kmh(metros, b.em - a.em) >= GPS.velocidadeParadaKmh;
}

/** Hora do último movimento (fim do último trecho que andou); null se não andou. */
export function ultimoMovimento(pontos: PontoLido[]): number | null {
  const limpos = limparPontos(pontos);
  for (let i = limpos.length - 1; i > 0; i--) {
    if (trechoAndou(limpos[i - 1], limpos[i])) return limpos[i].em;
  }
  return null;
}

/** KM somados nos trechos que andaram (já limpos). */
export function kmAndados(pontos: PontoLido[]): number {
  const limpos = limparPontos(pontos);
  let metros = 0;
  for (let i = 1; i < limpos.length; i++) {
    if (trechoAndou(limpos[i - 1], limpos[i])) metros += distanciaM(limpos[i - 1], limpos[i]);
  }
  return metros / 1000;
}

export interface OpcoesResumo {
  inicio: number;
  fim: number;
  pausas: Intervalo[];
  talhoes: TalhaoDoRastro[];
  /** Faixa de trabalho (km/h); null = a máquina só se desloca (caminhão) */
  faixaTrabalhoKmh: [number, number] | null;
  /** Largura do implemento (m), para a área; null sem implemento */
  larguraM: number | null;
}

export interface ResumoRastro {
  kmTotal: number;
  kmTrabalhando: number;
  segTrabalhando: number;
  segDeslocando: number;
  segParada: number;
  segPausa: number;
  segSemSinal: number;
  /** Fração do tempo de uso (fora as pausas) coberta por pontos válidos */
  qualidade: number;
  areaEstimadaHa: number | null;
  talhoes: UsoNoTalhao[];
  rastro: PontoRastro[];
  localizacaoSimulada: boolean;
}

/** Talhão em que o ponto está (o primeiro que contém). */
export function talhaoDoPonto(p: { lat: number; lng: number }, talhoes: TalhaoDoRastro[]): TalhaoDoRastro | null {
  return talhoes.find((t) => dentroDoPoligono(p, t)) ?? null;
}

function emPausa(instante: number, pausas: Intervalo[], fimDoUso: number): boolean {
  return pausas.some((p) => instante >= p.inicio && instante < (p.fim ?? fimDoUso));
}

/** Área (ha) = KM trabalhando × largura do implemento (m) ÷ 10. */
export function areaEstimadaHa(kmTrabalhando: number, larguraM: number | null): number | null {
  return larguraM && larguraM > 0 ? (kmTrabalhando * larguraM) / 10 : null;
}

export function resumirRastro(pontos: PontoLido[], opcoes: OpcoesResumo): ResumoRastro {
  const { inicio, fim, pausas, talhoes, faixaTrabalhoKmh, larguraM } = opcoes;
  const validos = limparPontos(pontos).filter((p) => p.em >= inicio && p.em <= fim);

  const ms = { trabalhando: 0, deslocando: 0, parada: 0, pausa: 0, semSinal: 0 };
  let metrosTotal = 0;
  let metrosTrabalhando = 0;
  let msComSinal = 0;
  const porTalhao = new Map<string, { nome: string; metros: number; metrosTrabalhando: number; ms: number }>();

  /** Tempo sem trecho de GPS (antes do 1º ponto, depois do último ou num buraco). */
  const tempoSemTrecho = (de: number, ate: number) => {
    const duracao = ate - de;
    if (duracao <= 0) return;
    if (emPausa((de + ate) / 2, pausas, fim)) ms.pausa += duracao;
    else if (duracao > TEMPOS.semSinalMs) ms.semSinal += duracao;
    else ms.parada += duracao;
  };

  tempoSemTrecho(inicio, validos[0]?.em ?? fim);
  for (let i = 1; i < validos.length; i++) {
    const a = validos[i - 1];
    const b = validos[i];
    const duracao = b.em - a.em;
    // Buraco no sinal: o tempo conta, mas o trecho fica "sem sinal" e não soma KM
    if (duracao > TEMPOS.semSinalMs) {
      tempoSemTrecho(a.em, b.em);
      continue;
    }
    if (emPausa((a.em + b.em) / 2, pausas, fim)) {
      ms.pausa += duracao;
      continue;
    }
    msComSinal += duracao;
    const meio = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
    const talhao = talhaoDoPonto(meio, talhoes);
    let estado: EstadoTrecho = 'parada';
    let metros = 0;
    if (trechoAndou(a, b)) {
      metros = distanciaM(a, b);
      const velocidade = kmh(metros, duracao);
      const trabalhando =
        talhao !== null &&
        faixaTrabalhoKmh !== null &&
        velocidade >= faixaTrabalhoKmh[0] &&
        velocidade <= faixaTrabalhoKmh[1];
      estado = trabalhando ? 'trabalhando' : 'deslocando';
    }
    ms[estado] += duracao;
    metrosTotal += metros;
    if (estado === 'trabalhando') metrosTrabalhando += metros;
    if (talhao) {
      const acumulado = porTalhao.get(talhao.id) ?? { nome: talhao.nome, metros: 0, metrosTrabalhando: 0, ms: 0 };
      acumulado.metros += metros;
      acumulado.ms += duracao;
      if (estado === 'trabalhando') acumulado.metrosTrabalhando += metros;
      porTalhao.set(talhao.id, acumulado);
    }
  }
  tempoSemTrecho(validos[validos.length - 1]?.em ?? fim, fim);

  const tempoUtil = fim - inicio - ms.pausa;
  const segundos = (valor: number) => Math.round(valor / 1000);
  return {
    kmTotal: metrosTotal / 1000,
    kmTrabalhando: metrosTrabalhando / 1000,
    segTrabalhando: segundos(ms.trabalhando),
    segDeslocando: segundos(ms.deslocando),
    segParada: segundos(ms.parada),
    segPausa: segundos(ms.pausa),
    segSemSinal: segundos(ms.semSinal),
    qualidade: tempoUtil > 0 ? Math.min(1, msComSinal / tempoUtil) : validos.length > 0 ? 1 : 0,
    areaEstimadaHa: areaEstimadaHa(metrosTrabalhando / 1000, larguraM),
    talhoes: [...porTalhao.entries()]
      .map(([talhaoId, t]) => ({
        talhaoId,
        nome: t.nome,
        km: t.metros / 1000,
        segundos: segundos(t.ms),
        areaHa: areaEstimadaHa(t.metrosTrabalhando / 1000, larguraM),
      }))
      .sort((a, b) => b.segundos - a.segundos),
    rastro: simplificarLinha(validos, TOLERANCIA_RASTRO_M).map(
      (p): PontoRastro => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]
    ),
    localizacaoSimulada: pontos.some((p) => p.simulado),
  };
}

/** Uso ligado sem querer: menos de 1 min e quase sem andar. */
export function deveDescartar(duracaoMs: number, kmTotal: number | null): boolean {
  return duracaoMs < TEMPOS.descarteMs && (kmTotal === null || kmTotal * 1000 < GPS.descarteM);
}

export interface EstadoAgora {
  estado: EstadoTrecho | 'semSinal';
  talhao: string | null;
}

/** Como a máquina está agora, pelo último trecho: para a tela Em uso. */
export function estadoAgora(
  pontos: PontoLido[],
  talhoes: TalhaoDoRastro[],
  faixaTrabalhoKmh: [number, number] | null,
  agora: number
): EstadoAgora {
  const limpos = limparPontos(pontos);
  const b = limpos[limpos.length - 1];
  const a = limpos[limpos.length - 2];
  if (!b || agora - b.em > TEMPOS.semSinalMs) return { estado: 'semSinal', talhao: null };
  const talhao = talhaoDoPonto(b, talhoes)?.nome ?? null;
  if (!a || !trechoAndou(a, b)) return { estado: 'parada', talhao };
  const velocidade = kmh(distanciaM(a, b), b.em - a.em);
  const trabalhando =
    talhao !== null &&
    faixaTrabalhoKmh !== null &&
    velocidade >= faixaTrabalhoKmh[0] &&
    velocidade <= faixaTrabalhoKmh[1];
  return { estado: trabalhando ? 'trabalhando' : 'deslocando', talhao };
}
