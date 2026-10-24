import * as Notifications from 'expo-notifications';

import { registrarCanais, type CanalId } from './canais';
import { gatilhoDoAgendado, montarGatilho, type Quando } from './gatilhos';
import { plataforma } from './plataforma';

/**
 * Camada fina sobre o expo-notifications (notificações locais, sem servidor).
 * Doc: https://docs.expo.dev/versions/v58.0.0/sdk/notifications/
 *
 * Só Android e iOS agendam; na web as funções não fazem nada.
 */
export const notificacoesDisponiveis = plataforma !== 'web';

export interface NovaNotificacao {
  /** Identificador próprio (para cancelar depois); sem ele o sistema gera um. */
  id?: string;
  titulo: string;
  mensagem?: string;
  quando: Quando;
  canal: CanalId;
  /** Rota do expo-router aberta ao tocar na notificação (ex.: "/animal/123"). */
  url?: string;
  dados?: Record<string, unknown>;
}

export interface DadosNotificacao extends Record<string, unknown> {
  url?: string;
}

export interface NotificacaoAgendada {
  id: string;
  titulo: string | null;
  mensagem: string | null;
  dados: DadosNotificacao;
}

export type StatusPermissao = 'concedida' | 'pendente' | 'negada';

/**
 * Mostra as notificações também com o app aberto, cria os canais e reaplica os
 * agendamentos (ver `reaplicarAgendamentos`). Chamar uma vez na inicialização do app.
 */
export async function configurarNotificacoes(agora = new Date()): Promise<void> {
  if (!notificacoesDisponiveis) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  await registrarCanais();
  await reaplicarAgendamentos(agora);
}

/**
 * Android: agenda de novo o que está pendente, para valer o modo de entrega atual.
 * Exato com a permissão SCHEDULE_EXACT_ALARM, inexato sem ela. A lib só faz isso
 * no boot e na atualização do app. Mas o Android cancela os alarmes exatos quando
 * a permissão é revogada, e os já agendados continuam inexatos quando ela é
 * concedida depois. Datas já vencidas ficam como estão: reagendar descartaria a
 * notificação atrasada em vez de entregá-la.
 */
async function reaplicarAgendamentos(agora: Date): Promise<void> {
  if (plataforma !== 'android') return;
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    agendadas.map(({ identifier, content, trigger }) => {
      const gatilho = gatilhoDoAgendado(trigger, agora);
      if (!gatilho) return;
      return Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: content.title, body: content.body, data: content.data },
        trigger: gatilho,
      });
    })
  );
}

function statusDe(resposta: Notifications.NotificationPermissionsStatus): StatusPermissao {
  // No iOS a doc manda olhar ios.status: "provisória" também entrega a notificação
  const ios = resposta.ios?.status;
  if (
    resposta.granted ||
    ios === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    ios === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    ios === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'concedida';
  }
  return resposta.canAskAgain ? 'pendente' : 'negada';
}

/** 'negada': o sistema não mostra mais o pedido; só pelas configurações do aparelho. */
export async function statusPermissaoNotificacoes(): Promise<StatusPermissao> {
  if (!notificacoesDisponiveis) return 'negada';
  return statusDe(await Notifications.getPermissionsAsync());
}

/** Pede a permissão se ainda dá para pedir. Retorna true se o app pode notificar. */
export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  if (!notificacoesDisponiveis) return false;
  const atual = statusDe(await Notifications.getPermissionsAsync());
  if (atual !== 'pendente') return atual === 'concedida';
  // Android 13+: o pedido só aparece depois que existe ao menos um canal
  await registrarCanais();
  return statusDe(await Notifications.requestPermissionsAsync()) === 'concedida';
}

/**
 * True se as notificações chegam no minuto exato: sempre no iOS e, no Android 12+,
 * com o "Alarmes e lembretes" liberado. Sem ele o agendamento continua funcionando,
 * mas o Android pode atrasar a entrega.
 */
export async function alarmeExatoPermitido(): Promise<boolean> {
  if (plataforma !== 'android') return notificacoesDisponiveis;
  return (await Notifications.getExactAlarmPermissionsAsync()).granted;
}

/**
 * Abre a tela do Android para liberar "Alarmes e lembretes" e, se liberado,
 * reaplica os agendamentos como exatos. A doc avisa que a promise pode não
 * resolver se o usuário revogar a permissão (o Android encerra o app). A
 * próxima abertura reaplica os agendamentos em `configurarNotificacoes`.
 */
export async function pedirAlarmeExato(agora = new Date()): Promise<boolean> {
  if (plataforma !== 'android') return notificacoesDisponiveis;
  if (await alarmeExatoPermitido()) return true;
  const { granted } = await Notifications.requestExactAlarmPermissionsAsync();
  if (granted) await reaplicarAgendamentos(agora);
  return granted;
}

/**
 * Agenda uma notificação local. Retorna o id, ou null quando não agenda
 * (data no passado ou web). Agendar com um `id` já existente substitui a anterior.
 */
export async function agendarNotificacao(
  nova: NovaNotificacao,
  agora = new Date()
): Promise<string | null> {
  if (!notificacoesDisponiveis) return null;
  const trigger = montarGatilho(nova.quando, nova.canal, agora);
  if (!trigger) return null;
  const dados: DadosNotificacao = { ...nova.dados, url: nova.url };
  return Notifications.scheduleNotificationAsync({
    identifier: nova.id,
    content: { title: nova.titulo, body: nova.mensagem ?? null, data: dados },
    trigger,
  });
}

export async function cancelarNotificacao(id: string): Promise<void> {
  await cancelarNotificacoes([id]);
}

export async function cancelarNotificacoes(ids: string[]): Promise<void> {
  if (!notificacoesDisponiveis) return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function cancelarTodasNotificacoes(): Promise<void> {
  if (!notificacoesDisponiveis) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Notificações ainda pendentes no aparelho (as de data única somem depois de disparar). */
export async function listarNotificacoesAgendadas(): Promise<NotificacaoAgendada[]> {
  if (!notificacoesDisponiveis) return [];
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  return agendadas.map(({ identifier, content }) => ({
    id: identifier,
    titulo: content.title,
    mensagem: content.body,
    dados: (content.data ?? {}) as DadosNotificacao,
  }));
}

/**
 * Chama `callback` quando o usuário toca numa notificação, inclusive a que abriu
 * o app fechado. Retorna a função que remove o listener (use no cleanup do useEffect).
 */
export function aoTocarNotificacao(callback: (dados: DadosNotificacao) => void): () => void {
  if (!notificacoesDisponiveis) return () => {};
  const tratar = (resposta: Notifications.NotificationResponse) => {
    if (resposta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    callback((resposta.notification.request.content.data ?? {}) as DadosNotificacao);
  };

  const abriuOApp = Notifications.getLastNotificationResponse();
  if (abriuOApp) {
    // Limpa para não tratar o mesmo toque de novo quando a tela remontar
    Notifications.clearLastNotificationResponse();
    tratar(abriuOApp);
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(tratar);
  return () => subscription.remove();
}
