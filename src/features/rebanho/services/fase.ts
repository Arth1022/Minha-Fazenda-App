import type { DadosFase, Fase, Sexo, SituacaoLeite } from '@/dtos';
import { diasEntre } from '@/utils/date';

/** Até esta idade (exclusive) o animal é bezerra/bezerro. */
export const IDADE_FIM_CRIA_MESES = 12;
/** A partir desta idade o macho é touro. Na fêmea, só o parto faz dela vaca. */
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
 * Fase do animal, calculada por sexo, idade e partos (Embrapa: Glossário Gado de
 * Corte e Manual Roda da Reprodução 2.0).
 * - Fêmea: bezerra (< 12 meses), novilha (não pariu), vaca (já pariu). Só o parto
 *   faz a fêmea virar vaca; a idade decide apenas a saída de bezerra.
 * - Macho: bezerro (< 12 meses), garrote (12 a 23 meses), touro (24 meses ou mais).
 * Sem data de nascimento, o animal é tratado como adulto: novilha ou touro.
 */
export function calcularFase(
  { sexo, dataNascimento, ultimoParto, jaPariu = false }: DadosFase,
  hoje = new Date()
): Fase {
  const idade = dataNascimento ? idadeEmMeses(dataNascimento, hoje) : null;

  if (sexo === 'F') {
    if (jaPariu || ultimoParto) return 'vaca';
    if (idade !== null && idade < IDADE_FIM_CRIA_MESES) return 'bezerra';
    return 'novilha';
  }

  if (idade === null || idade >= IDADE_ADULTO_MESES) return 'touro';
  return idade < IDADE_FIM_CRIA_MESES ? 'bezerro' : 'garrote';
}

/**
 * Situação da vaca numa fazenda de leite: em lactação até 305 dias após o
 * último parto, depois seca. Uma secagem registrada depois do parto já faz
 * dela seca. Retorna null quando não se aplica.
 */
export function calcularSituacaoLeite(
  fase: Fase,
  ultimoParto: Date | null,
  produzLeite: boolean,
  hoje = new Date(),
  secaDesde: Date | null = null
): SituacaoLeite | null {
  if (!produzLeite || fase !== 'vaca') return null;
  if (secaDesde) return 'seca';
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
