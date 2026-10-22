import { Alert, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

import { PeriodoOrdenha } from '@/entities/Ordenha';

const ORDENHA_CHANNEL_ID = 'ordenha-lembretes';
const MINUTES_BEFORE_ORDENHA = 15;
const ANDROID_IMPORTANCE_HIGH = 4;

export interface NotificationTimeCalculation {
  /** Horário formatado HH:MM de 15 minutos antes */
  horarioNotificacao: string;
  /** Hora (0-23) do disparo de 15 minutos antes */
  hour: number;
  /** Minuto (0-59) do disparo de 15 minutos antes */
  minute: number;
  /** Hora (0-23) do horário exato da ordenha */
  exactHour: number;
  /** Minuto (0-59) do horário exato da ordenha */
  exactMinute: number;
}

export interface ScheduleOrdenhaNotificationResult {
  /** Indica se as notificações foram agendadas com sucesso */
  scheduled: boolean;
  /** Horário calculado de 15 minutos antes (HH:MM) */
  horarioNotificacao: string;
  /** Horário exato da ordenha (HH:MM) */
  horarioPrevisto: string;
  /** Identificadores das notificações agendadas (15m antes + horário exato) */
  notificationIds?: string[];
}

interface LocalNotificationsApi {
  scheduleNotificationAsync: (request: Record<string, unknown>) => Promise<string>;
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
  getAllScheduledNotificationsAsync: () => Promise<
    Array<{
      identifier: string;
      content: { data?: Record<string, unknown> };
    }>
  >;
  setNotificationHandler: (handler: Record<string, unknown>) => void;
  getPermissionsAsync: () => Promise<{ status: string; granted?: boolean }>;
  requestPermissionsAsync: () => Promise<{ status: string; granted?: boolean }>;
  setNotificationChannelAsync: (
    channelId: string,
    channel: Record<string, unknown>
  ) => Promise<unknown>;
}

let handlerConfigured = false;
let cachedLocalNotificationsApi: LocalNotificationsApi | null | undefined;
const fallbackTimers: Record<string, ReturnType<typeof setTimeout>[]> = {
  manha: [],
  tarde: [],
  teste: [],
};

/**
 * Carrega apenas os submódulos de notificações locais do `expo-notifications`,
 * evitando o carregamento de `ExpoTopicSubscriptionModule` (push remoto),
 * que causa erro fatal no Expo Go / binários sem FCM compilado.
 */
function getLocalNotificationsApi(): LocalNotificationsApi | null {
  if (Platform.OS === 'web') {
    return null;
  }

  if (cachedLocalNotificationsApi !== undefined) {
    return cachedLocalNotificationsApi;
  }

  try {
    const schedulerNative = requireOptionalNativeModule(
      'ExpoNotificationScheduler'
    );
    const handlerNative = requireOptionalNativeModule(
      'ExpoNotificationsHandlerModule'
    );
    const permissionsNative = requireOptionalNativeModule(
      'ExpoNotificationPermissionsModule'
    );

    if (!schedulerNative || !handlerNative || !permissionsNative) {
      cachedLocalNotificationsApi = null;
      return null;
    }

    // Importa diretamente os submódulos locais (sem passar pelo index.js que exige ExpoTopicSubscriptionModule)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { scheduleNotificationAsync } = require('expo-notifications/build/scheduleNotificationAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cancelScheduledNotificationAsync } = require('expo-notifications/build/cancelScheduledNotificationAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAllScheduledNotificationsAsync } = require('expo-notifications/build/getAllScheduledNotificationsAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setNotificationHandler } = require('expo-notifications/build/NotificationsHandler');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getPermissionsAsync, requestPermissionsAsync } = require('expo-notifications/build/NotificationPermissions');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setNotificationChannelAsync } = require('expo-notifications/build/setNotificationChannelAsync');

    cachedLocalNotificationsApi = {
      scheduleNotificationAsync,
      cancelScheduledNotificationAsync,
      getAllScheduledNotificationsAsync,
      setNotificationHandler,
      getPermissionsAsync,
      requestPermissionsAsync,
      setNotificationChannelAsync,
    };

    return cachedLocalNotificationsApi;
  } catch {
    cachedLocalNotificationsApi = null;
    return null;
  }
}

/**
 * Calcula quantos milissegundos faltam até o próximo horário (hour:minute).
 */
function getMsUntilTime(hour: number, minute: number): number {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

function clearFallbackTimers(key: string): void {
  const list = fallbackTimers[key] ?? [];
  list.forEach((timer) => clearTimeout(timer));
  fallbackTimers[key] = [];
}

/**
 * Configura o handler global de notificações locais em primeiro plano (SDK 57).
 */
export function configureOrdenhaNotifications(): void {
  if (handlerConfigured || Platform.OS === 'web') {
    return;
  }

  const api = getLocalNotificationsApi();
  if (!api) {
    return;
  }

  try {
    api.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  } catch {
    // Fallback seguro caso o ambiente não suporte notificações nativas
  }
}

/**
 * Valida se uma string está no formato de horário 24h HH:MM (ex.: "05:30", "17:00").
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time.trim());
}

/**
 * Regra de negócio: calcula exatamente o horário de alerta 15 minutos antes
 * e preserva a hora/minuto exatos para o segundo disparo no horário da ordenha.
 */
export function calculateNotificationTime(
  horarioPrevisto: string,
  minutesBefore: number = MINUTES_BEFORE_ORDENHA
): NotificationTimeCalculation | null {
  const trimmed = horarioPrevisto.trim();
  if (!isValidTimeFormat(trimmed)) {
    return null;
  }

  const [hoursStr, minutesStr] = trimmed.split(':');
  const exactHour = Number(hoursStr);
  const exactMinute = Number(minutesStr);

  const totalMinutesInDay = 24 * 60;
  const scheduledTotalMinutes = exactHour * 60 + exactMinute;
  const alertTotalMinutes =
    (scheduledTotalMinutes - minutesBefore + totalMinutesInDay) %
    totalMinutesInDay;

  const alertHour = Math.floor(alertTotalMinutes / 60);
  const alertMinute = alertTotalMinutes % 60;

  const horarioNotificacao = `${String(alertHour).padStart(2, '0')}:${String(
    alertMinute
  ).padStart(2, '0')}`;

  return {
    horarioNotificacao,
    hour: alertHour,
    minute: alertMinute,
    exactHour,
    exactMinute,
  };
}

/**
 * Solicita permissão de notificações locais e garante o canal Android configurado.
 */
async function ensureNotificationPermissionsAsync(): Promise<boolean> {
  const api = getLocalNotificationsApi();
  if (!api) {
    return false;
  }

  try {
    if (
      Platform.OS === 'android' &&
      requireOptionalNativeModule('ExpoNotificationChannelManager')
    ) {
      await api.setNotificationChannelAsync(ORDENHA_CHANNEL_ID, {
        name: 'Lembretes de Ordenha',
        importance: ANDROID_IMPORTANCE_HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B5E20',
      });
    }

    const { status: existingStatus } = await api.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await api.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Remove agendamentos anteriores do mesmo período ('manha' | 'tarde')
 * para evitar notificações duplicadas ao atualizar o horário.
 */
async function cancelPreviousPeriodoNotificationsAsync(
  periodo: PeriodoOrdenha
): Promise<void> {
  clearFallbackTimers(periodo);

  const api = getLocalNotificationsApi();
  if (!api) {
    return;
  }

  try {
    const scheduledList = await api.getAllScheduledNotificationsAsync();
    const matching = scheduledList.filter(
      (item) => item.content.data?.periodoOrdenha === periodo
    );

    await Promise.all(
      matching.map((item) =>
        api.cancelScheduledNotificationAsync(item.identifier)
      )
    );
  } catch {
    // Ignora falhas de limpeza em ambientes restritos
  }
}

/**
 * Agenda 2 notificações locais diárias para o período:
 * 1) 15 minutos antes do horário agendado (preparação)
 * 2) Exatamente no horário agendado (início da ordenha)
 */
export async function scheduleOrdenhaReminder(
  periodo: PeriodoOrdenha,
  horarioPrevisto: string
): Promise<ScheduleOrdenhaNotificationResult> {
  const trimmedTime = horarioPrevisto.trim();
  const calculation = calculateNotificationTime(trimmedTime);
  const fallbackHorario = calculation?.horarioNotificacao ?? trimmedTime;

  if (!calculation) {
    return {
      scheduled: false,
      horarioNotificacao: fallbackHorario,
      horarioPrevisto: trimmedTime,
    };
  }

  const periodoLabel = periodo === 'manha' ? 'Manhã' : 'Tarde';
  const preTitle = `⏰ Ordenha da ${periodoLabel} em 15 minutos`;
  const preBody = `A ordenha das ${trimmedTime} começará em 15 minutos (alerta das ${calculation.horarioNotificacao}). Prepare os equipamentos!`;
  const exactTitle = `🐄 Hora da Ordenha da ${periodoLabel}!`;
  const exactBody = `Chegou o horário agendado (${trimmedTime}). Inicie a ordenha da ${periodoLabel.toLowerCase()} agora!`;

  await cancelPreviousPeriodoNotificationsAsync(periodo);

  const api = getLocalNotificationsApi();
  if (api) {
    configureOrdenhaNotifications();
    const hasPermission = await ensureNotificationPermissionsAsync();

    if (hasPermission) {
      try {
        const channelId =
          Platform.OS === 'android' ? ORDENHA_CHANNEL_ID : undefined;

        const preAlertId = await api.scheduleNotificationAsync({
          content: {
            title: preTitle,
            body: preBody,
            sound: true,
            data: {
              periodoOrdenha: periodo,
              tipoAlerta: '15_min_antes',
              horarioPrevisto: trimmedTime,
              horarioNotificacao: calculation.horarioNotificacao,
            },
          },
          trigger: {
            type: 'daily',
            hour: calculation.hour,
            minute: calculation.minute,
            channelId,
          },
        });

        const exactAlertId = await api.scheduleNotificationAsync({
          content: {
            title: exactTitle,
            body: exactBody,
            sound: true,
            data: {
              periodoOrdenha: periodo,
              tipoAlerta: 'horario_exato',
              horarioPrevisto: trimmedTime,
              horarioNotificacao: calculation.horarioNotificacao,
            },
          },
          trigger: {
            type: 'daily',
            hour: calculation.exactHour,
            minute: calculation.exactMinute,
            channelId,
          },
        });

        return {
          scheduled: true,
          horarioNotificacao: calculation.horarioNotificacao,
          horarioPrevisto: trimmedTime,
          notificationIds: [preAlertId, exactAlertId],
        };
      } catch {
        // Prossegue para o agendador JS em caso de restrição no Expo Go
      }
    }
  }

  // Fallback JS (funciona no Expo Go mesmo sem módulos nativos de notificação compilados)
  const msUntilPre = getMsUntilTime(calculation.hour, calculation.minute);
  const msUntilExact = getMsUntilTime(
    calculation.exactHour,
    calculation.exactMinute
  );

  const t1 = setTimeout(() => {
    Alert.alert(preTitle, preBody);
  }, msUntilPre);

  const t2 = setTimeout(() => {
    Alert.alert(exactTitle, exactBody);
  }, msUntilExact);

  fallbackTimers[periodo] = [t1, t2];

  return {
    scheduled: true,
    horarioNotificacao: calculation.horarioNotificacao,
    horarioPrevisto: trimmedTime,
  };
}

/**
 * Dispara um teste rápido das 2 notificações (em 2 segundos e em 6 segundos)
 * para validação imediata no emulador/dispositivo sem precisar esperar o relógio.
 */
export async function triggerTestOrdenhaNotifications(
  periodo: PeriodoOrdenha,
  horarioPrevisto: string
): Promise<boolean> {
  const trimmedTime = horarioPrevisto.trim();
  const calculation = calculateNotificationTime(trimmedTime);
  const alertTime = calculation?.horarioNotificacao ?? '05:15';
  const periodoLabel = periodo === 'manha' ? 'Manhã' : 'Tarde';

  const preTitle = `⏰ [Teste] Ordenha da ${periodoLabel} em 15 minutos`;
  const preBody = `Alerta prévio (${alertTime}): a ordenha das ${trimmedTime} começará em 15 minutos. Prepare os equipamentos!`;
  const exactTitle = `🐄 [Teste] Hora da Ordenha da ${periodoLabel}!`;
  const exactBody = `Alerta no horário (${trimmedTime}): chegou a hora agendada para iniciar a ordenha!`;

  clearFallbackTimers('teste');

  const api = getLocalNotificationsApi();
  if (api) {
    configureOrdenhaNotifications();
    const hasPermission = await ensureNotificationPermissionsAsync();

    if (hasPermission) {
      try {
        const channelId =
          Platform.OS === 'android' ? ORDENHA_CHANNEL_ID : undefined;

        await api.scheduleNotificationAsync({
          content: {
            title: preTitle,
            body: preBody,
            sound: true,
            data: { tipoAlerta: 'teste_15_min_antes' },
          },
          trigger: {
            type: 'timeInterval',
            seconds: 2,
            channelId,
          },
        });

        await api.scheduleNotificationAsync({
          content: {
            title: exactTitle,
            body: exactBody,
            sound: true,
            data: { tipoAlerta: 'teste_horario_exato' },
          },
          trigger: {
            type: 'timeInterval',
            seconds: 6,
            channelId,
          },
        });

        return true;
      } catch {
        // Prossegue para o fallback de alerta nativo
      }
    }
  }

  // Fallback imediato compatível com Expo Go sem rebuild nativo
  const t1 = setTimeout(() => {
    Alert.alert(preTitle, preBody);
  }, 2000);

  const t2 = setTimeout(() => {
    Alert.alert(exactTitle, exactBody);
  }, 6000);

  fallbackTimers.teste = [t1, t2];
  return true;
}
