import { and, eq } from 'drizzle-orm';

import { atualizar, daFazenda, db, fazendaConfig, fazendaDoContexto, novoRegistro, type TipoProducao } from '@/database';

/** A configuração da fazenda ativa: uma linha, com id igual ao da fazenda. */
export function configDaFazenda(fazendaId: string) {
  return db
    .select()
    .from(fazendaConfig)
    .where(and(daFazenda(fazendaConfig), eq(fazendaConfig.id, fazendaId)))
    .limit(1);
}

/** Grava (ou altera) o tipo de produção da fazenda ativa. */
export async function salvarTipoProducao(tipoProducao: TipoProducao): Promise<void> {
  const fazendaId = fazendaDoContexto();
  if (!fazendaId) throw new Error('Nenhuma fazenda aberta.');
  await db.transaction(async (tx) => {
    const [atual] = await tx
      .select({ id: fazendaConfig.id })
      .from(fazendaConfig)
      .where(eq(fazendaConfig.id, fazendaId))
      .limit(1);
    if (atual) {
      await tx.update(fazendaConfig).set(atualizar({ tipoProducao })).where(eq(fazendaConfig.id, fazendaId));
    } else {
      await tx.insert(fazendaConfig).values(novoRegistro({ id: fazendaId, tipoProducao }));
    }
  });
}
