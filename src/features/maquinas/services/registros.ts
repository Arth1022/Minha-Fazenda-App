import type {
  AtividadeUso,
  LeituraHorimetro,
  Maquina,
  OcorrenciaMaquina,
  UsoMaquina,
} from '@/dtos';
import { formatNumero } from '@/utils/formatters';

/**
 * Regras dos registros feitos pelo QR: abastecimento, horímetro, problema e as
 * sugestões ao ligar. Barram erro de digitação na hora; o que é estranho mas
 * possível pede confirmação em vez de bloquear.
 */

/** Resultado de uma conferência: ok, pedir confirmação ou recusar. */
export type Conferencia = { tipo: 'ok' } | { tipo: 'confirmar'; mensagem: string } | { tipo: 'erro'; mensagem: string };

const OK: Conferencia = { tipo: 'ok' };
const HORA_MS = 60 * 60 * 1000;

export function conferirAbastecimento(litros: number, tanqueLitros: number | null): Conferencia {
  if (!(litros > 0)) return { tipo: 'erro', mensagem: 'Informe quantos litros foram abastecidos.' };
  if (tanqueLitros && litros > tanqueLitros) {
    return {
      tipo: 'confirmar',
      mensagem: `O tanque tem ${formatNumero(tanqueLitros)} L — confirmar ${formatNumero(litros)} L?`,
    };
  }
  return OK;
}

/** Diferença tolerada entre a leitura e o esperado: 2 h ou 10% das horas desde a referência. */
function tolerancia(horasDesdeAReferencia: number): number {
  return Math.max(2, horasDesdeAReferencia * 0.1);
}

/**
 * Horímetro esperado agora: a última leitura (ou o do cadastro) mais as horas de
 * uso registradas no app desde então. Null sem referência.
 */
export function horimetroEstimado(
  referencia: { valorH: number; em: Date } | null,
  usos: Pick<UsoMaquina, 'inicio' | 'fim'>[],
  agora: Date
): number | null {
  if (!referencia) return null;
  const desde = referencia.em.getTime();
  const horasDepois = usos.reduce((soma, uso) => {
    const inicio = Math.max(uso.inicio.getTime(), desde);
    const fim = (uso.fim ?? agora).getTime();
    return soma + Math.max(0, fim - inicio) / HORA_MS;
  }, 0);
  return referencia.valorH + horasDepois;
}

/**
 * Confere a leitura digitada: não pode ser menor que a anterior nem passar do que
 * o relógio permite desde ela; longe do esperado, pergunta se confere.
 */
export function conferirHorimetro(
  valorH: number,
  anterior: Pick<LeituraHorimetro, 'valorH' | 'lidoEm'> | null,
  estimadoH: number | null,
  agora: Date
): Conferencia {
  if (!(valorH >= 0)) return { tipo: 'erro', mensagem: 'Informe o número que aparece no horímetro.' };
  if (anterior) {
    if (valorH < anterior.valorH) {
      return {
        tipo: 'erro',
        mensagem: `A última leitura foi ${formatNumero(anterior.valorH)} h: o horímetro não volta.`,
      };
    }
    const horasNoRelogio = (agora.getTime() - anterior.lidoEm.getTime()) / HORA_MS;
    if (valorH - anterior.valorH > horasNoRelogio + 0.5) {
      return {
        tipo: 'erro',
        mensagem: `Desde a última leitura (${formatNumero(anterior.valorH)} h) passaram só ${formatNumero(horasNoRelogio)} h no relógio.`,
      };
    }
  }
  // A folga cresce com as horas desde a última leitura (10%), não com o horímetro todo
  const horasEstimadas = estimadoH !== null && anterior ? Math.max(0, estimadoH - anterior.valorH) : 0;
  if (estimadoH !== null && Math.abs(valorH - estimadoH) > tolerancia(horasEstimadas)) {
    return {
      tipo: 'confirmar',
      mensagem: `Esperado perto de ${formatNumero(estimadoH, 0)} h — confere?`,
    };
  }
  return OK;
}

/** Situação da máquina para a tela: os problemas em aberto mandam. */
export type CondicaoMaquina = 'ok' | 'atencao' | 'paradaPorProblema' | 'manutencao' | 'inativa';

export function condicaoDaMaquina(
  maquina: Pick<Maquina, 'status'>,
  problemasAbertos: Pick<OcorrenciaMaquina, 'podeUsar' | 'resolvidaEm'>[]
): CondicaoMaquina {
  if (maquina.status === 'inativa') return 'inativa';
  const abertos = problemasAbertos.filter((p) => p.resolvidaEm === null);
  if (abertos.some((p) => !p.podeUsar)) return 'paradaPorProblema';
  if (maquina.status === 'manutencao') return 'manutencao';
  return abertos.length > 0 ? 'atencao' : 'ok';
}

export interface SugestoesAoLigar {
  implementoId: string | null;
  atividade: AtividadeUso | null;
}

/** Ao ligar, sugere o implemento e a atividade do último uso desta máquina. */
export function sugestoesAoLigar(usosRecentes: Pick<UsoMaquina, 'implementoId' | 'atividade'>[]): SugestoesAoLigar {
  const ultimo = usosRecentes[0];
  return { implementoId: ultimo?.implementoId ?? null, atividade: ultimo?.atividade ?? null };
}
