import { and, eq, inArray } from 'drizzle-orm';

import { db, newId, notificacoesAgendadas } from '@/database';
import type { NovaNotificacao, Vinculo } from '@/dtos';

import { montarGatilho } from './gatilhos';
import {
  agendarNotificacao,
  cancelarNotificacoes,
  listarNotificacoesAgendadas,
  notificacoesDisponiveis,
} from './notificacoes';

const doVinculo = ({ entidade, entidadeId }: Vinculo) =>
  and(
    eq(notificacoesAgendadas.entidade, entidade),
    eq(notificacoesAgendadas.entidadeId, entidadeId)
  );

/** Vínculos guardados do registro (consulta pronta para o useLiveQuery). */
export function notificacoesDe(vinculo: Vinculo) {
  return db.select().from(notificacoesAgendadas).where(doVinculo(vinculo));
}

/** Cancela no aparelho todas as notificações do registro e apaga os vínculos. */
export async function cancelarNotificacoesDe(vinculo: Vinculo): Promise<void> {
  const vinculadas = await notificacoesDe(vinculo);
  await cancelarNotificacoes(vinculadas.map((n) => n.id));
  await db.delete(notificacoesAgendadas).where(doVinculo(vinculo));
}

/**
 * Troca as notificações do registro pelas novas: cancela as antigas, agenda as
 * novas e guarda o vínculo. As de data passada são ignoradas. Retorna os ids agendados.
 */
export async function substituirNotificacoesDe(
  vinculo: Vinculo,
  novas: Omit<NovaNotificacao, 'id'>[],
  agora = new Date()
): Promise<string[]> {
  // Valida os horários antes de cancelar, para um erro não apagar as antigas
  novas.forEach((nova) => montarGatilho(nova.quando, nova.canal, agora));
  await cancelarNotificacoesDe(vinculo);

  const agendadas: string[] = [];
  for (const nova of novas) {
    const id = await agendarNotificacao({ ...nova, id: newId() }, agora);
    if (!id) continue;
    try {
      await db.insert(notificacoesAgendadas).values({
        id,
        ...vinculo,
        disparaEm: nova.quando.tipo === 'data' ? nova.quando.data : null,
      });
    } catch (error) {
      // Sem vínculo não daria para cancelar depois: desfaz o agendamento
      await cancelarNotificacoes([id]);
      throw error;
    }
    agendadas.push(id);
  }
  return agendadas;
}

/**
 * Apaga os vínculos cujas notificações não estão mais no aparelho (já dispararam,
 * ou o banco voltou de um backup sem os agendamentos). Chamar na abertura do app.
 */
export async function sincronizarVinculos(): Promise<void> {
  if (!notificacoesDisponiveis) return;
  const noAparelho = new Set((await listarNotificacoesAgendadas()).map((n) => n.id));
  const vinculos = await db.select({ id: notificacoesAgendadas.id }).from(notificacoesAgendadas);
  const orfaos = vinculos.filter((v) => !noAparelho.has(v.id)).map((v) => v.id);
  if (orfaos.length > 0) {
    await db.delete(notificacoesAgendadas).where(inArray(notificacoesAgendadas.id, orfaos));
  }
}
