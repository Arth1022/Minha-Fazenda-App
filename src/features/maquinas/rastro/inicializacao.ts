import * as Notifications from 'expo-notifications';
import { eq } from 'drizzle-orm';
import { Platform } from 'react-native';

import { db, maquinas } from '@/database';
import { usuarioAtual } from '@/services/usuario';
import { usoAbertoDoOperador } from '../data/usos';
import { registrarCategoriaParada } from './avisos';
import { ACOES_AVISO, TAREFA_RESPOSTA_AVISO, type AcaoAviso } from './constantes';
import { iniciarRastro, rastroLigado } from './localizacao';
import { conferirUsoAberto, responderAviso } from './processar';

const ACOES = new Set<string>(Object.values(ACOES_AVISO));

/**
 * Ao abrir o app: registra os botões do aviso de parada, confere o uso aberto
 * (aplica as regras que ficaram para trás com o app fechado) e, se o uso segue
 * aberto mas o rastro parou (ex.: celular reiniciou), liga o rastro de novo.
 */
export async function inicializarMaquinas(): Promise<void> {
  if (Platform.OS === 'web') return;
  await registrarCategoriaParada().catch(() => undefined);
  await Notifications.registerTaskAsync(TAREFA_RESPOSTA_AVISO).catch(() => undefined);
  await conferirUsoAberto().catch(() => undefined);

  const [uso] = await usoAbertoDoOperador(usuarioAtual().id);
  if (uso?.rastreado && !(await rastroLigado())) {
    const maquina = await db.select({ nome: maquinas.nome }).from(maquinas).where(eq(maquinas.id, uso.maquinaId)).get();
    await iniciarRastro(maquina?.nome ?? 'Máquina');
  }
}

/** Botões do aviso de parada com o app aberto. Devolve a função que para de ouvir. */
export function ouvirRespostasDeAviso(): () => void {
  if (Platform.OS === 'web') return () => {};
  const assinatura = Notifications.addNotificationResponseReceivedListener((resposta) => {
    const acao = resposta.actionIdentifier;
    const usoId = (resposta.notification.request.content.data as { usoId?: string } | undefined)?.usoId;
    if (!ACOES.has(acao) || !usoId) return;
    const chave = `${resposta.notification.request.identifier}:${acao}`;
    responderAviso(acao as AcaoAviso, usoId, chave).catch(() => undefined);
  });
  return () => assinatura.remove();
}
