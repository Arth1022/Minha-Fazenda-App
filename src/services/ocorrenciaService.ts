import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, sql, type SQL } from 'drizzle-orm';

import {
  animais,
  atualizar,
  daFazenda,
  db,
  maquinas,
  novoRegistro,
  ocorrenciasMaquina,
  talhoes,
  tarefaEventos,
  tarefas,
  type CategoriaProblema,
  type CategoriaTarefa,
  type NovoTarefaEvento,
  type OcorrenciaMaquina,
  type OrigemTarefa,
  type StatusTarefa,
  type Talhao,
  type TarefaEvento,
  type TarefaOcorrencia,
} from '@/database';
import {
  podeAtribuirTarefas,
  podeCancelarTarefa,
  podeCriarTarefaManual,
  podeEditarTarefa,
  podeIniciarOuConcluirTarefa,
  usuarioAtual,
  type Usuario,
} from '@/services/usuario';
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
  autor?: Usuario;
  autorId?: string;
  agora?: Date;
}

/** Problema relatado pela tela de Máquinas: vira um registro da máquina e uma tarefa. */
export interface ProblemaMaquinaInput {
  maquinaId: string;
  categoria: CategoriaProblema;
  /** "Dá para continuar usando?" — não: a máquina fica parada por problema */
  podeUsar: boolean;
  /** Título já montado pela tela (ex.: "Motor — Trator (TR-01)") */
  titulo: string;
  descricao?: string | null;
  urgente?: boolean;
  responsavelId?: string | null;
  usoId?: string | null;
  /** Foto guardada para o registro da máquina */
  fotoUri?: string | null;
  /** Outra cópia da mesma foto para a tarefa: o envio de mídia apaga o arquivo depois de subir */
  fotoTarefaUri?: string | null;
  /** Fotos da tarefa (relato com várias fotos); sem isso, vale `fotoTarefaUri` */
  fotosTarefa?: string[];
  /** Nota de voz da tarefa */
  audioUri?: string | null;
  lat?: number | null;
  lng?: number | null;
  autor?: Usuario;
  agora?: Date;
}

export interface EditarOcorrenciaInput {
  titulo?: string;
  categoria?: CategoriaTarefa;
  descricao?: string | null;
  urgente?: boolean;
  prazo?: Date | null;
  areaId?: string | null;
  animalId?: string | null;
  maquinaId?: string | null;
  pontoLat?: number | null;
  pontoLng?: number | null;
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

function formatarIdentificacaoAnimal(animal: { nome: string | null; brinco: string }): string {
  const num = animal.brinco.replace(/^#/, '');
  return animal.nome ? `${animal.nome} (#${num})` : `Brinco #${num}`;
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
        daFazenda(talhoes),
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

/** Dados do registro da máquina gravado na mesma transação da tarefa. */
type RegistroProblema = Pick<ProblemaMaquinaInput, 'categoria' | 'podeUsar' | 'usoId' | 'fotoUri' | 'lat' | 'lng'>;

/**
 * Cria uma ocorrência ou tarefa e registra o evento inicial 'criada' na mesma
 * transação (RN-T01, RN-T06, RF-T06, RF-T10, RF-T20).
 */
export async function criarOcorrencia(input: CriarOcorrenciaInput): Promise<TarefaOcorrencia> {
  return (await criarTarefa(input, null)).tarefa;
}

/**
 * Problema na máquina (tela de Máquinas): grava o registro da máquina e a tarefa
 * do conserto numa transação só, ligados por `ocorrencias_maquina.tarefa_id`.
 * A situação da máquina vem do registro ("não dá para usar" = parada), por isso
 * o status em `maquinas` não muda aqui.
 */
export async function registrarProblemaMaquina(
  input: ProblemaMaquinaInput
): Promise<{ tarefa: TarefaOcorrencia; ocorrencia: OcorrenciaMaquina }> {
  const { tarefa, ocorrencia } = await criarTarefa(
    {
      titulo: input.titulo,
      categoria: 'maquina',
      descricao: input.descricao,
      urgente: input.urgente,
      responsavelId: input.responsavelId,
      maquinaId: input.maquinaId,
      maquinaParada: !input.podeUsar,
      pontoLat: input.lat ?? null,
      pontoLng: input.lng ?? null,
      fotos: input.fotosTarefa ?? (input.fotoTarefaUri ? [input.fotoTarefaUri] : []),
      audioUri: input.audioUri,
      autor: input.autor,
      agora: input.agora,
    },
    {
      categoria: input.categoria,
      podeUsar: input.podeUsar,
      usoId: input.usoId,
      fotoUri: input.fotoUri,
      lat: input.lat,
      lng: input.lng,
    }
  );
  return { tarefa, ocorrencia: ocorrencia as OcorrenciaMaquina };
}

async function criarTarefa(
  input: CriarOcorrenciaInput,
  problema: RegistroProblema | null
): Promise<{ tarefa: TarefaOcorrencia; ocorrencia: OcorrenciaMaquina | null }> {
  const agora = input.agora ?? new Date();
  const atual = usuarioAtual();
  const autor: Usuario =
    input.autor ??
    (input.autorId && input.autorId !== atual.id
      ? { id: input.autorId, nome: input.autorId }
      : atual);
  const autorId = input.autorId ?? autor.id;
  const origem = input.origem ?? 'ocorrencia';

  // RF-T11: Criar tarefa manual é exclusivo do admin
  if (origem === 'manual' && !podeCriarTarefaManual(autor)) {
    throw new Error('Só o admin pode criar tarefas manuais.');
  }
  // RF-T14: Colaboradores não atribuem tarefas a outras pessoas
  if (input.responsavelId && input.responsavelId !== autorId && !podeAtribuirTarefas(autor)) {
    throw new Error('Colaboradores não podem atribuir tarefas a outras pessoas.');
  }

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
      .where(and(daFazenda(animais), eq(animais.id, animalId)))
      .limit(1);
    if (!animal) throw new Error('Animal vinculado não encontrado no rebanho.');
    contextoNome = formatarIdentificacaoAnimal(animal);
  }

  if (maquinaId) {
    const [maquina] = await db
      .select({ id: maquinas.id, nome: maquinas.nome, codigo: maquinas.codigo })
      .from(maquinas)
      .where(and(daFazenda(maquinas), eq(maquinas.id, maquinaId)))
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
      .where(and(daFazenda(talhoes), eq(talhoes.id, areaId)))
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

  return db.transaction(async (tx) => {
    const [criada] = await tx
      .insert(tarefas)
      .values({
        ...novoRegistro({
          titulo,
          categoria: input.categoria,
          origem,
          descricao: input.descricao?.trim() || null,
          urgente: input.urgente ?? maquinaParada,
          status: 'aberta' as const,
          responsavelId: input.responsavelId ?? null,
          prazo: input.prazo ?? null,
          areaId,
          animalId,
          maquinaId,
          maquinaParada,
          audioUri,
          pontoLat,
          pontoLng,
          syncStatus: 'pendente' as const,
        }),
        createdBy: autorId,
      })
      .returning();

    await tx.insert(tarefaEventos).values(
      novoRegistro({
        tarefaId: criada.id,
        tipo: 'criada' as const,
        autorId,
        ocorridoEm: agora,
        texto: criada.descricao,
        dados: Object.keys(dadosEvento).length > 0 ? dadosEvento : null,
      })
    );

    if (problema && maquinaId) {
      const [ocorrencia] = await tx
        .insert(ocorrenciasMaquina)
        .values(
          novoRegistro({
            maquinaId,
            usoId: problema.usoId ?? null,
            operador: autor.nome,
            operadorId: autor.id,
            categoria: problema.categoria,
            podeUsar: problema.podeUsar,
            descricao: criada.descricao,
            fotoUri: problema.fotoUri ?? null,
            lat: problema.lat ?? null,
            lng: problema.lng ?? null,
            registradoEm: agora,
            tarefaId: criada.id,
          })
        )
        .returning();
      return { tarefa: criada, ocorrencia };
    }

    // Tarefa antiga de "Máquina parada" (sem registro na máquina): coloca em manutenção
    if (maquinaId && maquinaParada) {
      await tx
        .update(maquinas)
        .set(atualizar({ status: 'manutencao' }))
        .where(and(daFazenda(maquinas), eq(maquinas.id, maquinaId)));
    }

    return { tarefa: criada, ocorrencia: null };
  });
}

interface TarefaValidacao {
  id: string;
  origem: OrigemTarefa;
  status: StatusTarefa;
  responsavelId: string | null;
  createdBy: string | null;
  maquinaId: string | null;
  maquinaParada: boolean;
}

async function buscarTarefaOuFalhar(tarefaId: string): Promise<TarefaValidacao> {
  const [tarefa] = await db
    .select({
      id: tarefas.id,
      origem: tarefas.origem,
      status: tarefas.status,
      responsavelId: tarefas.responsavelId,
      createdBy: tarefas.createdBy,
      maquinaId: tarefas.maquinaId,
      maquinaParada: tarefas.maquinaParada,
    })
    .from(tarefas)
    .where(and(daFazenda(tarefas), eq(tarefas.id, tarefaId)))
    .limit(1);
  if (!tarefa) throw new Error('Tarefa não encontrada.');
  return tarefa;
}

/**
 * Toda mudança de estado: atualiza o cache em `tarefas` e acrescenta o evento
 * em `tarefa_eventos` na mesma transação (nunca um sem o outro).
 */
async function transicionar(
  tarefaId: string,
  campos: Partial<Pick<TarefaOcorrencia, 'status' | 'responsavelId'>>,
  evento: Pick<NovoTarefaEvento, 'tipo' | 'autorId' | 'texto' | 'dados'>,
  agora: Date
): Promise<TarefaOcorrencia> {
  return db.transaction(async (tx) => {
    const [atualizada] = await tx
      .update(tarefas)
      .set(atualizar({ ...campos, syncStatus: 'pendente' }))
      .where(and(daFazenda(tarefas), eq(tarefas.id, tarefaId)))
      .returning();
    await tx.insert(tarefaEventos).values(
      novoRegistro({
        ...evento,
        tarefaId,
        ocorridoEm: agora,
      })
    );
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
  if (tarefa.status === 'aberta') {
    throw new Error('Só dá para desistir de uma tarefa depois de iniciá-la.');
  }
  if (tarefa.status !== 'em_andamento') {
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
  if (!podeIniciarOuConcluirTarefa(tarefa, autor)) {
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
  if (tarefa.status === 'aberta') {
    throw new Error('Inicie a tarefa antes de concluí-la.');
  }
  if (tarefa.status !== 'em_andamento') {
    throw new Error('Tarefa já está encerrada.');
  }
  if (!podeIniciarOuConcluirTarefa(tarefa, autor)) {
    throw new Error('Só o responsável ou o admin pode concluir a tarefa.');
  }
  const fotos = limparFotos(opcoes?.fotos);
  return db.transaction(async (tx) => {
    const [atualizada] = await tx
      .update(tarefas)
      .set(
        atualizar({
          status: 'concluida',
          responsavelId: tarefa.responsavelId ?? autor.id,
          syncStatus: 'pendente',
          concluidaEm: agora,
        })
      )
      .where(and(daFazenda(tarefas), eq(tarefas.id, tarefaId)))
      .returning();

    await tx.insert(tarefaEventos).values(
      novoRegistro({
        tarefaId,
        tipo: 'concluida' as const,
        autorId: autor.id,
        ocorridoEm: agora,
        texto: opcoes?.observacao?.trim() || null,
        dados: fotos.length > 0 ? { fotos } : null,
      })
    );

    // Tarefa aberta por um problema da máquina: concluir resolve o problema (a situação vem dele)
    const [problema] = tarefa.maquinaId
      ? await tx
          .select({ id: ocorrenciasMaquina.id })
          .from(ocorrenciasMaquina)
          .where(and(daFazenda(ocorrenciasMaquina), eq(ocorrenciasMaquina.tarefaId, tarefaId)))
          .limit(1)
      : [];
    if (problema) {
      await tx
        .update(ocorrenciasMaquina)
        .set(atualizar({ resolvidaEm: agora }))
        .where(and(eq(ocorrenciasMaquina.tarefaId, tarefaId), isNull(ocorrenciasMaquina.resolvidaEm)));
    }

    // Tarefa antiga que parou a máquina: sem outras paradas abertas, libera a máquina
    if (!problema && tarefa.maquinaId && tarefa.maquinaParada) {
      const [outraParada] = await tx
        .select({ id: tarefas.id })
        .from(tarefas)
        .where(
          and(
            daFazenda(tarefas),
            eq(tarefas.maquinaId, tarefa.maquinaId),
            eq(tarefas.maquinaParada, true),
            inArray(tarefas.status, ['aberta', 'em_andamento']),
            ne(tarefas.id, tarefaId)
          )
        )
        .limit(1);
      if (!outraParada) {
        await tx
          .update(maquinas)
          .set(atualizar({ status: 'ativa' }))
          .where(and(daFazenda(maquinas), eq(maquinas.id, tarefa.maquinaId)));
      }
    }

    return atualizada;
  });
}

/**
 * "Marcar como resolvido" na ficha da máquina: resolve o problema e conclui a
 * tarefa ligada a ele (se ainda estiver aberta ou em andamento), numa transação.
 * Tarefa cancelada não volta: o problema continua em aberto até alguém resolver (RN-T11).
 */
export async function resolverProblemaMaquina(
  ocorrenciaId: string,
  autor: Usuario = usuarioAtual(),
  agora = new Date()
): Promise<void> {
  await db.transaction(async (tx) => {
    const [problema] = await tx
      .update(ocorrenciasMaquina)
      .set(atualizar({ resolvidaEm: agora }))
      .where(
        and(
          daFazenda(ocorrenciasMaquina),
          eq(ocorrenciasMaquina.id, ocorrenciaId),
          isNull(ocorrenciasMaquina.resolvidaEm)
        )
      )
      .returning({ tarefaId: ocorrenciasMaquina.tarefaId });
    if (!problema?.tarefaId) return;

    const [concluida] = await tx
      .update(tarefas)
      .set(
        atualizar({
          status: 'concluida' as const,
          responsavelId: sql`coalesce(${tarefas.responsavelId}, ${autor.id})`,
          syncStatus: 'pendente' as const,
          concluidaEm: agora,
        })
      )
      .where(
        and(
          daFazenda(tarefas),
          eq(tarefas.id, problema.tarefaId),
          inArray(tarefas.status, ['aberta', 'em_andamento'])
        )
      )
      .returning({ id: tarefas.id });
    if (!concluida) return;

    await tx.insert(tarefaEventos).values(
      novoRegistro({
        tarefaId: concluida.id,
        tipo: 'concluida' as const,
        autorId: autor.id,
        ocorridoEm: agora,
        texto: 'Problema marcado como resolvido na ficha da máquina.',
        dados: null,
      })
    );
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
  if (!podeCancelarTarefa(tarefa, autor)) {
    throw new Error('Só quem criou a tarefa pode cancelá-la.');
  }
  return transicionar(tarefaId, { status: 'cancelada' }, { tipo: 'cancelada', autorId: autor.id, texto: motivoLimpo }, agora);
}

/**
 * Edita categoria, local e vínculos da tarefa (Tabela de Atores e Permissões, RN-T09):
 * Admin pode em qualquer tarefa ativa; colaborador apenas nas que relatou enquanto abertas.
 */
export async function editarOcorrencia(
  tarefaId: string,
  dados: EditarOcorrenciaInput,
  autor: Usuario = usuarioAtual(),
  agora = new Date()
): Promise<TarefaOcorrencia> {
  const tarefa = await buscarTarefaOuFalhar(tarefaId);
  if (!podeEditarTarefa(tarefa, autor)) {
    throw new Error('Só o admin ou quem relatou enquanto aberta pode editar a tarefa.');
  }
  if (
    tarefa.origem !== 'ocorrencia' &&
    tarefa.origem !== 'manual' &&
    (dados.categoria !== undefined ||
      dados.areaId !== undefined ||
      dados.animalId !== undefined ||
      dados.maquinaId !== undefined)
  ) {
    throw new Error('Tarefa gerada por outro módulo não pode ter categoria ou vínculo de origem alterados.');
  }
  const campos: Record<string, unknown> = { syncStatus: 'pendente' as const, updatedAt: agora };
  if (dados.titulo !== undefined) campos.titulo = dados.titulo.trim();
  if (dados.categoria !== undefined) campos.categoria = dados.categoria;
  if (dados.descricao !== undefined) campos.descricao = dados.descricao?.trim() || null;
  if (dados.urgente !== undefined) campos.urgente = dados.urgente;
  if (dados.prazo !== undefined) campos.prazo = dados.prazo;
  if (dados.areaId !== undefined) campos.areaId = dados.areaId;
  if (dados.animalId !== undefined) campos.animalId = dados.animalId;
  if (dados.maquinaId !== undefined) campos.maquinaId = dados.maquinaId;
  if (dados.pontoLat !== undefined) campos.pontoLat = dados.pontoLat;
  if (dados.pontoLng !== undefined) campos.pontoLng = dados.pontoLng;

  const [atualizada] = await db
    .update(tarefas)
    .set(campos)
    .where(and(daFazenda(tarefas), eq(tarefas.id, tarefaId)))
    .returning();
  return atualizada;
}

/**
 * Qualquer usuário pode adicionar observação ou foto a uma tarefa aberta ou em andamento (RF-T18).
 */
export async function adicionarObservacaoOcorrencia(
  tarefaId: string,
  opcoes: { texto?: string; fotos?: string[]; autor?: Usuario; agora?: Date }
): Promise<TarefaEvento> {
  const autor = opcoes.autor ?? usuarioAtual();
  const agora = opcoes.agora ?? new Date();
  const tarefa = await buscarTarefaOuFalhar(tarefaId);
  if (tarefa.status !== 'aberta' && tarefa.status !== 'em_andamento') {
    throw new Error('Apenas tarefas abertas ou em andamento aceitam novas observações.');
  }
  const textoLimpo = opcoes.texto?.trim() || null;
  const fotos = limparFotos(opcoes.fotos);
  if (!textoLimpo && fotos.length === 0) {
    throw new Error('Informe uma observação ou foto.');
  }
  const [evento] = await db
    .insert(tarefaEventos)
    .values(
      novoRegistro({
        tarefaId,
        tipo: 'observacao' as const,
        autorId: autor.id,
        ocorridoEm: agora,
        texto: textoLimpo,
        dados: fotos.length > 0 ? { fotos } : null,
      })
    )
    .returning();
  return evento;
}

/** Histórico append-only de eventos de uma tarefa (RF-T20). */
export async function listarEventosDaTarefa(tarefaId: string): Promise<TarefaEvento[]> {
  return db
    .select()
    .from(tarefaEventos)
    .where(and(daFazenda(tarefaEventos), eq(tarefaEventos.tarefaId, tarefaId)))
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
    .where(
      and(
        daFazenda(tarefaEventos),
        eq(tarefaEventos.tarefaId, tarefaId),
        isNotNull(tarefaEventos.dados)
      )
    )
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
        daFazenda(tarefas),
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
  const condicoes: SQL[] = [daFazenda(tarefas)];
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
    .where(and(...condicoes))
    .orderBy(...ORDEM_PADRAO_TAREFAS);
}

export type OcorrenciaNoMapa = Pick<
  TarefaOcorrencia,
  'id' | 'titulo' | 'categoria' | 'urgente' | 'status' | 'responsavelId' | 'descricao' | 'pontoLat' | 'pontoLng'
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
      responsavelId: tarefas.responsavelId,
      descricao: tarefas.descricao,
      pontoLat: tarefas.pontoLat,
      pontoLng: tarefas.pontoLng,
    })
    .from(tarefas)
    .where(
      and(
        daFazenda(tarefas),
        inArray(tarefas.status, ['aberta', 'em_andamento']),
        isNotNull(tarefas.pontoLat),
        isNotNull(tarefas.pontoLng)
      )
    )
    .orderBy(desc(tarefas.urgente), desc(tarefas.createdAt));
}
