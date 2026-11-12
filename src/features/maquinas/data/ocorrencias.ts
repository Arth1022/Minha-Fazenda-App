import { and, desc, eq, isNull } from 'drizzle-orm';

import { atualizar, daFazenda, db, novoRegistro, ocorrenciasMaquina } from '@/database';
import type { CategoriaProblema, OcorrenciaMaquina } from '@/dtos';
import { usuarioAtual, type Usuario } from '@/services/usuario';
import type { Posicao } from './usos';

export interface DadosProblema {
  maquinaId: string;
  usoId?: string | null;
  categoria: CategoriaProblema;
  /** "Dá para continuar usando?" — não: a máquina fica parada por problema */
  podeUsar: boolean;
  descricao?: string | null;
  fotoUri?: string | null;
  posicao?: Posicao | null;
  operador?: Usuario;
}

export async function registrarProblema(dados: DadosProblema, agora = new Date()): Promise<OcorrenciaMaquina> {
  const operador = dados.operador ?? usuarioAtual();
  const [ocorrencia] = await db
    .insert(ocorrenciasMaquina)
    .values(novoRegistro({
      maquinaId: dados.maquinaId,
      usoId: dados.usoId ?? null,
      operador: operador.nome,
      operadorId: operador.id,
      categoria: dados.categoria,
      podeUsar: dados.podeUsar,
      descricao: dados.descricao?.trim() || null,
      fotoUri: dados.fotoUri ?? null,
      lat: dados.posicao?.lat ?? null,
      lng: dados.posicao?.lng ?? null,
      registradoEm: agora,
    }))
    .returning();
  return ocorrencia;
}

/** Problemas ainda não resolvidos: mudam a situação da máquina. */
export function problemasAbertos(maquinaId: string) {
  return db
    .select()
    .from(ocorrenciasMaquina)
    .where(and(daFazenda(ocorrenciasMaquina), eq(ocorrenciasMaquina.maquinaId, maquinaId), isNull(ocorrenciasMaquina.resolvidaEm)))
    .orderBy(desc(ocorrenciasMaquina.registradoEm));
}

/** Todos os problemas em aberto da frota (para a lista de máquinas). */
export function problemasAbertosDaFrota() {
  return db
    .select()
    .from(ocorrenciasMaquina)
    .where(and(daFazenda(ocorrenciasMaquina), isNull(ocorrenciasMaquina.resolvidaEm)));
}

/** Problemas da máquina (abertos e resolvidos), do mais recente para o mais antigo. */
export function problemasDaMaquina(maquinaId: string, limite = 10) {
  return db
    .select()
    .from(ocorrenciasMaquina)
    .where(and(daFazenda(ocorrenciasMaquina), eq(ocorrenciasMaquina.maquinaId, maquinaId)))
    .orderBy(desc(ocorrenciasMaquina.registradoEm))
    .limit(limite);
}

/** Marca o problema como resolvido (o registro original fica). */
export async function resolverProblema(id: string, agora = new Date()): Promise<void> {
  await db
    .update(ocorrenciasMaquina)
    .set(atualizar({ resolvidaEm: agora }))
    .where(and(eq(ocorrenciasMaquina.id, id), isNull(ocorrenciasMaquina.resolvidaEm)));
}
