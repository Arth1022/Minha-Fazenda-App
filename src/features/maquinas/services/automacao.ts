import { distanciaM } from './geo';
import { TEMPOS } from './padroes';
import { limparPontos, trechoAndou, ultimoMovimento, type PontoLido } from './rastro';

/**
 * Saídas automáticas para os esquecimentos comuns durante o uso, decididas a cada
 * leitura do GPS, no próprio celular. O fim automático é sempre a hora do último
 * movimento (ou da última resposta), nunca a hora em que o app percebeu: assim
 * um esquecimento não infla as horas.
 */

export interface SituacaoDoUso {
  inicio: number;
  agora: number;
  /** Trabalho parado (TDP) ou máquina fixa: não encerra por ficar parada */
  estacionario: boolean;
  /** Velocidade máxima da máquina (km/h); null não confere */
  velocidadeMaxKmh: number | null;
  /** Pontos recentes (bastam os da última hora e pouco) */
  pontos: PontoLido[];
  /** Início da pausa em aberto; null fora de pausa */
  pausaDesde: number | null;
  /** Quando saiu o último aviso "Parada há 20 min" */
  paradaAvisadaEm: number | null;
  /** Respondeu "Continua": não pergunta até esta hora */
  continuaAte: number | null;
}

export type DecisaoAutomatica =
  | { tipo: 'nada' }
  /** Pergunta "Parada há 20 min": Pausa, Continua ou Encerrar */
  | { tipo: 'avisarParada'; paradaDesde: number }
  /** A máquina andou durante a pausa: a pausa acaba sozinha */
  | { tipo: 'retomar'; em: number }
  | { tipo: 'encerrar'; fim: number; motivo: 'parada' | 'pausa' | 'velocidade' };

/**
 * Celular fora da máquina: os pontos mais recentes, por mais de 1 min, acima da
 * velocidade máxima. Devolve a hora do último ponto compatível, ou null.
 */
export function fimPorVelocidade(pontos: PontoLido[], maxKmh: number): number | null {
  const limpos = limparPontos(pontos);
  let i = limpos.length - 1;
  // Volta enquanto os trechos estão acima do máximo
  while (i > 0) {
    const a = limpos[i - 1];
    const b = limpos[i];
    const velocidade = (distanciaM(a, b) / Math.max(1, b.em - a.em)) * 3600;
    if (velocidade <= maxKmh) break;
    i--;
  }
  const ultimoCompativel = limpos[i];
  const ultimo = limpos[limpos.length - 1];
  if (!ultimoCompativel || !ultimo || i === limpos.length - 1) return null;
  return ultimo.em - ultimoCompativel.em >= TEMPOS.excessoVelocidadeMs ? ultimoCompativel.em : null;
}

/** A máquina andou depois de `desde`? (algum trecho que passou do tremor do GPS) */
function andouDesde(pontos: PontoLido[], desde: number): number | null {
  const limpos = limparPontos(pontos).filter((p) => p.em >= desde);
  for (let i = 1; i < limpos.length; i++) {
    if (trechoAndou(limpos[i - 1], limpos[i])) return limpos[i].em;
  }
  return null;
}

export function decidirAutomacao(s: SituacaoDoUso): DecisaoAutomatica {
  // 1. Celular saiu da máquina (ex.: foi embora de carro)
  if (s.velocidadeMaxKmh !== null && !s.estacionario) {
    const fim = fimPorVelocidade(s.pontos, s.velocidadeMaxKmh);
    if (fim !== null) return { tipo: 'encerrar', fim, motivo: 'velocidade' };
  }

  // 2. Em pausa: volta sozinha se andar; passou de 3 h, encerra
  if (s.pausaDesde !== null) {
    const andou = andouDesde(s.pontos, s.pausaDesde);
    if (andou !== null) return { tipo: 'retomar', em: andou };
    if (s.agora - s.pausaDesde >= TEMPOS.pausaMaximaMs) {
      const movimento = ultimoMovimento(s.pontos);
      const fim = movimento !== null && movimento <= s.pausaDesde ? movimento : s.pausaDesde;
      return { tipo: 'encerrar', fim: Math.max(s.inicio, fim), motivo: 'pausa' };
    }
    return { tipo: 'nada' };
  }

  // 3. Parada: "Continua" adia a pergunta; trabalho parado só pergunta de tempos em tempos
  const ultimaResposta = s.continuaAte !== null ? s.continuaAte - TEMPOS.continuaMs : null;
  if (s.continuaAte !== null && s.agora < s.continuaAte) return { tipo: 'nada' };

  if (s.estacionario) {
    const proximaPergunta = s.continuaAte ?? s.inicio + TEMPOS.continuaMs;
    const jaPerguntou = s.paradaAvisadaEm !== null && s.paradaAvisadaEm >= proximaPergunta;
    return s.agora >= proximaPergunta && !jaPerguntou
      ? { tipo: 'avisarParada', paradaDesde: proximaPergunta }
      : { tipo: 'nada' };
  }

  const paradaDesde = Math.max(s.inicio, ultimoMovimento(s.pontos) ?? s.inicio);
  // Depois de "Continua", a contagem recomeça de modo que a pergunta volte na hora
  const base = Math.max(paradaDesde, s.continuaAte !== null ? s.continuaAte - TEMPOS.avisoParadaMs : 0);
  const parado = s.agora - base;

  if (parado >= TEMPOS.encerraParadaMs) {
    const fim = Math.max(paradaDesde, ultimaResposta ?? 0);
    return { tipo: 'encerrar', fim, motivo: 'parada' };
  }
  const avisoPendente = s.paradaAvisadaEm !== null && s.paradaAvisadaEm >= base;
  if (parado >= TEMPOS.avisoParadaMs && !avisoPendente) {
    return { tipo: 'avisarParada', paradaDesde };
  }
  return { tipo: 'nada' };
}
