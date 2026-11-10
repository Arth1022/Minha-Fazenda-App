import type { Abastecimento, LeituraHorimetro, OcorrenciaMaquina, UsoMaquina } from '@/dtos';
import { formatDataBR, formatDiaMes, inicioDoDia } from '@/utils/date';
import { horaCurta } from './uso';

/** Pelo índice de Date.getDay() (0 = domingo). */
const DIA_ABREVIADO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIA_POR_EXTENSO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** "sex, 06/11 às 18:39" (linha "Último uso" da ficha). */
export function formatarMomento(data: Date): string {
  return `${DIA_ABREVIADO[data.getDay()]}, ${formatDiaMes(data)} às ${horaCurta(data)}`;
}

/** "Sexta, 06/11/2026" (cabeçalho do dia no histórico). */
export function formatarDiaHistorico(dia: Date): string {
  return `${DIA_POR_EXTENSO[dia.getDay()]}, ${formatDataBR(dia)}`;
}

/** Um acontecimento do histórico da máquina, já com a data em que aconteceu. */
export type ItemHistorico =
  | { tipo: 'uso'; id: string; em: Date; uso: UsoMaquina }
  | { tipo: 'abastecimento'; id: string; em: Date; abastecimento: Abastecimento }
  | { tipo: 'horimetro'; id: string; em: Date; leitura: LeituraHorimetro }
  | { tipo: 'problema'; id: string; em: Date; problema: OcorrenciaMaquina };

export interface DiaHistorico {
  /** Meia-noite local */
  dia: Date;
  itens: ItemHistorico[];
}

export interface FontesHistorico {
  usos: UsoMaquina[];
  abastecimentos: Abastecimento[];
  leituras: LeituraHorimetro[];
  problemas: OcorrenciaMaquina[];
}

/**
 * Junta usos, abastecimentos, leituras avulsas do horímetro e problemas na
 * ordem em que aconteceram (do mais recente), agrupados por dia. A leitura
 * feita no abastecimento já aparece na linha dele.
 */
export function montarHistorico(fontes: FontesHistorico, limite = Infinity): DiaHistorico[] {
  const itens: ItemHistorico[] = [
    ...fontes.usos.map((uso) => ({ tipo: 'uso' as const, id: uso.id, em: uso.inicio, uso })),
    ...fontes.abastecimentos.map((abastecimento) => ({
      tipo: 'abastecimento' as const,
      id: abastecimento.id,
      em: abastecimento.abastecidoEm,
      abastecimento,
    })),
    ...fontes.leituras
      .filter((l) => l.origem === 'avulsa')
      .map((leitura) => ({ tipo: 'horimetro' as const, id: leitura.id, em: leitura.lidoEm, leitura })),
    ...fontes.problemas.map((problema) => ({
      tipo: 'problema' as const,
      id: problema.id,
      em: problema.registradoEm,
      problema,
    })),
  ];
  itens.sort((a, b) => b.em.getTime() - a.em.getTime());

  const dias: DiaHistorico[] = [];
  for (const item of itens.slice(0, limite)) {
    const dia = inicioDoDia(item.em);
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.dia.getTime() === dia.getTime()) ultimo.itens.push(item);
    else dias.push({ dia, itens: [item] });
  }
  return dias;
}

/** Último uso já encerrado (os recentes vêm do mais novo); null se nunca foi usada. */
export function ultimoUsoEncerrado(usos: UsoMaquina[]): UsoMaquina | null {
  return usos.find((u) => u.fim !== null) ?? null;
}
