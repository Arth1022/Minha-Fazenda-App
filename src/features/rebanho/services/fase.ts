import type { Sexo } from '@/database';
import { diasEntre } from '@/utils/date';

export type FaseFemea = 'bezerra' | 'novilha' | 'vaca';
export type FaseMacho = 'bezerro' | 'garrote' | 'touro';
export type Fase = FaseFemea | FaseMacho;
export type SituacaoLeite = 'lactacao' | 'seca';

/** Até esta idade (exclusive) o animal é bezerra/bezerro. */
export const IDADE_FIM_CRIA_MESES = 12;
/** A partir desta idade o macho é touro e a fêmea sem parto registrado vira vaca. */
export const IDADE_ADULTO_MESES = 24;
/** Duração padrão de uma lactação: depois disso a vaca é considerada seca. */
export const DURACAO_LACTACAO_DIAS = 305;

export const FASE_LABEL: Record<Fase, string> = {
  bezerra: 'Bezerra',
  novilha: 'Novilha',
  vaca: 'Vaca',
  bezerro: 'Bezerro',
  garrote: 'Garrote',
  touro: 'Touro',
};

export const FASES: Fase[] = ['bezerra', 'novilha', 'vaca', 'bezerro', 'garrote', 'touro'];

export const SITUACAO_LEITE_LABEL: Record<SituacaoLeite, string> = {
  lactacao: 'Em lactação',
  seca: 'Seca',
};

export interface DadosFase {
  sexo: Sexo;
  dataNascimento: Date | null;
  /** Data do parto mais recente (null se nunca pariu) */
  ultimoParto: Date | null;
}

/** Idade em meses completos. */
export function idadeEmMeses(dataNascimento: Date, hoje = new Date()): number {
  const meses =
    (hoje.getFullYear() - dataNascimento.getFullYear()) * 12 +
    (hoje.getMonth() - dataNascimento.getMonth()) -
    (hoje.getDate() < dataNascimento.getDate() ? 1 : 0);
  return Math.max(0, meses);
}

/** Data de nascimento aproximada a partir da idade em meses. */
export function dataNascimentoPorIdade(idadeMeses: number, hoje = new Date()): Date {
  const nascimento = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  nascimento.setMonth(nascimento.getMonth() - idadeMeses);
  return nascimento;
}

/**
 * Fase do animal, calculada por sexo, idade e partos.
 * - Fêmea: bezerra (< 12 meses), novilha, vaca (já pariu ou tem 24 meses ou mais).
 * - Macho: bezerro (< 12 meses), garrote (12 a 23 meses), touro (24 meses ou mais).
 * Sem data de nascimento, o animal é tratado como adulto.
 */
export function calcularFase(
  { sexo, dataNascimento, ultimoParto }: DadosFase,
  hoje = new Date()
): Fase {
  const idade = dataNascimento ? idadeEmMeses(dataNascimento, hoje) : null;

  if (sexo === 'F') {
    if (ultimoParto) return 'vaca';
    if (idade === null || idade >= IDADE_ADULTO_MESES) return 'vaca';
    return idade < IDADE_FIM_CRIA_MESES ? 'bezerra' : 'novilha';
  }

  if (idade === null || idade >= IDADE_ADULTO_MESES) return 'touro';
  return idade < IDADE_FIM_CRIA_MESES ? 'bezerro' : 'garrote';
}

/**
 * Situação da vaca numa fazenda de leite: em lactação até 305 dias após o
 * último parto, depois seca. Retorna null quando não se aplica.
 */
export function calcularSituacaoLeite(
  fase: Fase,
  ultimoParto: Date | null,
  produzLeite: boolean,
  hoje = new Date()
): SituacaoLeite | null {
  if (!produzLeite || fase !== 'vaca') return null;
  if (ultimoParto && diasEntre(ultimoParto, hoje) <= DURACAO_LACTACAO_DIAS) {
    return 'lactacao';
  }
  return 'seca';
}

/** Fêmea que pode registrar cobertura e parto. */
export function emIdadeReprodutiva(sexo: Sexo, fase: Fase): boolean {
  return sexo === 'F' && (fase === 'novilha' || fase === 'vaca');
}

/** Texto curto de idade: "8 meses", "2 anos", "1 ano e 3 meses". */
export function formatarIdade(dataNascimento: Date, hoje = new Date()): string {
  const total = idadeEmMeses(dataNascimento, hoje);
  const anos = Math.floor(total / 12);
  const meses = total % 12;
  const txtAnos = anos === 1 ? '1 ano' : `${anos} anos`;
  const txtMeses = meses === 1 ? '1 mês' : `${meses} meses`;
  if (anos === 0) return txtMeses;
  if (meses === 0) return txtAnos;
  return `${txtAnos} e ${txtMeses}`;
}
