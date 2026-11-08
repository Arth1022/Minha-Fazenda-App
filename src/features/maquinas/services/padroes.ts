import type { AtividadeUso, CategoriaMaquina, Maquina, TipoMaquina } from '@/dtos';

/**
 * Padrões da auditoria de máquinas, num lugar só. Pensados para pequeno e médio
 * produtor: funcionam sem configurar nada; o dono poderá ajustar depois.
 */

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

/** Tempos das regras automáticas durante o uso. */
export const TEMPOS = {
  /** Um ponto de GPS a cada 5 s, inclusive parado */
  intervaloGpsMs: 5 * 1000,
  /** Parada (abaixo de 1 km/h) por este tempo: pergunta "Pausa, Continua ou Encerrar?" */
  avisoParadaMs: 20 * MINUTO,
  /** Parada sem resposta até aqui: encerra na hora do último movimento */
  encerraParadaMs: 60 * MINUTO,
  /** Respondeu "Continua" (ou trabalho parado pela TDP): pergunta de novo depois disto */
  continuaMs: 2 * HORA,
  /** Pausa mais longa que isto: encerra */
  pausaMaximaMs: 3 * HORA,
  /** Acima da velocidade máxima por este tempo: o celular saiu da máquina */
  excessoVelocidadeMs: 1 * MINUTO,
  /** Sem ponto válido por mais que isto: o trecho fica "sem sinal" */
  semSinalMs: 2 * MINUTO,
  /** Uso mais curto que isto (e quase sem andar) foi ligado sem querer: é descartado */
  descarteMs: 1 * MINUTO,
};

/** Limpeza do GPS antes de somar KM. */
export const GPS = {
  /** Ponto com precisão pior que isto é descartado */
  precisaoMaximaM: 25,
  /** Parado, o GPS "treme": só conta deslocamento acima disto */
  deslocamentoMinimoM: 5,
  /** Abaixo disto é parada */
  velocidadeParadaKmh: 1,
  /** Uso que andou menos que isto (e durou menos de 1 min) é descartado */
  descarteM: 30,
};

/** Implementos não têm motor: o uso deles vem da máquina em que foram engatados. */
const TIPOS_IMPLEMENTO: readonly TipoMaquina[] = ['plantadeira', 'implemento'];

export function categoriaDoTipo(tipo: TipoMaquina): CategoriaMaquina {
  return TIPOS_IMPLEMENTO.includes(tipo) ? 'implemento' : 'motorizada';
}

export function ehImplemento(maquina: Pick<Maquina, 'categoria'>): boolean {
  return maquina.categoria === 'implemento';
}

interface Velocidades {
  /** Acima disto, o celular não está na máquina (km/h) */
  maxKmh: number;
  /** Faixa de trabalho no talhão (km/h); null = não trabalha andando (só desloca) */
  trabalho: [number, number] | null;
}

const VELOCIDADES: Record<TipoMaquina, Velocidades> = {
  trator: { maxKmh: 40, trabalho: [2, 15] },
  colheitadeira: { maxKmh: 30, trabalho: [2, 12] },
  pulverizador: { maxKmh: 40, trabalho: [4, 25] },
  plantadeira: { maxKmh: 40, trabalho: [2, 15] },
  implemento: { maxKmh: 40, trabalho: [2, 15] },
  caminhao: { maxKmh: 120, trabalho: null },
  utilitario: { maxKmh: 120, trabalho: null },
  ordenhadeira: { maxKmh: 20, trabalho: null },
  outro: { maxKmh: 60, trabalho: [2, 15] },
};

/** Velocidade máxima da máquina: a do cadastro ou a padrão do tipo. */
export function velocidadeMaxKmh(maquina: Pick<Maquina, 'tipo' | 'velocidadeMaxKmh'>): number {
  return maquina.velocidadeMaxKmh ?? VELOCIDADES[maquina.tipo].maxKmh;
}

export function faixaDeTrabalhoKmh(tipo: TipoMaquina): [number, number] | null {
  return VELOCIDADES[tipo].trabalho;
}

/** Máquina que trabalha parada (ordenhadeira, gerador): não encerra por ficar parada. */
const TIPOS_ESTACIONARIOS: readonly TipoMaquina[] = ['ordenhadeira'];

/** Uso que não anda: trabalho pela TDP ou máquina fixa. */
export function usoEstacionario(tipo: TipoMaquina, atividade: AtividadeUso | null): boolean {
  return atividade === 'parado' || TIPOS_ESTACIONARIOS.includes(tipo);
}
