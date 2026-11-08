import type { ControleLeiteiro, ResumoLeite, Secagem } from '@/dtos';
import { adicionarDias, diasEntre, inicioDoDia } from '@/utils/date';

/** Janela da média de produção. */
const DIAS_MEDIA = 30;

/** Secagem que vale para a lactação atual: a mais recente depois do último parto. */
export function secagemAtual(secagens: Pick<Secagem, 'data'>[], ultimoParto: Date | null): Date | null {
  const depoisDoParto = secagens
    .map((s) => s.data)
    .filter((data) => !ultimoParto || data.getTime() >= inicioDoDia(ultimoParto).getTime());
  if (depoisDoParto.length === 0) return null;
  return new Date(Math.max(...depoisDoParto.map((d) => d.getTime())));
}

export interface DadosResumoLeite {
  controles: Pick<ControleLeiteiro, 'data' | 'litros'>[];
  secagens: Pick<Secagem, 'data'>[];
  /** Parto mais recente registrado no app */
  ultimoParto: Date | null;
  /** Partos da vaca: crias cadastradas + as de antes do app */
  totalPartos: number;
}

/**
 * Lactação atual da vaca: último controle, média dos últimos 30 dias, número da
 * lactação (partos), dias em lactação desde o parto e, se secou, desde quando.
 */
export function resumoDoLeite(
  { controles, secagens, ultimoParto, totalPartos }: DadosResumoLeite,
  hoje = new Date()
): ResumoLeite {
  const ordenados = [...controles].sort((a, b) => b.data.getTime() - a.data.getTime());
  const inicioJanela = adicionarDias(inicioDoDia(hoje), -DIAS_MEDIA).getTime();
  const naJanela = ordenados.filter((c) => c.data.getTime() >= inicioJanela);
  const secaDesde = secagemAtual(secagens, ultimoParto);

  return {
    ultimoLitros: ordenados[0]?.litros ?? null,
    ultimoControle: ordenados[0]?.data ?? null,
    media30Dias:
      naJanela.length > 0
        ? Number((naJanela.reduce((soma, c) => soma + c.litros, 0) / naJanela.length).toFixed(1))
        : null,
    numeroLactacao: totalPartos > 0 ? totalPartos : null,
    diasEmLactacao: ultimoParto && !secaDesde ? diasEntre(ultimoParto, hoje) : null,
    secaDesde,
  };
}
