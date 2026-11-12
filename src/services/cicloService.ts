import { and, asc, desc, eq, gt, inArray, isNull, ne, sql } from 'drizzle-orm';

import {
  atualizar,
  ciclosPlantio,
  daFazenda,
  db,
  etapasCiclo,
  modelosCultura,
  naoApagado,
  newId,
  novoRegistro,
  talhoes,
  type CicloPlantio,
  type EtapaCiclo,
  type EtapaModelo,
  type ModeloCultura,
  type TipoEtapa,
} from '@/database';
import { avisarPessoa, cancelarLembretesDoCiclo, reagendarLembretesDoCiclo } from '@/services/notificacoes';
import { podeAtribuirTarefas, usuarioAtual } from '@/services/usuario';
import { adicionarDias, diasEntre, formatDiaMes, inicioDoDia } from '@/utils/date';

/**
 * Ciclos de plantio da lavoura (M4). O ciclo ativo tem o resumo copiado para a
 * área (cultura, fase, data do plantio) na mesma transação: o mapa lê rótulo e
 * selo da tabela de áreas, sem JOIN. Etapas feitas não voltam (RN-007).
 */

const ativoDaArea = (areaId: string) =>
  and(daFazenda(ciclosPlantio), eq(ciclosPlantio.areaId, areaId), eq(ciclosPlantio.status, 'ativo'));

/** O ciclo ativo da área (0 ou 1 linha: quem planta confere antes de gravar). */
export function cicloAtivoDaArea(areaId: string) {
  return db.select().from(ciclosPlantio).where(ativoDaArea(areaId)).limit(1);
}

/** Linha do tempo do ciclo, na ordem. */
export function etapasDoCiclo(cicloId: string) {
  return db
    .select()
    .from(etapasCiclo)
    .where(and(daFazenda(etapasCiclo), eq(etapasCiclo.cicloId, cicloId)))
    .orderBy(asc(etapasCiclo.ordem));
}

export interface CicloComEtapas {
  ciclo: CicloPlantio;
  etapas: EtapaCiclo[];
}

/** Painel da lavoura: o ciclo ativo e as etapas dele; null sem ciclo. */
export async function cicloAtivoComEtapas(areaId: string): Promise<CicloComEtapas | null> {
  const [ciclo] = await cicloAtivoDaArea(areaId);
  return ciclo ? { ciclo, etapas: await etapasDoCiclo(ciclo.id) } : null;
}

async function cicloPorId(cicloId: string): Promise<CicloPlantio | undefined> {
  const [ciclo] = await db
    .select()
    .from(ciclosPlantio)
    .where(and(daFazenda(ciclosPlantio), eq(ciclosPlantio.id, cicloId)))
    .limit(1);
  return ciclo;
}

/** Um ciclo qualquer com as etapas (ciclo anterior aberto da lista). */
export async function cicloComEtapas(cicloId: string): Promise<CicloComEtapas | null> {
  const ciclo = await cicloPorId(cicloId);
  return ciclo ? { ciclo, etapas: await etapasDoCiclo(ciclo.id) } : null;
}

/** Ciclos colhidos ou cancelados da área, do mais recente (RF-041). */
export function ciclosAnterioresDaArea(areaId: string) {
  return db
    .select()
    .from(ciclosPlantio)
    .where(and(daFazenda(ciclosPlantio), eq(ciclosPlantio.areaId, areaId), ne(ciclosPlantio.status, 'ativo')))
    .orderBy(desc(ciclosPlantio.dataPlantio));
}

export const TABELAS_CICLO = ['ciclos_plantio', 'etapas_ciclo'] as const;

/**
 * Etapas pendentes dos ciclos ativos nas áreas por onde uma máquina passou: a
 * sugestão "Passou no Talhão 3: marcar Pulverização como feita?" (RF-059).
 */
export function etapasPendentesNasAreas(areaIds: readonly string[]) {
  return db
    .select({ areaId: ciclosPlantio.areaId, etapa: etapasCiclo })
    .from(ciclosPlantio)
    .innerJoin(etapasCiclo, and(eq(etapasCiclo.cicloId, ciclosPlantio.id), naoApagado(etapasCiclo)))
    .where(
      and(
        daFazenda(ciclosPlantio),
        inArray(ciclosPlantio.areaId, areaIds.length > 0 ? [...areaIds] : ['']),
        eq(ciclosPlantio.status, 'ativo'),
        isNull(etapasCiclo.realizadaEm)
      )
    );
}

/** Tem ciclo ativo? ("Redesenhar X?" avisa que a conta das sementes fica desatualizada) */
export async function existeCicloAtivo(areaId: string): Promise<boolean> {
  const [ciclo] = await db.select({ id: ciclosPlantio.id }).from(ciclosPlantio).where(ativoDaArea(areaId)).limit(1);
  return ciclo !== undefined;
}

/** Reagenda os avisos do ciclo (RF-043); falha de notificação não desfaz o que foi gravado. */
async function atualizarLembretes(cicloId: string): Promise<void> {
  try {
    const [linha] = await db
      .select({ ciclo: ciclosPlantio, nomeArea: talhoes.nome })
      .from(ciclosPlantio)
      .innerJoin(talhoes, eq(talhoes.id, ciclosPlantio.areaId))
      .where(and(daFazenda(ciclosPlantio), eq(ciclosPlantio.id, cicloId)))
      .limit(1);
    if (!linha || linha.ciclo.status !== 'ativo') {
      await cancelarLembretesDoCiclo(cicloId);
      return;
    }
    await reagendarLembretesDoCiclo({
      cicloId,
      areaId: linha.ciclo.areaId,
      nomeArea: linha.nomeArea,
      cultura: linha.ciclo.cultura,
      etapas: await etapasDoCiclo(cicloId),
    });
  } catch (erro) {
    console.warn('[Plantio] Não foi possível agendar os avisos do ciclo:', erro);
  }
}

export interface DadosEtapaInicial {
  nome: string;
  tipo: TipoEtapa;
  previstaEm: Date;
  /** Já feita ao começar (plantio no passado) */
  realizadaEm: Date | null;
}

export interface DadosIniciarCiclo {
  areaId: string;
  /** Nome da cultura ("Milho silagem") */
  cultura: string;
  /** Modelo que gerou a linha do tempo (pronto ou do dono) */
  modeloId: string | null;
  dataPlantio: Date;
  /** Conta das sementes (RF-035/RF-036) */
  areaHa: number;
  taxaKgHa: number;
  sacoKg: number;
  sementesKg: number;
  sacos: number;
  etapas: readonly DadosEtapaInicial[];
}

/** Linha do tempo válida: um plantio e uma colheita, depois dele. */
function conferirEtapas(etapas: readonly { tipo: TipoEtapa; previstaEm: Date }[]): void {
  const plantios = etapas.filter((e) => e.tipo === 'plantio');
  const colheitas = etapas.filter((e) => e.tipo === 'colheita');
  if (plantios.length !== 1 || colheitas.length !== 1) {
    throw new Error('A linha do tempo precisa de um plantio e de uma colheita.');
  }
  if (diasEntre(plantios[0].previstaEm, colheitas[0].previstaEm) <= 0) {
    throw new Error('A colheita vem depois do plantio.');
  }
}

/**
 * Começa o ciclo (RF-037): grava o ciclo com a conta das sementes, as etapas e
 * o resumo na área, numa transação. Só lavoura recebe plantio (RN-004) e há no
 * máximo um ciclo ativo por área (RN-009, conferido dentro da transação).
 */
export async function iniciarCiclo(dados: DadosIniciarCiclo): Promise<string> {
  const cultura = dados.cultura.trim();
  if (!cultura) throw new Error('Escolha a cultura.');
  conferirEtapas(dados.etapas);
  const [area] = await db
    .select({ tipo: talhoes.tipo })
    .from(talhoes)
    .where(and(daFazenda(talhoes), eq(talhoes.id, dados.areaId)))
    .limit(1);
  if (!area) throw new Error('Área não encontrada.');
  if (area.tipo !== 'lavoura') throw new Error('Só lavoura recebe plantio.');

  const cicloId = newId();
  const dataPlantio = inicioDoDia(dados.dataPlantio);
  const plantado = dados.etapas.some((e) => e.tipo === 'plantio' && e.realizadaEm !== null);
  // Ordem da linha do tempo = ordem das datas (estável para datas iguais)
  const etapas = dados.etapas
    .map((etapa, indice) => ({ etapa, indice }))
    .sort((a, b) => a.etapa.previstaEm.getTime() - b.etapa.previstaEm.getTime() || a.indice - b.indice)
    .map(({ etapa }, ordem) =>
      novoRegistro({
        cicloId,
        ordem,
        nome: etapa.nome.trim(),
        tipo: etapa.tipo,
        previstaEm: inicioDoDia(etapa.previstaEm),
        realizadaEm: etapa.realizadaEm ? inicioDoDia(etapa.realizadaEm) : null,
      })
    );

  await db.transaction(async (tx) => {
    const [jaAtivo] = await tx.select({ id: ciclosPlantio.id }).from(ciclosPlantio).where(ativoDaArea(dados.areaId)).limit(1);
    if (jaAtivo) {
      throw new Error('Esta lavoura já tem um ciclo ativo. Colha ou cancele o atual antes de plantar de novo.');
    }
    await tx.insert(ciclosPlantio).values(
      novoRegistro({
        id: cicloId,
        areaId: dados.areaId,
        cultura,
        modeloId: dados.modeloId,
        dataPlantio,
        areaHa: dados.areaHa,
        taxaKgHa: dados.taxaKgHa,
        sacoKg: dados.sacoKg,
        sementesKg: dados.sementesKg,
        sacos: dados.sacos,
      })
    );
    await tx.insert(etapasCiclo).values(etapas);
    await tx
      .update(talhoes)
      .set(atualizar({ cultura, faseLavoura: plantado ? ('vegetativo' as const) : ('preparo' as const), dataPlantio }))
      .where(eq(talhoes.id, dados.areaId));
  });
  await atualizarLembretes(cicloId);
  return cicloId;
}

async function etapaPorId(etapaId: string): Promise<EtapaCiclo | undefined> {
  const [etapa] = await db
    .select()
    .from(etapasCiclo)
    .where(and(daFazenda(etapasCiclo), eq(etapasCiclo.id, etapaId)))
    .limit(1);
  return etapa;
}

async function etapaDoCicloAtivo(etapaId: string): Promise<{ etapa: EtapaCiclo; ciclo: CicloPlantio }> {
  const etapa = await etapaPorId(etapaId);
  if (!etapa) throw new Error('Etapa não encontrada.');
  const ciclo = await cicloPorId(etapa.cicloId);
  if (!ciclo || ciclo.status !== 'ativo') throw new Error('Este ciclo já foi encerrado.');
  return { etapa, ciclo };
}

/**
 * Marca a etapa como feita (RF-039). Só acréscimo (RN-007): feita não volta.
 * Plantio feito começa a contagem do ciclo na data real e leva as etapas
 * seguintes junto (as datas contam a partir do plantio, RF-038). Colheita feita
 * encerra o ciclo, que vai para os ciclos anteriores (RF-041).
 */
export async function marcarEtapaFeita(etapaId: string, quando = new Date()): Promise<void> {
  const jaFeita = await etapaPorId(etapaId);
  if (jaFeita?.realizadaEm) return;
  const { etapa, ciclo } = await etapaDoCicloAtivo(etapaId);
  const dia = inicioDoDia(quando);
  const atraso = diasEntre(etapa.previstaEm, dia);
  const seguintes =
    etapa.tipo === 'plantio' && atraso !== 0
      ? await db
          .select({ id: etapasCiclo.id, previstaEm: etapasCiclo.previstaEm })
          .from(etapasCiclo)
          .where(
            and(
              daFazenda(etapasCiclo),
              eq(etapasCiclo.cicloId, ciclo.id),
              gt(etapasCiclo.ordem, etapa.ordem),
              isNull(etapasCiclo.realizadaEm)
            )
          )
      : [];

  await db.transaction(async (tx) => {
    await tx
      .update(etapasCiclo)
      .set(atualizar({ realizadaEm: dia }))
      .where(and(eq(etapasCiclo.id, etapaId), isNull(etapasCiclo.realizadaEm)));
    if (etapa.tipo === 'plantio') {
      for (const seguinte of seguintes) {
        await tx
          .update(etapasCiclo)
          .set(atualizar({ previstaEm: adicionarDias(seguinte.previstaEm, atraso) }))
          .where(eq(etapasCiclo.id, seguinte.id));
      }
      await tx.update(ciclosPlantio).set(atualizar({ dataPlantio: dia })).where(eq(ciclosPlantio.id, ciclo.id));
      await tx
        .update(talhoes)
        .set(atualizar({ faseLavoura: 'vegetativo' as const, dataPlantio: dia }))
        .where(eq(talhoes.id, ciclo.areaId));
    } else if (etapa.tipo === 'colheita') {
      await tx
        .update(ciclosPlantio)
        .set(atualizar({ status: 'encerrado' as const, encerradoEm: dia }))
        .where(eq(ciclosPlantio.id, ciclo.id));
      await tx
        .update(talhoes)
        .set(atualizar({ cultura: null, faseLavoura: 'pousio' as const, dataPlantio: null }))
        .where(eq(talhoes.id, ciclo.areaId));
    }
  });
  await atualizarLembretes(ciclo.id);
}

/**
 * Muda a data prevista de uma etapa pendente (RF-039). Mudar o plantio ainda
 * não feito leva as outras pendentes junto e muda a data do ciclo.
 */
export async function mudarPrevisaoDaEtapa(etapaId: string, data: Date): Promise<void> {
  const { etapa, ciclo } = await etapaDoCicloAtivo(etapaId);
  if (etapa.realizadaEm) throw new Error('Etapa feita não muda de data.');
  const nova = inicioDoDia(data);
  const atraso = diasEntre(etapa.previstaEm, nova);
  if (atraso === 0) return;
  if (etapa.tipo === 'colheita' && diasEntre(ciclo.dataPlantio, nova) <= 0) {
    throw new Error('A colheita vem depois do plantio.');
  }
  const outras =
    etapa.tipo === 'plantio'
      ? await db
          .select({ id: etapasCiclo.id, previstaEm: etapasCiclo.previstaEm })
          .from(etapasCiclo)
          .where(
            and(
              daFazenda(etapasCiclo),
              eq(etapasCiclo.cicloId, ciclo.id),
              ne(etapasCiclo.id, etapaId),
              isNull(etapasCiclo.realizadaEm)
            )
          )
      : [];

  await db.transaction(async (tx) => {
    await tx.update(etapasCiclo).set(atualizar({ previstaEm: nova })).where(eq(etapasCiclo.id, etapaId));
    if (etapa.tipo === 'plantio') {
      for (const outra of outras) {
        await tx
          .update(etapasCiclo)
          .set(atualizar({ previstaEm: adicionarDias(outra.previstaEm, atraso) }))
          .where(eq(etapasCiclo.id, outra.id));
      }
      await tx.update(ciclosPlantio).set(atualizar({ dataPlantio: nova })).where(eq(ciclosPlantio.id, ciclo.id));
      await tx.update(talhoes).set(atualizar({ dataPlantio: nova })).where(eq(talhoes.id, ciclo.areaId));
    }
  });
  await atualizarLembretes(ciclo.id);
}

/** Observação da etapa (RF-039); vazia apaga. Vale também para etapa feita. */
export async function salvarObservacaoDaEtapa(etapaId: string, texto: string): Promise<void> {
  await db
    .update(etapasCiclo)
    .set(atualizar({ observacao: texto.trim() || null }))
    .where(eq(etapasCiclo.id, etapaId));
}

/** Ciclo começado por engano ou perdido: sai do painel e fica nos anteriores como cancelado. */
export async function cancelarCiclo(cicloId: string): Promise<void> {
  const ciclo = await cicloPorId(cicloId);
  if (!ciclo || ciclo.status !== 'ativo') return;
  await db.transaction(async (tx) => {
    await tx
      .update(ciclosPlantio)
      .set(atualizar({ status: 'cancelado' as const, encerradoEm: new Date() }))
      .where(and(eq(ciclosPlantio.id, cicloId), eq(ciclosPlantio.status, 'ativo')));
    await tx
      .update(talhoes)
      .set(atualizar({ cultura: null, faseLavoura: null, dataPlantio: null }))
      .where(eq(talhoes.id, ciclo.areaId));
  });
  await atualizarLembretes(cicloId);
}

/** Tela "Minhas tarefas" (tela 27): o aviso de tarefa nova abre nela. */
export const ROTA_TAREFAS = '/tarefas';

export interface Responsavel {
  id: string;
  nome: string;
}

async function nomeDaArea(areaId: string): Promise<string> {
  const [area] = await db
    .select({ nome: talhoes.nome })
    .from(talhoes)
    .where(and(daFazenda(talhoes), eq(talhoes.id, areaId)))
    .limit(1);
  return area?.nome ?? 'Lavoura';
}

/**
 * Atribui a etapa pendente a um colaborador (RF-067): ela vira tarefa dele;
 * null tira o responsável. Só o dono atribui. A pessoa recebe o aviso
 * (RF-070; sem API de push, simulado: ver `avisarPessoa`).
 */
export async function atribuirEtapa(etapaId: string, responsavel: Responsavel | null, agora = new Date()): Promise<void> {
  const quem = usuarioAtual();
  if (!podeAtribuirTarefas(quem)) throw new Error('Só o dono da fazenda atribui tarefas.');
  const { etapa, ciclo } = await etapaDoCicloAtivo(etapaId);
  if (etapa.realizadaEm) throw new Error('Etapa feita não vira tarefa.');
  await db
    .update(etapasCiclo)
    .set(
      atualizar(
        responsavel
          ? { responsavelId: responsavel.id, responsavelNome: responsavel.nome, atribuidaEm: agora, atribuidaPor: quem.id }
          : { responsavelId: null, responsavelNome: null, atribuidaEm: null, atribuidaPor: null }
      )
    )
    .where(eq(etapasCiclo.id, etapaId));
  if (responsavel && responsavel.id !== etapa.responsavelId) {
    const area = await nomeDaArea(ciclo.areaId);
    await avisarPessoa(
      responsavel.id,
      {
        titulo: `Nova tarefa: ${etapa.nome}`,
        mensagem: `${area} · ${ciclo.cultura} · prevista para ${formatDiaMes(etapa.previstaEm)}`,
        url: ROTA_TAREFAS,
      },
      agora
    ).catch(() => 'semEnvio');
  }
}

/** As tarefas da pessoa (RF-068): etapas atribuídas a ela, com a cultura e a área, por data. */
export function tarefasDe(responsavelId: string) {
  return db
    .select({
      etapa: etapasCiclo,
      cultura: ciclosPlantio.cultura,
      cicloStatus: ciclosPlantio.status,
      areaId: talhoes.id,
      areaNome: talhoes.nome,
      areaTipo: talhoes.tipo,
    })
    .from(etapasCiclo)
    .innerJoin(ciclosPlantio, and(eq(ciclosPlantio.id, etapasCiclo.cicloId), naoApagado(ciclosPlantio)))
    .innerJoin(talhoes, and(eq(talhoes.id, ciclosPlantio.areaId), naoApagado(talhoes)))
    .where(and(daFazenda(etapasCiclo), eq(etapasCiclo.responsavelId, responsavelId), ne(ciclosPlantio.status, 'cancelado')))
    .orderBy(asc(etapasCiclo.previstaEm));
}
export type Tarefa = Awaited<ReturnType<typeof tarefasDe>>[number];
export const TABELAS_TAREFAS = ['etapas_ciclo', 'ciclos_plantio', 'talhoes'] as const;

/**
 * Conclui a tarefa (RF-069): é marcar a etapa como feita na linha do tempo do
 * ciclo. Quem atribuiu recebe o aviso (RF-070; sem API de push, simulado).
 */
export async function concluirTarefa(etapaId: string, quando = new Date()): Promise<void> {
  const etapa = await etapaPorId(etapaId);
  if (!etapa) throw new Error('Tarefa não encontrada.');
  const ciclo = await cicloPorId(etapa.cicloId);
  await marcarEtapaFeita(etapaId, quando);
  const quem = usuarioAtual();
  if (ciclo && etapa.atribuidaPor && etapa.atribuidaPor !== quem.id) {
    const area = await nomeDaArea(ciclo.areaId);
    await avisarPessoa(
      etapa.atribuidaPor,
      {
        titulo: `${quem.nome} concluiu ${etapa.nome}`,
        mensagem: `${area} · ${ciclo.cultura}`,
        url: `/mapa-fazenda?talhao=${encodeURIComponent(ciclo.areaId)}&vista=ciclo`,
      },
      quando
    ).catch(() => 'semEnvio');
  }
}

/** Modelos criados na fazenda, por nome (os prontos ficam no código). */
export function modelosDoAdmin() {
  return db.select().from(modelosCultura).where(daFazenda(modelosCultura)).orderBy(asc(modelosCultura.nome));
}

export const TABELAS_MODELOS = ['modelos_cultura'] as const;

export interface DadosModeloCultura {
  nome: string;
  taxaKgHa: number | null;
  sacoKg: number;
  etapas: EtapaModelo[];
}

/** Modelo próprio da fazenda (RF-042): aparece no "Plantar" junto com os prontos. */
export async function criarModeloCultura(dados: DadosModeloCultura): Promise<ModeloCultura> {
  const nome = dados.nome.trim();
  if (!nome) throw new Error('Dê um nome à cultura.');
  const plantios = dados.etapas.filter((e) => e.tipo === 'plantio');
  const colheitas = dados.etapas.filter((e) => e.tipo === 'colheita');
  if (plantios.length !== 1 || colheitas.length !== 1 || colheitas[0].dias <= plantios[0].dias) {
    throw new Error('O modelo precisa de um plantio e de uma colheita depois dele.');
  }
  const [repetido] = await db
    .select({ id: modelosCultura.id })
    .from(modelosCultura)
    .where(and(daFazenda(modelosCultura), sql`lower(${modelosCultura.nome}) = lower(${nome})`))
    .limit(1);
  if (repetido) throw new Error('Já existe uma cultura com esse nome.');
  const [modelo] = await db
    .insert(modelosCultura)
    .values(
      novoRegistro({
        nome,
        taxaKgHa: dados.taxaKgHa && dados.taxaKgHa > 0 ? dados.taxaKgHa : null,
        sacoKg: dados.sacoKg > 0 ? dados.sacoKg : 20,
        etapas: dados.etapas,
      })
    )
    .returning();
  return modelo;
}
