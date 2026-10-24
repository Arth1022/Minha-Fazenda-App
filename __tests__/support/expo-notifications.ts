/**
 * Substitui `expo-notifications` nos testes (ver tsconfig.test.json): guarda os
 * agendamentos em memória, como o módulo nativo faria no aparelho.
 */
export enum SchedulableTriggerInputTypes {
  CALENDAR = 'calendar',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  DATE = 'date',
  TIME_INTERVAL = 'timeInterval',
}

export enum AndroidImportance {
  DEFAULT = 5,
  HIGH = 6,
}

export enum IosAuthorizationStatus {
  NOT_DETERMINED = 0,
  DENIED = 1,
  AUTHORIZED = 2,
  PROVISIONAL = 3,
  EPHEMERAL = 4,
}

export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT';

interface Request {
  identifier: string;
  content: { title: string | null; body: string | null; data: Record<string, unknown> };
  trigger: Record<string, unknown>;
}

// Tipos no formato que os services usam (os do pacote real dependem dos enums nativos)
export type SchedulableNotificationTriggerInput = { type: SchedulableTriggerInputTypes; channelId?: string } & Record<string, unknown>;
export type NotificationPermissionsStatus = { granted: boolean; canAskAgain: boolean; ios?: { status: IosAuthorizationStatus } };
export type NotificationResponse = {
  actionIdentifier: string;
  notification: { request: { content: { data: Record<string, unknown> } } };
};
type Permissao = NotificationPermissionsStatus;

/** Estado do fake, para os testes inspecionarem e prepararem cenários. */
export const fake = {
  agendadas: new Map<string, Request>(),
  canais: new Map<string, { name: string; description?: string; importance: number }>(),
  handler: null as unknown,
  permissao: { granted: false, canAskAgain: true } as Permissao,
  respostaAoPedir: { granted: true, canAskAgain: true } as Permissao,
  pedidosDePermissao: 0,
  alarmeExato: false,
  alarmeExatoAoPedir: true,
  /** Quantas vezes scheduleNotificationAsync foi chamado */
  agendamentos: 0,
  ultimaResposta: null as NotificationResponse | null,
  listeners: new Set<(resposta: NotificationResponse) => void>(),
  reset() {
    this.agendadas.clear();
    this.canais.clear();
    this.handler = null;
    this.permissao = { granted: false, canAskAgain: true };
    this.respostaAoPedir = { granted: true, canAskAgain: true };
    this.pedidosDePermissao = 0;
    this.alarmeExato = false;
    this.alarmeExatoAoPedir = true;
    this.agendamentos = 0;
    this.ultimaResposta = null;
    this.listeners.clear();
  },
  /** Simula o usuário tocando numa notificação com o app aberto. */
  tocar(data: Record<string, unknown>, actionIdentifier = DEFAULT_ACTION_IDENTIFIER) {
    const resposta = { actionIdentifier, notification: { request: { content: { data } } } };
    this.listeners.forEach((listener) => listener(resposta));
  },
};

let sequencia = 0;

export async function scheduleNotificationAsync(request: {
  identifier?: string;
  content: Request['content'];
  trigger: Record<string, unknown>;
}): Promise<string> {
  const identifier = request.identifier ?? `gerado-${++sequencia}`;
  fake.agendamentos++;
  fake.agendadas.set(identifier, {
    identifier,
    content: request.content,
    trigger: comoOAndroidDevolve(request.trigger),
  });
  return identifier;
}

/** O Android devolve a data do gatilho em `value` (epoch ms), não em `date`. */
function comoOAndroidDevolve({ date, ...trigger }: Record<string, unknown>) {
  if (trigger.type !== 'date') return trigger;
  return { ...trigger, repeats: false, value: new Date(date as Date | number).getTime() };
}

export async function cancelScheduledNotificationAsync(identifier: string) {
  fake.agendadas.delete(identifier);
}

export async function cancelAllScheduledNotificationsAsync() {
  fake.agendadas.clear();
}

export async function getAllScheduledNotificationsAsync() {
  return [...fake.agendadas.values()];
}

export function setNotificationHandler(handler: unknown) {
  fake.handler = handler;
}

export async function setNotificationChannelAsync(
  id: string,
  channel: { name: string; description?: string; importance: number }
) {
  fake.canais.set(id, channel);
  return channel;
}

export async function getPermissionsAsync() {
  return fake.permissao;
}

export async function requestPermissionsAsync() {
  fake.pedidosDePermissao++;
  fake.permissao = fake.respostaAoPedir;
  return fake.permissao;
}

export async function getExactAlarmPermissionsAsync() {
  return { granted: fake.alarmeExato };
}

export async function requestExactAlarmPermissionsAsync() {
  fake.alarmeExato = fake.alarmeExatoAoPedir;
  return { granted: fake.alarmeExato };
}

export function getLastNotificationResponse() {
  return fake.ultimaResposta;
}

export function clearLastNotificationResponse() {
  fake.ultimaResposta = null;
}

export function addNotificationResponseReceivedListener(listener: (resposta: NotificationResponse) => void) {
  fake.listeners.add(listener);
  return { remove: () => fake.listeners.delete(listener) };
}
