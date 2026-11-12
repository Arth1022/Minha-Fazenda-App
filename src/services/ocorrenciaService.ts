import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, sql, type SQL } from 'drizzle-orm';

import {
  animais,
  db,
  maquinas,
  talhoes,
  tarefaEventos,
  tarefas,
  type CategoriaTarefa,
  type NovoTarefaEvento,
  type OrigemTarefa,
  type StatusTarefa,
  type Talhao,
  type TarefaEvento,
  type TarefaOcorrencia,
} from '@/database';
import { buscarMaquinaPorReferencia } from '@/features/maquinas/data/maquinas';
import { lerQrMaquina } from '@/features/maquinas/services/qrCode';
import { buscarAnimalPorReferencia } from '@/features/rebanho/data/animais';
import { lerQrAnimal } from '@/features/rebanho/services/qrCode';
import { podeAtribuirTarefas, usuarioAtual, type Usuario } from '@/services/usuario';
import { pontoDentroDoPoligono, type Coordenada } from '@/utils/geoMath';

/** A lista lê só `tarefas` (status e responsável são cache dela): `tarefa_eventos` não precisa reconsultar. */
export const TABELAS_OCORRENCIAS = ['tarefas'] as const;

export const LIMITE_FOTOS_OCORRENCIA = 3;

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
  animalId?: string | null;
  maquinaId?: string | null;
  /** Quando true em ocorrência de máquina, atualiza o status da máquina para 'manutencao' */
  maquinaParada?: boolean;
  /** Caminho local do arquivo de nota de voz salvo no diretório do app (até 60s) */
  audioUri?: string | null;
  pontoLat?: number | null;
  pontoLng?: number | null;
  /** Caminhos locais das fotos já salvas no filesystem (máx. 3; nunca base64) */
  fotos?: string[];
  autorId?: string;
  agora?: Date;
}

export interface FiltrosTodasTarefas {
  status?: StatusTarefa;
  categoria?: CategoriaTarefa;
  semResponsavel?: boolean;
  responsavelId?: string;
  areaId?: string;
  animalId?: string;
  maquinaId?: string;
}

export type AlvoQrOcorrencia =
  | { tipo: 'animal'; animalId: string; identificacao: string; categoria: 'animal' }
  | { tipo: 'maquina'; maquinaId: string; identificacao: string; categoria: 'maquina' };

function formatarIdentificacaoAnimal(animal: { nome: string | null; brinco: string }): string {
  const num = animal.brinco.replace(/^#/, '');
  return animal.nome ? `${animal.nome} (#${num})` : `Brinco #${num}`;
}

/**
 * Resolve o conteúdo de um QR Code de animal ou máquina para pré-preencher a ocorrência.
 */
export async function resolverQrCodeParaOcorrencia(
  valorQr: string
): Promise<AlvoQrOcorrencia | null> {
  const refMaq = lerQrMaquina(valorQr);
  if (refMaq) {
    const maq = await buscarMaquinaPorReferencia(refMaq);
    if (maq) {
      return {
        tipo: 'maquina',
        maquinaId: maq.id,
        identificacao: `${maq.nome} (${maq.codigo})`,
        categoria: 'maquina',
      };
    }
  }

  const refAnimal = lerQrAnimal(valorQr);
  if (refAnimal) {
    const animal =
      (await buscarAnimalPorReferencia(refAnimal)) ??
      (refAnimal.tipo === 'brinco'
        ? await buscarAnimalPorReferencia({
            tipo: 'brinco',
            brinco: refAnimal.brinco.replace(/^#/, ''),
          })
        : undefined);
    if (animal) {
      return {
        tipo: 'animal',
        animalId: animal.id,
        identificacao: formatarIdentificacaoAnimal(animal),
        categoria: 'animal',
      };
    }
  }

  return null;
}

function limparAudioUri(uri?: string | null): string | null {
  const limpo = uri?.trim();
  if (!limpo || limpo.startsWith('data:')) return null;
  return limpo;
}

function limparFotos(fotos?: string[]): string[] {
  if (!fotos || fotos.length === 0) return [];
  return fotos
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && !f.startsWith('data:'))
    .slice(0, LIMITE_FOTOS_OCORRENCIA);
}

/**
 * Gera o título padrão da ocorrência (ex.: "Cerca — Pasto 2" ou "Cerca") (RF-T10).
 */
export function gerarTituloOcorrencia(
  categoria: CategoriaTarefa,
  areaNome?: string | null
): string {
  const rotulo = ROTULO_CATEGORIA_TAREFA[categoria];
  const nome = areaNome?.trim();
  return nome ? `${rotulo} — ${nome}` : rotulo;
}

/**
 * Identifica em qual área ativa o ponto GPS (lat, lng) cai, filtrando primeiro
 * pelo índice de BBOX no SQLite e depois conferindo o polígono (RF-T06, RN-T12).
 */
export async function identificarAreaNoPonto(
  lat: number,
  lng: number
): Promise<Pick<Talhao, 'id' | 'nome'> | null> {
  const candidatos = await db
    .select({
      id: talhoes.id,
      nome: talhoes.nome,
      geometriaJson: talhoes.geometriaJson,
    })
    .from(talhoes)
    .where(
      and(
        ne(talhoes.syncStatus, 'deleted'),
        lte(talhoes.minLat, lat),
        gte(talhoes.maxLat, lat),
        lte(talhoes.minLng, lng),
        gte(talhoes.maxLng, lng)
      )
    );

  const ponto: Coordenada = [lng, lat];
  for (const area of candidatos) {
    const anel = (area.geometriaJson.coordinates[0] ?? []) as Coordenada[];
    if (anel.length >= 3 && pontoDentroDoPoligono(ponto, anel)) {
      return { id: area.id, nome: area.nome };
    }
  }
  return null;
}

/**
 * Cria uma ocorrência ou tarefa e registra o evento inicial 'criada' na mesma
 * transação (RN-T01, RN-T06, RF-T06, RF-T10, RF-T20).
 */
export async function criarOcorrencia(input: CriarOcorrenciaInput): Promise<TarefaOcorrencia> {
  const agora = input.agora ?? new Date();
  const autorId = input.autorId ?? usuarioAtual().id;
  const fotos = limparFotos(input.fotos);
  const audioUri = limparAudioUri(input.audioUri);
  const animalId = input.animalId ?? null;
  const maquinaId = input.maquinaId ?? null;
  const maquinaParada = Boolean(maquinaId && input.maquinaParada);

  let areaId = input.areaId ?? null;
  let contextoNome: string | null = null;
  let pontoLat = input.pontoLat ?? null;
  let pontoLng = input.pontoLng ?? null;
  const tituloFornecido = input.titulo?.trim();

  if (animalId) {
    const [animal] = await db
      .select({ id: animais.id, brinco: animais.brinco, nome: animais.nome })
      .from(animais)
      .where(eq(animais.id, animalId))
      .limit(1);
    if (!animal) throw new Error('Animal vinculado não encontrado no rebanho.');
    contextoNome = formatarIdentificacaoAnimal(animal);
  }

  if (maquinaId) {
    const [maquina] = await db
      .select({ id: maquinas.id, nome: maquinas.nome, codigo: maquinas.codigo })
      .from(maquinas)
      .where(eq(maquinas.id, maquinaId))
      .limit(1);
    if (!maquina) throw new Error('Máquina vinculada não encontrada na frota.');
    contextoNome = `${maquina.nome} (${maquina.codigo})`;
  }

  if (areaId && ((!tituloFornecido && !contextoNome) || pontoLat === null || pontoLng === null)) {
    const [area] = await db
      .select({
        nome: talhoes.nome,
        centroLat: talhoes.centroLat,
        centroLng: talhoes.centroLng,
      })
      .from(talhoes)
      .where(eq(talhoes.id, areaId))
      .limit(1);
    if (area) {
      if (!contextoNome) contextoNome = area.nome;
      if (pontoLat === null || pontoLng === null) {
        pontoLat = area.centroLat;
        pontoLng = area.centroLng;
      }
    }
  } else if (
    areaId === null &&
    input.areaId === undefined &&
    typeof pontoLat === 'number' &&
    typeof pontoLng === 'number'
  ) {
    const detectada = await identificarAreaNoPonto(pontoLat, pontoLng);
    if (detectada) {
      areaId = detectada.id;
      if (!contextoNome) contextoNome = detectada.nome;
    }
  }

  const titulo = tituloFornecido || gerarTituloOcorrencia(input.categoria, contextoNome);
  const dadosEvento: Record<string, unknown> = {};
  if (input.responsavelId) dadosEvento.responsavelId = input.responsavelId;
  if (fotos.length > 0) dadosEvento.fotos = fotos;
  if (audioUri) dadosEvento.audioUri = audioUri;
  if (animalId) dadosEvento.animalId = animalId;
  if (maquinaId) {
    dadosEvento.maquinaId = maquinaId;
    dadosEvento.maquinaParada = maquinaParada;
  }

  return db.transaction((tx) => {
    const criada = tx
      .insert(tarefas)
      .values({
        titulo,
        categoria: input.categoria,
        origem: input.origem ?? 'ocorrencia',
        descricao: input.descricao?.trim() || null,
        urgente: input.urgente ?? maquinaParada,
        status: 'aberta',
        responsavelId: input.responsavelId ?? null,
        criadoPor: autorId,
        prazo: input.prazo ?? null,
        areaId,
        animalId,
        maquinaId,
        maquinaParada,
        audioUri,
        pontoLat,
        pontoLng,
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
        dados: Object.keys(dadosEvento).length > 0 ? dadosEvento : null,
      })
      .run();

    // Fechamento de ciclo de máquina: se "Máquina parada", coloca em manutenção na mesma transação
    if (maquinaId && maquinaParada) {
      tx.update(maquinas)
        .set({ status: 'manutencao', updatedAt: agora })
        .where(eq(maquinas.id, maquinaId))
        .run();
    }

    return criada;
  });
}

interface TarefaValidacao {
  id: string;
  status: StatusTarefa;
  responsavelId: string | null;
  criadoPor: string | null;
  maquinaId: string | null;
  maquinaParada: boolean;
}

async function buscarTarefaOuFalhar(tarefaId: string): Promise<TarefaValidacao> {
  const [tarefa] = await db
    .select({
      id: tarefas.id,
      status: tarefas.status,
      responsavelId: tarefas.responsavelId,
      criadoPor: tarefas.criadoPor,
      maquinaId: tarefas.maquinaId,
      maquinaParada: tarefas.maquinaParada,
    })
    .from(tarefas)
    .where(eq(tarefas.id, tarefaId))
    .limit(1);
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

/** Conclui a tarefa com observação e fotos opcionais (RF-T16, RF-T17, RN-T03). */
export async function concluirOcorrencia(
  tarefaId: string,
  opcoes?: { observacao?: string; fotos?: string[]; autor?: Usuario; agora?: Date }
): Promise<TarefaOcorrencia> {
  const autor = opcoes?.autor ?? usuarioAtual();
  const agora = opcoes?.agora ?? new Date();
  const tarefa = await buscarTarefaOuFalhar(tarefaId);
  if (tarefa.status !== 'aberta' && tarefa.status !== 'em_andamento') {
    throw new Error('Tarefa já está encerrada.');
  }
  if (tarefa.responsavelId && tarefa.responsavelId !== autor.id && autor.papel !== 'admin') {
    throw new Error('Só o responsável ou o admin pode concluir a tarefa.');
  }
  const fotos = limparFotos(opcoes?.fotos);
  return db.transaction((tx) => {
    const atualizada = tx
      .update(tarefas)
      .set({
        status: 'concluida',
        responsavelId: tarefa.responsavelId ?? autor.id,
        syncStatus: 'pendente',
        updatedAt: agora,
      })
      .where(eq(tarefas.id, tarefaId))
      .returning()
      .get();

    tx.insert(tarefaEventos)
      .values({
        tarefaId,
        tipo: 'concluida',
        autorId: autor.id,
        ocorridoEm: agora,
        texto: opcoes?.observacao?.trim() || null,
        dados: fotos.length > 0 ? { fotos } : null,
      })
      .run();

    // Se era uma ocorrência que parou a máquina e não restam outras paradas abertas, libera a máquina
    if (tarefa.maquinaId && tarefa.maquinaParada) {
      const outraParada = tx
        .select({ id: tarefas.id })
        .from(tarefas)
        .where(
          and(
            eq(tarefas.maquinaId, tarefa.maquinaId),
            eq(tarefas.maquinaParada, true),
            inArray(tarefas.status, ['aberta', 'em_andamento'])
          )
        )
        .limit(1)
        .get();
      if (!outraParada) {
        tx.update(maquinas)
          .set({ status: 'ativa', updatedAt: agora })
          .where(eq(maquinas.id, tarefa.maquinaId))
          .run();
      }
    }

    return atualizada;
  });
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

/**
 * Devolve os caminhos locais de fotos anexadas à tarefa na ordem exata em que
 * foram registradas nos eventos (RF-T04, RF-T17).
 */
export async function listarFotosDaTarefa(tarefaId: string): Promise<string[]> {
  const eventos = await db
    .select({ dados: tarefaEventos.dados })
    .from(tarefaEventos)
    .where(and(eq(tarefaEventos.tarefaId, tarefaId), isNotNull(tarefaEventos.dados)))
    .orderBy(asc(tarefaEventos.ocorridoEm));

  const resultado: string[] = [];
  for (const ev of eventos) {
    const fotos = ev.dados?.fotos;
    if (Array.isArray(fotos)) {
      for (const f of fotos) {
        if (typeof f === 'string' && f.length > 0) resultado.push(f);
      }
    }
  }
  return resultado;
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
  if (filtros?.animalId) condicoes.push(eq(tarefas.animalId, filtros.animalId));
  if (filtros?.maquinaId) condicoes.push(eq(tarefas.maquinaId, filtros.maquinaId));

  return db
    .select()
    .from(tarefas)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(...ORDEM_PADRAO_TAREFAS);
}

export type OcorrenciaNoMapa = Pick<
  TarefaOcorrencia,
  'id' | 'titulo' | 'categoria' | 'urgente' | 'status' | 'descricao' | 'pontoLat' | 'pontoLng'
>;

/**
 * Ocorrências ativas georreferenciadas para a camada "Ocorrências" do mapa:
 * exclui concluídas e canceladas (RF-T30, RF-T31).
 */
export async function listarOcorrenciasNoMapa(): Promise<OcorrenciaNoMapa[]> {
  return db
    .select({
      id: tarefas.id,
      titulo: tarefas.titulo,
      categoria: tarefas.categoria,
      urgente: tarefas.urgente,
      status: tarefas.status,
      descricao: tarefas.descricao,
      pontoLat: tarefas.pontoLat,
      pontoLng: tarefas.pontoLng,
    })
    .from(tarefas)
    .where(
      and(
        inArray(tarefas.status, ['aberta', 'em_andamento']),
        isNotNull(tarefas.pontoLat),
        isNotNull(tarefas.pontoLng)
      )
    )
    .orderBy(desc(tarefas.urgente), desc(tarefas.createdAt));
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
