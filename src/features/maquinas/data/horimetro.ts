import { and, desc, eq } from 'drizzle-orm';

import { daFazenda, db, leiturasHorimetro, novoRegistro } from '@/database';
import type { LeituraHorimetro } from '@/dtos';
import { usuarioAtual, type Usuario } from '@/services/usuario';

export interface DadosLeituraHorimetro {
  maquinaId: string;
  usoId?: string | null;
  /** O número que a pessoa viu no painel (nunca preenchido pelo app) */
  valorH: number;
  /** O que o app esperava no momento */
  estimadoH?: number | null;
  fotoUri?: string | null;
  operador?: Usuario;
}

/** Grava uma leitura avulsa do horímetro. A conferência (valor menor, longe do esperado) é na tela. */
export async function registrarLeituraHorimetro(
  dados: DadosLeituraHorimetro,
  agora = new Date()
): Promise<LeituraHorimetro> {
  if (!(dados.valorH >= 0)) throw new Error('Informe o número que aparece no horímetro');
  const operador = dados.operador ?? usuarioAtual();
  const [leitura] = await db
    .insert(leiturasHorimetro)
    .values(novoRegistro({
      maquinaId: dados.maquinaId,
      usoId: dados.usoId ?? null,
      operador: operador.nome,
      operadorId: operador.id,
      valorH: dados.valorH,
      estimadoH: dados.estimadoH ?? null,
      origem: 'avulsa' as const,
      fotoUri: dados.fotoUri ?? null,
      lidoEm: agora,
    }))
    .returning();
  return leitura;
}

/** Leituras do horímetro, da mais recente para a mais antiga. */
export function leiturasDaMaquina(maquinaId: string, limite = 10) {
  return db
    .select()
    .from(leiturasHorimetro)
    .where(and(daFazenda(leiturasHorimetro), eq(leiturasHorimetro.maquinaId, maquinaId)))
    .orderBy(desc(leiturasHorimetro.lidoEm))
    .limit(limite);
}
