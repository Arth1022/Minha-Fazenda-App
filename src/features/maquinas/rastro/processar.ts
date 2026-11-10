import type { LocationObject } from 'expo-location';
import { eq } from 'drizzle-orm';

import { db, maquinas, usosMaquina } from '@/database';
import type { UsoMaquina } from '@/dtos';
import { usuarioAtual } from '@/services/usuario';
import {
  fecharUso,
  gravarPontos,
  marcarParadaAvisada,
  pausarUso,
  pausasDoUso,
  pontosDoUso,
  registrarContinua,
  retomarUso,
  usoAbertoDoOperador,
} from '../data/usos';
import { decidirAutomacao, type DecisaoAutomatica } from '../services/automacao';
import { TEMPOS, usoEstacionario, velocidadeMaxKmh } from '../services/padroes';
import { ultimoMovimento } from '../services/rastro';
import { avisarEncerradoPeloApp, avisarParada, limparAvisoParada } from './avisos';
import { ACOES_AVISO, type AcaoAviso } from './constantes';
import { pararRastro } from './localizacao';

/**
 * O que acontece a cada leitura do GPS (também com o app fechado): grava os
 * pontos no uso aberto e aplica as regras automáticas. Sem React: roda na
 * tarefa de segundo plano.
 */

/** Janela de pontos para as regras (a maior regra olha 60 min de parada). */
const JANELA_MS = 75 * 60 * 1000;

async function usoRastreadoAberto(): Promise<UsoMaquina | null> {
  const [uso] = await usoAbertoDoOperador(usuarioAtual().id);
  return uso && uso.rastreado ? uso : null;
}

/** Uma leitura por vez: duas ao mesmo tempo poderiam mandar o mesmo aviso duas vezes. */
let fila: Promise<unknown> = Promise.resolve();
function emFila<T>(tarefa: () => Promise<T>): Promise<T> {
  const proxima = fila.then(tarefa, tarefa);
  fila = proxima.catch(() => undefined);
  return proxima;
}

/** Pontos novos do GPS. Sem uso aberto, desliga o rastro (nunca rastreia fora do uso). */
export function receberLocalizacoes(localizacoes: LocationObject[]): Promise<void> {
  return emFila(() => gravarEAvaliar(localizacoes));
}

async function gravarEAvaliar(localizacoes: LocationObject[]): Promise<void> {
  const uso = await usoRastreadoAberto();
  if (!uso) {
    await pararRastro();
    return;
  }
  await gravarPontos(
    uso.id,
    localizacoes.map((l) => ({
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      precisaoM: l.coords.accuracy ?? null,
      velocidadeMs: l.coords.speed ?? null,
      simulado: l.mocked === true,
      em: l.timestamp,
    }))
  );
  await aplicarRegras(uso);
}

/** Aplica as regras automáticas ao uso aberto (também chamado ao abrir o app). */
export async function aplicarRegras(uso: UsoMaquina, agora = new Date()): Promise<DecisaoAutomatica> {
  const maquina = await db.select().from(maquinas).where(eq(maquinas.id, uso.maquinaId)).get();
  if (!maquina) return { tipo: 'nada' };
  const [pontos, pausas] = await Promise.all([
    pontosDoUso(uso.id, new Date(agora.getTime() - JANELA_MS)),
    pausasDoUso(uso.id),
  ]);
  const pausaAberta = pausas.find((p) => p.fim === null);
  const decisao = decidirAutomacao({
    inicio: uso.inicio.getTime(),
    agora: agora.getTime(),
    estacionario: usoEstacionario(maquina.tipo, uso.atividade),
    velocidadeMaxKmh: velocidadeMaxKmh(maquina),
    pontos,
    pausaDesde: pausaAberta?.inicio.getTime() ?? null,
    paradaAvisadaEm: uso.paradaAvisadaEm?.getTime() ?? null,
    continuaAte: uso.continuaAte?.getTime() ?? null,
  });

  switch (decisao.tipo) {
    case 'avisarParada': {
      const minutos = Math.max(1, Math.round((agora.getTime() - decisao.paradaDesde) / 60000));
      await marcarParadaAvisada(uso.id, agora);
      await avisarParada(uso.id, maquina.nome, minutos);
      break;
    }
    case 'retomar':
      await retomarUso(uso.id, new Date(decisao.em));
      break;
    case 'encerrar':
      await fecharUso(uso, { fim: new Date(decisao.fim), motivo: decisao.motivo });
      await limparAvisoParada(uso.id);
      await pararRastro();
      await avisarEncerradoPeloApp(maquina.nome, decisao.motivo);
      break;
  }
  return decisao;
}

/** Ao abrir o app: confere o uso aberto (o app pode ter ficado fechado sem GPS). */
export async function conferirUsoAberto(): Promise<void> {
  const uso = await usoRastreadoAberto();
  if (uso) await aplicarRegras(uso);
}

/** Respostas já tratadas: o toque pode chegar pelo app aberto e pela tarefa. */
const respondidas = new Set<string>();

/** Botão tocado no aviso de parada. */
export async function responderAviso(acao: AcaoAviso, usoId: string, chave: string, agora = new Date()): Promise<void> {
  if (respondidas.has(chave)) return;
  respondidas.add(chave);
  const uso = await db.select().from(usosMaquina).where(eq(usosMaquina.id, usoId)).get();
  await limparAvisoParada(usoId);
  if (!uso || uso.fim) return;

  if (acao === ACOES_AVISO.pausa) {
    await pausarUso(uso.id, agora);
  } else if (acao === ACOES_AVISO.continua) {
    await registrarContinua(uso.id, new Date(agora.getTime() + TEMPOS.continuaMs), agora);
  } else if (acao === ACOES_AVISO.encerrar) {
    // Parada há 20 min: o uso terminou no último movimento, não na hora do toque
    const pontos = await pontosDoUso(uso.id, new Date(agora.getTime() - JANELA_MS));
    const fim = ultimoMovimento(pontos) ?? agora.getTime();
    await fecharUso(uso, { fim: new Date(fim), motivo: 'manual' });
    await pararRastro();
  }
}
