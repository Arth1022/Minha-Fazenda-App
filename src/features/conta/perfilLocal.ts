import { eq } from 'drizzle-orm';

import { db, perfilLocal, type PerfilLocal } from '@/database';
import { apagarFoto, guardarFoto } from '@/services/fotos';

/**
 * Perfil do modo sem conta, na tabela local-only `perfil_local` (nunca sobe).
 * A foto é copiada para a pasta de documentos do app.
 */

export async function lerPerfilLocal(): Promise<PerfilLocal | null> {
  const [perfil] = await db.select().from(perfilLocal).limit(1);
  return perfil ?? null;
}

export async function criarPerfilLocal(nome: string, fotoUri: string | null): Promise<PerfilLocal> {
  const fotoPath = await guardarFoto(fotoUri);
  const [criado] = await db.insert(perfilLocal).values({ nome: nome.trim(), fotoPath }).returning();
  return criado;
}

export async function atualizarPerfilLocal(
  id: string,
  dados: { nome?: string; fotoUri?: string | null }
): Promise<PerfilLocal> {
  const [atual] = await db.select().from(perfilLocal).where(eq(perfilLocal.id, id)).limit(1);
  if (!atual) throw new Error('Perfil não encontrado.');
  let fotoPath = atual.fotoPath;
  if (dados.fotoUri !== undefined) {
    fotoPath = await guardarFoto(dados.fotoUri);
    if (atual.fotoPath && atual.fotoPath !== fotoPath) apagarFoto(atual.fotoPath);
  }
  const [salvo] = await db
    .update(perfilLocal)
    .set({ nome: dados.nome?.trim() ?? atual.nome, fotoPath })
    .where(eq(perfilLocal.id, id))
    .returning();
  return salvo;
}
