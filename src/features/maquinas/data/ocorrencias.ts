import { and, desc, eq, isNull } from 'drizzle-orm';

import { daFazenda, db, maquinas, ocorrenciasMaquina } from '@/database';
import type { CategoriaProblema, OcorrenciaMaquina } from '@/dtos';
import { registrarProblemaMaquina, resolverProblemaMaquina } from '@/services/ocorrenciaService';
import type { Usuario } from '@/services/usuario';
import { CATEGORIA_PROBLEMA_LABEL } from '../labels';
import type { Posicao } from './usos';

export interface DadosProblema {
  maquinaId: string;
  usoId?: string | null;
  categoria: CategoriaProblema;
  /** "Dá para continuar usando?" — não: a máquina fica parada por problema */
  podeUsar: boolean;
  descricao?: string | null;
  fotoUri?: string | null;
  /** Cópia da foto para a tarefa (o envio de mídia apaga cada arquivo depois de subir) */
  fotoTarefaUri?: string | null;
  posicao?: Posicao | null;
  /** Padrão: urgente quando não dá para usar */
  urgente?: boolean;
  /** Quem vai cuidar da tarefa do conserto (null = livre para alguém pegar) */
  responsavelId?: string | null;
  operador?: Usuario;
}

/** Título da tarefa do conserto: "Motor — Trator Valtra (TR-01)". */
export function tituloDoProblema(
  categoria: CategoriaProblema,
  maquina: { nome: string; codigo: string | null }
): string {
  const nome = maquina.codigo ? `${maquina.nome} (${maquina.codigo})` : maquina.nome;
  return `${CATEGORIA_PROBLEMA_LABEL[categoria]} — ${nome}`;
}

/** Problema na máquina: grava o registro e abre a tarefa do conserto em Tarefas. */
export async function registrarProblema(dados: DadosProblema, agora = new Date()): Promise<OcorrenciaMaquina> {
  const [maquina] = await db
    .select({ nome: maquinas.nome, codigo: maquinas.codigo })
    .from(maquinas)
    .where(and(daFazenda(maquinas), eq(maquinas.id, dados.maquinaId)))
    .limit(1);
  if (!maquina) throw new Error('Máquina não encontrada na frota.');

  const { ocorrencia } = await registrarProblemaMaquina({
    maquinaId: dados.maquinaId,
    categoria: dados.categoria,
    podeUsar: dados.podeUsar,
    titulo: tituloDoProblema(dados.categoria, maquina),
    descricao: dados.descricao,
    urgente: dados.urgente,
    responsavelId: dados.responsavelId ?? null,
    usoId: dados.usoId ?? null,
    fotoUri: dados.fotoUri ?? null,
    fotoTarefaUri: dados.fotoTarefaUri ?? null,
    lat: dados.posicao?.lat ?? null,
    lng: dados.posicao?.lng ?? null,
    autor: dados.operador,
    agora,
  });
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

/** Marca o problema como resolvido (o registro original fica) e conclui a tarefa dele. */
export async function resolverProblema(id: string, agora = new Date()): Promise<void> {
  await resolverProblemaMaquina(id, undefined, agora);
}
