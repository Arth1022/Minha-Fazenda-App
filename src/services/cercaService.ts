import { and, count, desc, eq, isNotNull, or } from 'drizzle-orm';

import { atualizar, calculosCerca, daFazenda, db, novoRegistro, type TipoDeCerca } from '@/database';

/**
 * Cerca salva na área (M3): uma conta por área, reaberta pelo painel. Salvar de
 * novo substitui a anterior e tira a marca de desatualizada.
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

/**
 * Grava a cerca da área: substitui a que já existe ou cria. Sem UNIQUE no banco
 * do sync, a transação confere a linha da área antes de inserir.
 */
export async function salvarCalculoCerca(dados: DadosCalculoCerca): Promise<void> {
  const valores = { ...dados, desatualizado: false };
  await db.transaction(async (tx) => {
    const [existente] = await tx
      .select({ id: calculosCerca.id })
      .from(calculosCerca)
      .where(and(daFazenda(calculosCerca), eq(calculosCerca.areaId, dados.areaId)))
      .limit(1);
    if (existente) {
      await tx.update(calculosCerca).set(atualizar(valores)).where(eq(calculosCerca.id, existente.id));
    } else {
      await tx.insert(calculosCerca).values(novoRegistro(valores));
    }
  });
}

/** A cerca salva da área (lista com 0 ou 1 linha; a mais recente, se o sync trouxer duas). */
export function calculoCercaDaArea(areaId: string) {
  return db
    .select()
    .from(calculosCerca)
    .where(and(daFazenda(calculosCerca), eq(calculosCerca.areaId, areaId)))
    .orderBy(desc(calculosCerca.updatedAt))
    .limit(1);
}
export const TABELAS_CERCA = ['calculos_cerca'] as const;

/** Tem cerca salva? ("Redesenhar X?" avisa que ela fica desatualizada) */
export async function existeCercaSalva(areaId: string): Promise<boolean> {
  const [linha] = await db
    .select({ total: count() })
    .from(calculosCerca)
    .where(and(daFazenda(calculosCerca), eq(calculosCerca.areaId, areaId)));
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
      and(
        daFazenda(calculosCerca),
        or(
          isNotNull(calculosCerca.precoRolo),
          isNotNull(calculosCerca.precoMourao),
          isNotNull(calculosCerca.precoEsticador)
        )
      )
    )
    .orderBy(desc(calculosCerca.updatedAt))
    .limit(1);
  return linha ?? null;
}
