import type { ControleLeiteiro, HistoricoDeLeite, ResumoLeite, Secagem } from '@/dtos';
import { adicionarDias, diasEntre, inicioDoDia } from '@/utils/date';

/** Janela da média de produção. */
const DIAS_MEDIA = 30;

type ControleMedido = Pick<ControleLeiteiro, 'data' | 'litros'>;

/** Do mais recente para o mais antigo. */
function maisRecentesPrimeiro<T extends ControleMedido>(controles: readonly T[]): T[] {
  return [...controles].sort((a, b) => b.data.getTime() - a.data.getTime());
}

/** Média dos controles dos últimos 30 dias, com uma casa (null sem controle no período). */
function mediaDos30Dias(controles: readonly ControleMedido[], hoje: Date): number | null {
  const inicioJanela = adicionarDias(inicioDoDia(hoje), -DIAS_MEDIA).getTime();
  const naJanela = controles.filter((c) => c.data.getTime() >= inicioJanela);
  if (naJanela.length === 0) return null;
  return Number((naJanela.reduce((soma, c) => soma + c.litros, 0) / naJanela.length).toFixed(1));
}

/** Secagem que vale para a lactação atual: a mais recente depois do último parto. */
export function secagemAtual(secagens: Pick<Secagem, 'data'>[], ultimoParto: Date | null): Date | null {
  const depoisDoParto = secagens
    .map((s) => s.data)
    .filter((data) => !ultimoParto || data.getTime() >= inicioDoDia(ultimoParto).getTime());
  if (depoisDoParto.length === 0) return null;
  return new Date(Math.max(...depoisDoParto.map((d) => d.getTime())));
}

export interface DadosResumoLeite {
  controles: ControleMedido[];
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
  const ordenados = maisRecentesPrimeiro(controles);
  const secaDesde = secagemAtual(secagens, ultimoParto);

  return {
    ultimoLitros: ordenados[0]?.litros ?? null,
    ultimoControle: ordenados[0]?.data ?? null,
    media30Dias: mediaDos30Dias(ordenados, hoje),
    numeroLactacao: totalPartos > 0 ? totalPartos : null,
    diasEmLactacao: ultimoParto && !secaDesde ? diasEntre(ultimoParto, hoje) : null,
    secaDesde,
  };
}

/**
 * Histórico do controle leiteiro (o mesmo jeito do histórico de peso): cada
 * controle com a diferença para o anterior, o último e a média de 30 dias.
 */
export function historicoDeLeite(controles: ControleLeiteiro[], hoje = new Date()): HistoricoDeLeite {
  const ordenados = maisRecentesPrimeiro(controles);
  return {
    linhas: ordenados.map((controle, i) => {
      const anterior = ordenados[i + 1];
      return {
        controle,
        variacaoL: anterior ? Number((controle.litros - anterior.litros).toFixed(1)) : null,
        dias: anterior ? diasEntre(anterior.data, controle.data) : null,
      };
    }),
    ultimoLitros: ordenados[0]?.litros ?? null,
    media30Dias: mediaDos30Dias(ordenados, hoje),
  };
}
