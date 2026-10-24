import {
  SchedulableTriggerInputTypes,
  type SchedulableNotificationTriggerInput,
} from 'expo-notifications';

/** Dia da semana no padrão do expo-notifications: 1 = domingo ... 7 = sábado. */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Quando a notificação dispara. Horários no formato "HH:mm" (ex.: "05:30"). */
export type Quando =
  | { tipo: 'data'; data: Date }
  | { tipo: 'diario'; horario: string }
  | { tipo: 'semanal'; diaSemana: DiaSemana; horario: string };

export interface Horario {
  hora: number;
  minuto: number;
}

/** Converte "HH:mm" em hora e minuto; null se o texto não é um horário válido. */
export function parseHorario(horario: string): Horario | null {
  const match = horario.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hora: Number(match[1]), minuto: Number(match[2]) };
}

function horarioValido(horario: string): Horario {
  const parsed = parseHorario(horario);
  if (!parsed) throw new Error(`Horário de notificação inválido: "${horario}"`);
  return parsed;
}

/**
 * Traduz o `Quando` no gatilho do expo-notifications, já ligado ao canal (Android).
 * Retorna null para data que já passou: o sistema descartaria a notificação.
 */
export function montarGatilho(
  quando: Quando,
  channelId: string,
  agora = new Date()
): SchedulableNotificationTriggerInput | null {
  switch (quando.tipo) {
    case 'data':
      if (quando.data.getTime() <= agora.getTime()) return null;
      return { type: SchedulableTriggerInputTypes.DATE, date: quando.data, channelId };
    case 'diario':
      return { type: SchedulableTriggerInputTypes.DAILY, channelId, ...horarioDe(quando.horario) };
    case 'semanal':
      return {
        type: SchedulableTriggerInputTypes.WEEKLY,
        channelId,
        weekday: quando.diaSemana,
        ...horarioDe(quando.horario),
      };
  }
}

/**
 * Converte o gatilho que o Android devolve em `getAllScheduledNotificationsAsync`
 * de volta no formato de agendamento. Retorna null para data já vencida e para
 * tipos que este módulo não agenda.
 */
export function gatilhoDoAgendado(
  trigger: unknown,
  agora = new Date()
): SchedulableNotificationTriggerInput | null {
  const t = (trigger ?? {}) as Record<string, unknown>;
  const channelId = typeof t.channelId === 'string' ? t.channelId : undefined;
  const hour = Number(t.hour);
  const minute = Number(t.minute);
  switch (t.type) {
    case 'date': {
      const date = Number(t.value);
      if (!(date > agora.getTime())) return null;
      return { type: SchedulableTriggerInputTypes.DATE, date, channelId };
    }
    case 'daily':
      return { type: SchedulableTriggerInputTypes.DAILY, channelId, hour, minute };
    case 'weekly':
      return {
        type: SchedulableTriggerInputTypes.WEEKLY,
        channelId,
        weekday: Number(t.weekday),
        hour,
        minute,
      };
    default:
      return null;
  }
}

function horarioDe(horario: string) {
  const { hora, minuto } = horarioValido(horario);
  return { hour: hora, minute: minuto };
}
