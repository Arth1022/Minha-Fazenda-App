import { count, desc, eq, isNotNull, or } from 'drizzle-orm';

import { calculosCerca, db, type TipoDeCerca } from '@/database';
import { usuarioAtual } from '@/services/usuario';

/**
 * Cerca salva na área (M3): uma conta por área (índice único), reaberta pelo
 * painel. Salvar de novo substitui a anterior e tira a marca de desatualizada.
 */

export interface DadosCalculoCerca {
  areaId: string;
  tipoCerca: TipoDeCerca;
  fios: number;
  espacamentoM: number;
  perimetroM: number;
  cantos: number;
  metrosArame: number;
  rolos: number;
  mouroes: number;
  esticadores: number;
  precoRolo: number | null;
  precoMourao: number | null;
  precoEsticador: number | null;
  custo: number | null;
}

/** Grava a cerca da área num comando só (insere ou substitui pela área). */
export async function salvarCalculoCerca(dados: DadosCalculoCerca): Promise<void> {
  const valores = { ...dados, desatualizado: false };
  await db
    .insert(calculosCerca)
    .values({ ...valores, criadoPor: usuarioAtual().id })
    .onConflictDoUpdate({
      target: calculosCerca.areaId,
      set: { ...valores, updatedAt: new Date() },
    });
}

/** A cerca salva da área (lista com 0 ou 1 linha, pelo índice único). */
export function calculoCercaDaArea(areaId: string) {
  return db.select().from(calculosCerca).where(eq(calculosCerca.areaId, areaId)).limit(1);
}
export const TABELAS_CERCA = ['calculos_cerca'] as const;

/** Tem cerca salva? ("Redesenhar X?" avisa que ela fica desatualizada) */
export async function existeCercaSalva(areaId: string): Promise<boolean> {
  const [linha] = await db
    .select({ total: count() })
    .from(calculosCerca)
    .where(eq(calculosCerca.areaId, areaId));
  return (linha?.total ?? 0) > 0;
}

/** Os preços da última cerca com preço: a próxima conta já começa com eles. */
export async function ultimosPrecosCerca() {
  const [linha] = await db
    .select({
      precoRolo: calculosCerca.precoRolo,
      precoMourao: calculosCerca.precoMourao,
      precoEsticador: calculosCerca.precoEsticador,
    })
    .from(calculosCerca)
    .where(
      or(
        isNotNull(calculosCerca.precoRolo),
        isNotNull(calculosCerca.precoMourao),
        isNotNull(calculosCerca.precoEsticador)
      )
    )
    .orderBy(desc(calculosCerca.updatedAt))
    .limit(1);
  return linha ?? null;
}
