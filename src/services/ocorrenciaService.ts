import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';

import {
  db,
  tarefaEventos,
  tarefas,
  type CategoriaTarefa,
  type NovoTarefaEvento,
  type OrigemTarefa,
  type StatusTarefa,
  type TarefaEvento,
  type TarefaOcorrencia,
} from '@/database';
import { podeAtribuirTarefas, usuarioAtual, type Usuario } from '@/services/usuario';

/** A lista lê só `tarefas` (status e responsável são cache dela): `tarefa_eventos` não precisa reconsultar. */
export const TABELAS_OCORRENCIAS = ['tarefas'] as const;

export const ROTULO_CATEGORIA_TAREFA: Record<CategoriaTarefa, string> = {
  cerca: 'Cerca',
  animal: 'Animal',
  maquina: 'Máquina',
  agua: 'Água',
  pasto: 'Pasto/Lavoura',
  outro: 'Outro',
};

export const ROTULO_STATUS_TAREFA: Record<StatusTarefa, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export interface CriarOcorrenciaInput {
  titulo?: string;
  categoria: CategoriaTarefa;
  origem?: OrigemTarefa;
  descricao?: string | null;
  urgente?: boolean;
  responsavelId?: string | null;
  prazo?: Date | null;
  areaId?: string | null;
  pontoLat?: number | null;
  pontoLng?: number | null;
  autorId?: string;
  agora?: Date;
}

export interface FiltrosTodasTarefas {
  status?: StatusTarefa;
  categoria?: CategoriaTarefa;
  semResponsavel?: boolean;
  responsavelId?: string;
  areaId?: string;
}

/**
 * Cria uma ocorrência ou tarefa e registra o evento inicial 'criada' na mesma
 * transação (RN-T01, RN-T06, RF-T20).
 */
export async function criarOcorrencia(input: CriarOcorrenciaInput): Promise<TarefaOcorrencia> {
  const agora = input.agora ?? new Date();
  const autorId = input.autorId ?? usuarioAtual().id;
  const titulo = input.titulo?.trim() || ROTULO_CATEGORIA_TAREFA[input.categoria];

  return db.transaction((tx) => {
    const criada = tx
      .insert(tarefas)
      .values({
        titulo,
        categoria: input.categoria,
        origem: input.origem ?? 'ocorrencia',
        descricao: input.descricao?.trim() || null,
        urgente: input.urgente ?? false,
        status: 'aberta',
        responsavelId: input.responsavelId ?? null,
        criadoPor: autorId,
        prazo: input.prazo ?? null,
        areaId: input.areaId ?? null,
        pontoLat: input.pontoLat ?? null,
        pontoLng: input.pontoLng ?? null,
        syncStatus: 'pendente',
        createdAt: agora,
        updatedAt: agora,
      })
      .returning()
      .get();

    tx.insert(tarefaEventos)
      .values({
        tarefaId: criada.id,
        tipo: 'criada',
        autorId,
        ocorridoEm: agora,
        texto: criada.descricao,
        dados: input.responsavelId ? { responsavelId: input.responsavelId } : null,
      })
      .run();
    return criada;
  });
}

async function buscarTarefaOuFalhar(tarefaId: string): Promise<TarefaOcorrencia> {
  const [tarefa] = await db.select().from(tarefas).where(eq(tarefas.id, tarefaId)).limit(1);
  if (!tarefa) throw new Error('Tarefa não encontrada.');
  return tarefa;
}

/**
 * Toda mudança de estado: atualiza o cache em `tarefas` e acrescenta o evento
 * em `tarefa_eventos` na mesma transação (nunca um sem o outro).
 */
function transicionar(
  tarefaId: string,
  campos: Partial<Pick<TarefaOcorrencia, 'status' | 'responsavelId'>>,
  evento: Pick<NovoTarefaEvento, 'tipo' | 'autorId' | 'texto' | 'dados'>,
  agora: Date
): TarefaOcorrencia {
  return db.transaction((tx) => {
    const atualizada = tx
      .update(tarefas)
      .set({ ...campos, syncStatus: 'pendente', updatedAt: agora })
      .where(eq(tarefas.id, tarefaId))
      .returning()
      .get();
    tx.insert(tarefaEventos)
      .values({ ...evento, tarefaId, ocorridoEm: agora })
      .run();
    return atualizada;
  });
}

/** Colaborador pega para si uma tarefa aberta e sem responsável (RF-T15, RN-T04). */
export async function pegarTarefa(
  tarefaId: string,
  autorId = usuarioAtual().id,
  agora = new Date()
): Promise<TarefaOcorrencia> {
  const tarefa = await buscarTarefaOuFalhar(tarefaId);
  if (tarefa.status !== 'aberta' || tarefa.responsavelId !== null) {
    throw new Error('Apenas tarefas abertas e sem dono podem ser assumidas.');
  }
  return transicionar(
    tarefaId,
    { responsavelId: autorId },
    { tipo: 'assumida', autorId, dados: { responsavelId: autorId } },
    agora
  );
}

/** Devolve a tarefa do próprio responsável para Aberta e sem dono (RF-T15, RN-T04). */
export async function soltarTarefa(
  tarefaId: string,
  autorId = usuarioAtual().id,
  agora = new Date()
): Promise<TarefaOcorrencia> {
  const tarefa = await buscarTarefaOuFalhar(tarefaId);
  if (tarefa.responsavelId !== autorId) {
    throw new Error('Só o próprio responsável pode soltar a tarefa.');
  }
  if (tarefa.status !== 'aberta' && tarefa.status !== 'em_andamento') {
    throw new Error('Tarefa encerrada não pode ser solta.');
  }
  return transicionar(tarefaId, { responsavelId: null, status: 'aberta' }, { tipo: 'liberada', autorId }, agora);
}

/** Admin atribui ou reatribui uma tarefa a um colaborador (RF-T14). */
export async function atribuirOcorrencia(
  tarefaId: string,
  responsavelId: string | null,
  autor: Usuario = usuarioAtual(),
  agora = new Date()
): Promise<TarefaOcorrencia> {
  if (!podeAtribuirTarefas(autor)) throw new Error('Só o admin pode atribuir tarefas.');
  await buscarTarefaOuFalhar(tarefaId);
  return transicionar(
    tarefaId,
    { responsavelId },
    { tipo: 'atribuida', autorId: autor.id, dados: { responsavelId } },
    agora
  );
}

/** Inicia a tarefa: 'em_andamento' (RF-T16, RN-T03). */
export async function iniciarOcorrencia(
  tarefaId: string,
  autor: Usuario = usuarioAtual(),
  agora = new Date()
): Promise<TarefaOcorrencia> {
  const tarefa = await buscarTarefaOuFalhar(tarefaId);
  if (tarefa.status !== 'aberta') throw new Error('Apenas tarefas abertas podem ser iniciadas.');
  if (tarefa.responsavelId && tarefa.responsavelId !== autor.id && autor.papel !== 'admin') {
    throw new Error('Só o responsável ou o admin pode iniciar a tarefa.');
  }
  return transicionar(
    tarefaId,
    { status: 'em_andamento', responsavelId: tarefa.responsavelId ?? autor.id },
    { tipo: 'iniciada', autorId: autor.id },
    agora
  );
}

/** Conclui a tarefa com observação opcional (RF-T16, RF-T17, RN-T03). */
export async function concluirOcorrencia(
  tarefaId: string,
  opcoes?: { observacao?: string; autor?: Usuario; agora?: Date }
): Promise<TarefaOcorrencia> {
  const autor = opcoes?.autor ?? usuarioAtual();
  const tarefa = await buscarTarefaOuFalhar(tarefaId);
  if (tarefa.status !== 'aberta' && tarefa.status !== 'em_andamento') {
    throw new Error('Tarefa já está encerrada.');
  }
  if (tarefa.responsavelId && tarefa.responsavelId !== autor.id && autor.papel !== 'admin') {
    throw new Error('Só o responsável ou o admin pode concluir a tarefa.');
  }
  return transicionar(
    tarefaId,
    { status: 'concluida', responsavelId: tarefa.responsavelId ?? autor.id },
    { tipo: 'concluida', autorId: autor.id, texto: opcoes?.observacao?.trim() || null },
    opcoes?.agora ?? new Date()
  );
}

/** Cancela tarefa aberta ou em andamento; o motivo é obrigatório (RF-T19, RN-T08). */
export async function cancelarOcorrencia(
  tarefaId: string,
  motivo: string,
  autor: Usuario = usuarioAtual(),
  agora = new Date()
): Promise<TarefaOcorrencia> {
  const motivoLimpo = motivo.trim();
  if (!motivoLimpo) throw new Error('Motivo é obrigatório para cancelar uma tarefa.');

  const tarefa = await buscarTarefaOuFalhar(tarefaId);
  if (tarefa.status !== 'aberta' && tarefa.status !== 'em_andamento') {
    throw new Error('Apenas tarefas abertas ou em andamento podem ser canceladas.');
  }
  const relatouAberta = tarefa.status === 'aberta' && tarefa.criadoPor === autor.id;
  if (autor.papel !== 'admin' && !relatouAberta) {
    throw new Error('Só o admin ou quem relatou enquanto aberta pode cancelar a tarefa.');
  }
  return transicionar(tarefaId, { status: 'cancelada' }, { tipo: 'cancelada', autorId: autor.id, texto: motivoLimpo }, agora);
}

/** Histórico append-only de eventos de uma tarefa (RF-T20). */
export async function listarEventosDaTarefa(tarefaId: string): Promise<TarefaEvento[]> {
  return db
    .select()
    .from(tarefaEventos)
    .where(eq(tarefaEventos.tarefaId, tarefaId))
    .orderBy(asc(tarefaEventos.ocorridoEm));
}

/** Urgentes primeiro, depois prazo mais próximo (sem prazo por último, nativo do SQLite). */
const ORDEM_PADRAO_TAREFAS = [
  desc(tarefas.urgente),
  sql`${tarefas.prazo} is null`,
  asc(tarefas.prazo),
  desc(tarefas.createdAt),
] as const;

/** "Minhas tarefas": abertas ou em andamento do usuário (RF-T21). */
export async function listarMinhasTarefas(
  responsavelId = usuarioAtual().id
): Promise<TarefaOcorrencia[]> {
  return db
    .select()
    .from(tarefas)
    .where(
      and(
        eq(tarefas.responsavelId, responsavelId),
        inArray(tarefas.status, ['aberta', 'em_andamento'])
      )
    )
    .orderBy(...ORDEM_PADRAO_TAREFAS);
}

/** "Todas as tarefas" da fazenda, com filtros opcionais (RF-T22). */
export async function listarTodasTarefas(
  filtros?: FiltrosTodasTarefas
): Promise<TarefaOcorrencia[]> {
  const condicoes: SQL[] = [];
  if (filtros?.status) condicoes.push(eq(tarefas.status, filtros.status));
  if (filtros?.categoria) condicoes.push(eq(tarefas.categoria, filtros.categoria));
  if (filtros?.semResponsavel) condicoes.push(isNull(tarefas.responsavelId));
  else if (filtros?.responsavelId) condicoes.push(eq(tarefas.responsavelId, filtros.responsavelId));
  if (filtros?.areaId) condicoes.push(eq(tarefas.areaId, filtros.areaId));

  return db
    .select()
    .from(tarefas)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(...ORDEM_PADRAO_TAREFAS);
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Cria 3 ocorrências de exemplo se a tabela estiver vazia (tela já nasce utilizável offline). */
export async function garantirSeedOcorrencias(): Promise<void> {
  const [existe] = await db.select({ id: tarefas.id }).from(tarefas).limit(1);
  if (existe) return;

  const eu = usuarioAtual();
  const agora = new Date();
  const emDias = (dias: number) => new Date(agora.getTime() + dias * DIA_MS);

  await criarOcorrencia({
    titulo: 'Cerca rompida — Pasto Norte',
    categoria: 'cerca',
    descricao: 'Dois fios arrebentados próximo à porteira principal.',
    urgente: true,
    responsavelId: eu.id,
    prazo: emDias(1),
    autorId: eu.id,
    agora,
  });

  const emAndamento = await criarOcorrencia({
    titulo: 'Vazamento no bebedouro central',
    categoria: 'agua',
    descricao: 'Boia travada derramando água continuamente.',
    responsavelId: eu.id,
    prazo: emDias(2),
    autorId: eu.id,
    agora,
  });
  await iniciarOcorrencia(emAndamento.id, eu, agora);

  await criarOcorrencia({
    titulo: 'Calibrar pneu traseiro do trator',
    categoria: 'maquina',
    descricao: 'Pneu esquerdo perdendo pressão após roçada.',
    prazo: emDias(4),
    autorId: 'colaborador-joao',
    agora,
  });
}
