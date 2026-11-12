import { and, desc, eq } from 'drizzle-orm';

import { anotacoesMaquina, daFazenda, db, novoRegistro } from '@/database';
import type { AnotacaoMaquina } from '@/dtos';

/** Anotações da máquina, da mais recente para a mais antiga. */
export function anotacoesDaMaquina(maquinaId: string) {
  return db
    .select()
    .from(anotacoesMaquina)
    .where(and(daFazenda(anotacoesMaquina), eq(anotacoesMaquina.maquinaId, maquinaId)))
    .orderBy(desc(anotacoesMaquina.createdAt));
}

/** Anota na máquina; com `usoId`, a anotação fica ligada ao uso (ex.: no resumo). */
export async function criarAnotacao(
  maquinaId: string,
  texto: string,
  usoId: string | null = null
): Promise<AnotacaoMaquina> {
  const limpo = texto.trim();
  if (!limpo) throw new Error('Escreva a anotação');
  const [anotacao] = await db
    .insert(anotacoesMaquina)
    .values(novoRegistro({ maquinaId, texto: limpo, usoId }))
    .returning();
  return anotacao;
}
