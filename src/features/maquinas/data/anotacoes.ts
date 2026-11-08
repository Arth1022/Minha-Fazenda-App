import { desc, eq } from 'drizzle-orm';

import { anotacoesMaquina, db } from '@/database';
import type { AnotacaoMaquina } from '@/dtos';
import { usuarioAtual } from '@/services/usuario';

/** Anotações da máquina, da mais recente para a mais antiga. */
export function anotacoesDaMaquina(maquinaId: string) {
  return db
    .select()
    .from(anotacoesMaquina)
    .where(eq(anotacoesMaquina.maquinaId, maquinaId))
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
    .values({ maquinaId, texto: limpo, usoId, criadoPor: usuarioAtual().nome })
    .returning();
  return anotacao;
}
