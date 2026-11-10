import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, ne, or, sql } from 'drizzle-orm';

import { db, maquinas, paradasUso, pontosGps, talhoes as tabelaAreas, usosArea, usosMaquina } from '@/database';
import type { AtividadeUso, MotivoFimUso, UsoMaquina } from '@/dtos';
import { usuarioAtual, type Usuario } from '@/services/usuario';
import { faixaDeTrabalhoKmh, MOTIVOS_AUTOMATICOS, TEMPOS } from '../services/padroes';
import { deveDescartar, resumirRastro, type PontoLido, type ResumoRastro } from '../services/rastro';
import { talhoesParaRastro } from './talhoes';

/** Usos em andamento de toda a frota (as máquinas ligadas agora). */
export function usosEmAberto() {
  return db.select().from(usosMaquina).where(isNull(usosMaquina.fim));
}

/** Uso em andamento de uma pessoa (no máximo um: ninguém dirige duas máquinas). */
export function usoAbertoDoOperador(operadorId: string) {
  return db
    .select()
    .from(usosMaquina)
    .where(and(eq(usosMaquina.operadorId, operadorId), isNull(usosMaquina.fim)))
    .limit(1);
}

/** Usos que tocam o período a partir de `desde` (inclui o que começou antes e ainda corria). */
export function usosDaMaquinaDesde(maquinaId: string, desde: Date) {
  return db
    .select()
    .from(usosMaquina)
    .where(
      and(
        eq(usosMaquina.maquinaId, maquinaId),
        or(isNull(usosMaquina.fim), gte(usosMaquina.fim, desde))
      )
    );
}

/** Últimos usos da máquina, do mais recente para o mais antigo. */
export function usosRecentes(maquinaId: string, limite = 10) {
  return db
    .select()
    .from(usosMaquina)
    .where(eq(usosMaquina.maquinaId, maquinaId))
    .orderBy(desc(usosMaquina.inicio))
    .limit(limite);
}

/** Usos em que o implemento foi engatado (o uso dele vem da máquina que o puxou). */
export function usosDoImplemento(implementoId: string, limite = 10) {
  return db
    .select()
    .from(usosMaquina)
    .where(eq(usosMaquina.implementoId, implementoId))
    .orderBy(desc(usosMaquina.inicio))
    .limit(limite);
}

/** Soma (ms) dos usos encerrados da máquina, calculada no próprio SQLite. */
export function tempoTotalRegistrado(maquinaId: string) {
  return db
    .select({
      totalMs: sql<number>`coalesce(sum(${usosMaquina.fim} - ${usosMaquina.inicio}), 0)`,
    })
    .from(usosMaquina)
    .where(and(eq(usosMaquina.maquinaId, maquinaId), isNotNull(usosMaquina.fim)));
}

export interface Posicao {
  lat: number;
  lng: number;
}

export interface DadosIniciarUso {
  /** Quem vai operar (padrão: o usuário do celular) */
  operador?: Usuario;
  implementoId?: string | null;
  atividade?: AtividadeUso | null;
  /** O GPS vai acompanhar o uso */
  rastreado?: boolean;
  posicao?: Posicao | null;
  /** A máquina está em uso por outra pessoa: fecha o uso dela agora e abre o novo */
  assumir?: boolean;
}

/**
 * Liga a máquina: abre um uso a partir de `agora`. Recusa máquina inativa,
 * implemento (ele é ligado junto com a máquina que o puxa), máquina já ligada
 * (a não ser ao assumir o uso de outra pessoa) e quem já está usando outra.
 */
export async function iniciarUso(
  maquinaId: string,
  dados: DadosIniciarUso = {},
  agora = new Date()
): Promise<UsoMaquina> {
  const operador = dados.operador ?? usuarioAtual();
  return db.transaction((tx) => {
    const maquina = tx.select().from(maquinas).where(eq(maquinas.id, maquinaId)).get();
    if (!maquina) throw new Error('Máquina não encontrada');
    if (maquina.status === 'inativa') throw new Error('Máquina inativa não pode ser ligada');
    if (maquina.categoria === 'implemento') {
      throw new Error('Implemento não liga sozinho: ligue a máquina que vai puxá-lo e escolha o implemento.');
    }

    const aberto = tx
      .select()
      .from(usosMaquina)
      .where(and(eq(usosMaquina.maquinaId, maquinaId), isNull(usosMaquina.fim)))
      .get();
    if (aberto) {
      // Sem operador: uso de antes do registro de quem opera, feito neste celular
      const deOutraPessoa = aberto.operadorId !== null && aberto.operadorId !== operador.id;
      if (!dados.assumir || !deOutraPessoa) throw new Error('A máquina já está em uso');
      // Troca de turno: o uso da outra pessoa termina agora
      tx.update(usosMaquina)
        .set({ fim: agora, fimMotivo: 'assumida' })
        .where(eq(usosMaquina.id, aberto.id))
        .run();
      tx.update(paradasUso)
        .set({ fim: agora })
        .where(and(eq(paradasUso.usoId, aberto.id), isNull(paradasUso.fim)))
        .run();
    }

    const outraDaPessoa = tx
      .select({ nome: maquinas.nome })
      .from(usosMaquina)
      .innerJoin(maquinas, eq(maquinas.id, usosMaquina.maquinaId))
      .where(
        and(
          eq(usosMaquina.operadorId, operador.id),
          isNull(usosMaquina.fim),
          ne(usosMaquina.maquinaId, maquinaId)
        )
      )
      .get();
    if (outraDaPessoa) throw new Error(`Você está usando ${outraDaPessoa.nome}: desligue antes de ligar outra.`);

    // Uso novo: o "Desfazer" dos usos anteriores da pessoa acabou; os pontos guardados saem
    tx.delete(pontosGps)
      .where(
        inArray(
          pontosGps.usoId,
          tx
            .select({ id: usosMaquina.id })
            .from(usosMaquina)
            .where(and(eq(usosMaquina.operadorId, operador.id), isNotNull(usosMaquina.fim)))
        )
      )
      .run();

    const implementoId = dados.implementoId ?? null;
    if (implementoId) {
      const implemento = tx.select().from(maquinas).where(eq(maquinas.id, implementoId)).get();
      if (!implemento || implemento.categoria !== 'implemento') throw new Error('Implemento não encontrado');
      if (implemento.status === 'inativa') throw new Error(`${implemento.nome} está inativo`);
      const engatado = tx
        .select({ id: usosMaquina.id })
        .from(usosMaquina)
        .where(and(eq(usosMaquina.implementoId, implementoId), isNull(usosMaquina.fim)))
        .get();
      if (engatado) throw new Error(`${implemento.nome} já está engatado em outra máquina`);
    }

    return tx
      .insert(usosMaquina)
      .values({
        maquinaId,
        inicio: agora,
        operador: operador.nome,
        operadorId: operador.id,
        implementoId,
        atividade: dados.atividade ?? null,
        rastreado: dados.rastreado ?? false,
        inicioLat: dados.posicao?.lat ?? null,
        inicioLng: dados.posicao?.lng ?? null,
      })
      .returning()
      .get();
  });
}

function usoAbertoDaMaquina(maquinaId: string) {
  return db
    .select()
    .from(usosMaquina)
    .where(and(eq(usosMaquina.maquinaId, maquinaId), isNull(usosMaquina.fim)))
    .get();
}

export interface OpcoesEncerrar {
  /** Hora do fim (padrão: agora). As regras automáticas usam a do último movimento. */
  fim?: Date;
  motivo?: MotivoFimUso;
  posicao?: Posicao | null;
}

export interface UsoEncerrado {
  /** O uso como ficou; null quando foi descartado (ligado sem querer) */
  uso: UsoMaquina | null;
  descartado: boolean;
}

/** Pontos de GPS gravados do uso, do mais antigo ao mais novo. */
export async function pontosDoUso(usoId: string, desde?: Date): Promise<PontoLido[]> {
  const filtro = desde
    ? and(eq(pontosGps.usoId, usoId), gte(pontosGps.registradoEm, desde))
    : eq(pontosGps.usoId, usoId);
  const linhas = await db.select().from(pontosGps).where(filtro).orderBy(asc(pontosGps.registradoEm));
  return linhas.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    precisaoM: p.precisaoM,
    velocidadeMs: p.velocidadeMs,
    simulado: p.simulado,
    em: p.registradoEm.getTime(),
  }));
}

/** Pausas do uso (com fim nulo = em pausa). */
export function pausasDoUso(usoId: string) {
  return db
    .select()
    .from(paradasUso)
    .where(and(eq(paradasUso.usoId, usoId), eq(paradasUso.motivo, 'pausa')))
    .orderBy(asc(paradasUso.inicio));
}

/** Resumo do rastro do uso até `fim` (KM, tempos, talhões, área). */
export async function calcularResumo(uso: UsoMaquina, fim: Date): Promise<ResumoRastro> {
  const [pontos, pausas, maquina, implemento, talhoes] = await Promise.all([
    pontosDoUso(uso.id),
    pausasDoUso(uso.id),
    db.select().from(maquinas).where(eq(maquinas.id, uso.maquinaId)).get(),
    uso.implementoId
      ? db.select().from(maquinas).where(eq(maquinas.id, uso.implementoId)).get()
      : Promise.resolve(undefined),
    talhoesParaRastro(),
  ]);
  return resumirRastro(pontos, {
    inicio: uso.inicio.getTime(),
    fim: fim.getTime(),
    pausas: pausas.map((p) => ({ inicio: p.inicio.getTime(), fim: p.fim?.getTime() ?? null })),
    talhoes,
    faixaTrabalhoKmh: maquina ? faixaDeTrabalhoKmh(maquina.tipo) : null,
    larguraM: implemento?.larguraTrabalhoM ?? null,
  });
}

/**
 * Desliga a máquina: fecha o uso em aberto, grava o resumo do rastro e apaga os
 * pontos de GPS (o rastro simplificado fica no uso). Uso ligado sem querer
 * (menos de 1 min e quase sem andar) é descartado e não aparece em lugar nenhum.
 */
export async function encerrarUso(maquinaId: string, opcoes: OpcoesEncerrar = {}): Promise<UsoEncerrado> {
  const uso = usoAbertoDaMaquina(maquinaId);
  if (!uso) throw new Error('A máquina não está em uso');
  return fecharUso(uso, opcoes);
}

export async function fecharUso(uso: UsoMaquina, opcoes: OpcoesEncerrar = {}): Promise<UsoEncerrado> {
  // O fim nunca fica antes do início (relógio, ou regra automática com poucos pontos)
  const fim = new Date(Math.max(uso.inicio.getTime(), (opcoes.fim ?? new Date()).getTime()));
  const resumo = uso.rastreado ? await calcularResumo(uso, fim) : null;

  if (deveDescartar(fim.getTime() - uso.inicio.getTime(), resumo?.kmTotal ?? null)) {
    await db.delete(usosMaquina).where(eq(usosMaquina.id, uso.id));
    return { uso: null, descartado: true };
  }

  const ultimo = resumo?.rastro[resumo.rastro.length - 1];
  // Fim automático guarda os pontos por um tempo: o "Desfazer" (RF-050) retoma com o rastro inteiro
  const automatico = MOTIVOS_AUTOMATICOS.has(opcoes.motivo ?? 'manual');
  const encerrado = db.transaction((tx) => {
    const fechado = tx
      .update(usosMaquina)
      .set({
        fim,
        fimMotivo: opcoes.motivo ?? 'manual',
        fimLat: opcoes.posicao?.lat ?? (ultimo ? ultimo[1] : null),
        fimLng: opcoes.posicao?.lng ?? (ultimo ? ultimo[0] : null),
        paradaAvisadaEm: null,
        ...(resumo
          ? {
              kmTotal: resumo.kmTotal,
              kmTrabalhando: resumo.kmTrabalhando,
              segTrabalhando: resumo.segTrabalhando,
              segDeslocando: resumo.segDeslocando,
              segParada: resumo.segParada,
              segPausa: resumo.segPausa,
              segSemSinal: resumo.segSemSinal,
              areaEstimadaHa: resumo.areaEstimadaHa,
              qualidade: resumo.qualidade,
              localizacaoSimulada: resumo.localizacaoSimulada,
              rastro: resumo.rastro,
              talhoes: resumo.talhoes,
            }
          : {}),
      })
      .where(and(eq(usosMaquina.id, uso.id), isNull(usosMaquina.fim)))
      .returning()
      .get();
    if (!fechado) return undefined;
    tx.update(paradasUso)
      .set({ fim })
      .where(and(eq(paradasUso.usoId, uso.id), isNull(paradasUso.fim)))
      .run();
    if (!automatico) tx.delete(pontosGps).where(eq(pontosGps.usoId, uso.id)).run();
    // Tempo e KM por área numa tabela própria: o painel da área lê pelo índice (RF-057, RF-066)
    if (resumo && resumo.talhoes.length > 0) {
      tx.insert(usosArea)
        .values(
          resumo.talhoes.map((t) => ({
            usoId: uso.id,
            areaId: t.talhaoId,
            inicio: uso.inicio,
            segundos: t.segundos,
            km: t.km,
          }))
        )
        .onConflictDoNothing()
        .run();
    }
    return fechado;
  });
  if (!encerrado) throw new Error('A máquina não está em uso');
  return { uso: encerrado, descartado: false };
}

/**
 * "Desfazer" do fim automático (RF-050): o uso volta a correr de onde parou,
 * com os pontos guardados. Só o último uso de quem está com o celular, fechado
 * por regra do app há menos de 12 h, com a máquina e a pessoa livres. As regras
 * passam a olhar só os pontos de agora em diante (para não fechar de novo).
 */
export async function reabrirUso(usoId: string, agora = new Date()): Promise<UsoMaquina> {
  const operador = usuarioAtual();
  return db.transaction((tx) => {
    const uso = tx.select().from(usosMaquina).where(eq(usosMaquina.id, usoId)).get();
    if (!uso) throw new Error('Uso não encontrado');
    if (!uso.fim || !uso.fimMotivo || !MOTIVOS_AUTOMATICOS.has(uso.fimMotivo)) {
      throw new Error('Só dá para desfazer um encerramento feito pelo app.');
    }
    if (agora.getTime() - uso.fim.getTime() > TEMPOS.desfazerMs) {
      throw new Error('Passou o tempo de desfazer este encerramento.');
    }
    if (uso.operadorId !== operador.id) throw new Error('Só quem estava usando a máquina pode desfazer.');
    const depois = tx
      .select({ id: usosMaquina.id })
      .from(usosMaquina)
      .where(and(eq(usosMaquina.operadorId, operador.id), gt(usosMaquina.inicio, uso.inicio)))
      .get();
    if (depois) throw new Error('Você já ligou outra máquina depois deste uso.');
    const ocupada = tx
      .select({ id: usosMaquina.id })
      .from(usosMaquina)
      .where(and(eq(usosMaquina.maquinaId, uso.maquinaId), isNull(usosMaquina.fim)))
      .get();
    if (ocupada) throw new Error('A máquina já está em uso de novo.');

    tx.delete(usosArea).where(eq(usosArea.usoId, usoId)).run();
    return tx
      .update(usosMaquina)
      .set({
        fim: null,
        fimMotivo: null,
        fimLat: null,
        fimLng: null,
        kmTotal: null,
        kmTrabalhando: null,
        segTrabalhando: null,
        segDeslocando: null,
        segParada: null,
        segPausa: null,
        segSemSinal: null,
        areaEstimadaHa: null,
        qualidade: null,
        rastro: null,
        talhoes: null,
        paradaAvisadaEm: null,
        continuaAte: null,
        regrasDesde: agora,
      })
      .where(eq(usosMaquina.id, usoId))
      .returning()
      .get();
  });
}

/** Pontos de usos encerrados há mais de 12 h: o "Desfazer" já passou (abertura do app). */
export async function limparPontosAntigos(agora = new Date()): Promise<void> {
  const limite = new Date(agora.getTime() - TEMPOS.desfazerMs);
  await db
    .delete(pontosGps)
    .where(
      inArray(
        pontosGps.usoId,
        db
          .select({ id: usosMaquina.id })
          .from(usosMaquina)
          .where(and(isNotNull(usosMaquina.fim), lt(usosMaquina.fim, limite)))
      )
    );
}

/**
 * Usos encerrados antes da tabela por área: copia o "por talhão" do JSON deles
 * uma vez (abertura do app). Depois da primeira vez a consulta não acha nada.
 */
export async function preencherUsosPorArea(): Promise<number> {
  const pendentes = await db
    .select({ id: usosMaquina.id, inicio: usosMaquina.inicio, talhoes: usosMaquina.talhoes })
    .from(usosMaquina)
    .where(
      and(
        isNotNull(usosMaquina.fim),
        isNotNull(usosMaquina.talhoes),
        sql`${usosMaquina.talhoes} <> '[]'`,
        sql`not exists (select 1 from ${usosArea} where ${usosArea.usoId} = ${usosMaquina.id})`
      )
    );
  if (pendentes.length === 0) return 0;
  const existentes = new Set((await db.select({ id: tabelaAreas.id }).from(tabelaAreas)).map((a) => a.id));
  const linhas = pendentes.flatMap((uso) =>
    (uso.talhoes ?? [])
      .filter((t) => existentes.has(t.talhaoId))
      .map((t) => ({ usoId: uso.id, areaId: t.talhaoId, inicio: uso.inicio, segundos: t.segundos, km: t.km }))
  );
  if (linhas.length > 0) await db.insert(usosArea).values(linhas).onConflictDoNothing();
  return pendentes.length;
}

export interface DadosUsoManual {
  inicio: Date;
  fim: Date;
  atividade?: AtividadeUso | null;
  implementoId?: string | null;
  operador?: Usuario;
}

/**
 * Uso esquecido: a pessoa informa início e fim aproximados depois. Fica marcado
 * como "registro manual" para o dono ver a diferença.
 */
export async function registrarUsoManual(
  maquinaId: string,
  dados: DadosUsoManual,
  agora = new Date()
): Promise<UsoMaquina> {
  const { inicio, fim } = dados;
  if (fim.getTime() <= inicio.getTime()) throw new Error('O fim precisa ser depois do início');
  if (fim.getTime() > agora.getTime()) throw new Error('O uso esquecido já precisa ter terminado');
  const operador = dados.operador ?? usuarioAtual();
  return db.transaction((tx) => {
    const maquina = tx.select().from(maquinas).where(eq(maquinas.id, maquinaId)).get();
    if (!maquina) throw new Error('Máquina não encontrada');
    if (maquina.categoria === 'implemento') throw new Error('Registre o uso na máquina que puxou o implemento');
    const sobreposto = tx
      .select({ id: usosMaquina.id })
      .from(usosMaquina)
      .where(
        and(
          eq(usosMaquina.maquinaId, maquinaId),
          lt(usosMaquina.inicio, fim),
          or(isNull(usosMaquina.fim), gt(usosMaquina.fim, inicio))
        )
      )
      .get();
    if (sobreposto) throw new Error('Já há uso registrado nesse horário');
    return tx
      .insert(usosMaquina)
      .values({
        maquinaId,
        inicio,
        fim,
        origem: 'manual',
        fimMotivo: 'manual',
        operador: operador.nome,
        operadorId: operador.id,
        atividade: dados.atividade ?? null,
        implementoId: dados.implementoId ?? null,
      })
      .returning()
      .get();
  });
}

/** Pausa (almoço): não conta como uso; volta sozinha quando a máquina andar. */
export async function pausarUso(usoId: string, agora = new Date()): Promise<void> {
  const aberta = await db
    .select({ id: paradasUso.id })
    .from(paradasUso)
    .where(and(eq(paradasUso.usoId, usoId), eq(paradasUso.motivo, 'pausa'), isNull(paradasUso.fim)))
    .get();
  if (aberta) return;
  await db.insert(paradasUso).values({ usoId, motivo: 'pausa', inicio: agora });
  await db.update(usosMaquina).set({ paradaAvisadaEm: null }).where(eq(usosMaquina.id, usoId));
}

export async function retomarUso(usoId: string, agora = new Date()): Promise<void> {
  await db
    .update(paradasUso)
    .set({ fim: agora })
    .where(and(eq(paradasUso.usoId, usoId), eq(paradasUso.motivo, 'pausa'), isNull(paradasUso.fim)));
}

/** Respondeu "Continua" (trabalho parado): fica registrado e só pergunta de novo depois. */
export async function registrarContinua(usoId: string, ate: Date, agora = new Date()): Promise<void> {
  await db.insert(paradasUso).values({ usoId, motivo: 'continua', inicio: agora, fim: agora });
  await db
    .update(usosMaquina)
    .set({ continuaAte: ate, paradaAvisadaEm: null })
    .where(eq(usosMaquina.id, usoId));
}

export async function marcarParadaAvisada(usoId: string, em: Date): Promise<void> {
  await db.update(usosMaquina).set({ paradaAvisadaEm: em }).where(eq(usosMaquina.id, usoId));
}

/** Guarda os pontos de GPS que chegaram para o uso. */
export async function gravarPontos(usoId: string, pontos: PontoLido[]): Promise<void> {
  if (pontos.length === 0) return;
  await db.insert(pontosGps).values(
    pontos.map((p) => ({
      usoId,
      lat: p.lat,
      lng: p.lng,
      precisaoM: p.precisaoM,
      velocidadeMs: p.velocidadeMs,
      simulado: p.simulado,
      registradoEm: new Date(p.em),
    }))
  );
}

/** O sistema não deixou ligar o GPS: o uso segue só com o tempo. */
export async function marcarSemRastro(usoId: string): Promise<void> {
  await db.update(usosMaquina).set({ rastreado: false }).where(eq(usosMaquina.id, usoId));
}

/** Pontos do uso (consulta reativa da tela Em uso). */
export function pontosGpsDoUso(usoId: string) {
  return db.select().from(pontosGps).where(eq(pontosGps.usoId, usoId)).orderBy(asc(pontosGps.registradoEm));
}

/** Pausas e respostas do uso (consulta reativa). */
export function paradasDoUso(usoId: string) {
  return db.select().from(paradasUso).where(eq(paradasUso.usoId, usoId)).orderBy(asc(paradasUso.inicio));
}

/** Usos em que o implemento esteve engatado a partir de `desde` (gráfico da semana do implemento). */
export function usosDoImplementoDesde(implementoId: string, desde: Date) {
  return db
    .select()
    .from(usosMaquina)
    .where(
      and(
        eq(usosMaquina.implementoId, implementoId),
        or(isNull(usosMaquina.fim), gte(usosMaquina.fim, desde))
      )
    );
}
