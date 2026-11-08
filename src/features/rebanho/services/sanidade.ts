import type { Exame, SituacaoExame, TipoExame } from '@/dtos';
import { adicionarDias, diasEntre } from '@/utils/date';

/** Brucelose e tuberculose valem 1 ano (exigência comum de laticínio e de trânsito). */
export const VALIDADE_PADRAO_DIAS: Record<TipoExame, number | null> = {
  brucelose: 365,
  tuberculose: 365,
  outro: null,
};

/** A partir de quantos dias antes do vencimento o exame aparece como "vence logo". */
export const AVISO_VENCIMENTO_DIAS = 30;

export const TIPO_EXAME_LABEL: Record<TipoExame, string> = {
  brucelose: 'Brucelose',
  tuberculose: 'Tuberculose',
  outro: 'Outro exame',
};

/** "Brucelose", ou o nome digitado quando o tipo é "outro". */
export function nomeDoExame(exame: Pick<Exame, 'tipo' | 'descricao'>): string {
  return exame.tipo === 'outro' && exame.descricao ? exame.descricao : TIPO_EXAME_LABEL[exame.tipo];
}

/** Em dia, vence logo (30 dias), vencido, ou sem validade. */
export function situacaoDoExame(
  exame: Pick<Exame, 'data' | 'validadeDias'>,
  hoje = new Date()
): SituacaoExame {
  if (!exame.validadeDias) return { status: 'semValidade', venceEm: null };
  const venceEm = adicionarDias(exame.data, exame.validadeDias);
  const faltam = diasEntre(hoje, venceEm);
  if (faltam < 0) return { status: 'vencido', venceEm };
  return { status: faltam <= AVISO_VENCIMENTO_DIAS ? 'venceLogo' : 'emDia', venceEm };
}

/**
 * O exame mais recente de cada tipo (o que vale hoje). Exames "outro" com nomes
 * diferentes contam separado.
 */
export function examesAtuais<T extends Pick<Exame, 'tipo' | 'descricao' | 'data'>>(exames: T[]): T[] {
  const porNome = new Map<string, T>();
  for (const exame of exames) {
    const chave = `${exame.tipo}:${(exame.descricao ?? '').trim().toLowerCase()}`;
    const atual = porNome.get(chave);
    if (!atual || exame.data.getTime() > atual.data.getTime()) porNome.set(chave, exame);
  }
  return [...porNome.values()].sort((a, b) => b.data.getTime() - a.data.getTime());
}
