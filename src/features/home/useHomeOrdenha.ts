import { useCallback, useMemo, useState } from 'react';

import { type Ordenha, type PeriodoOrdenha, useLiveQuery } from '@/database';
import { salvarOrdenha, todasOrdenhas } from './ordenhas';

const MINUTES_BEFORE_ORDENHA = 15;

export interface HorarioOrdenha {
  /** Horário previsto (HH:mm); null enquanto o turno não foi agendado */
  horario: string | null;
  /** Horário do alerta (HH:mm); null enquanto o turno não foi agendado */
  notificacao: string | null;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

/**
 * Calcula o horário de alerta (HH:mm) 15 minutos antes do horário previsto.
 */
function calculateNotificationTime(horarioPrevisto: string): string {
  const [hours, minutes] = horarioPrevisto.split(':').map(Number);
  const totalMinutesInDay = 24 * 60;
  const alertTotalMinutes =
    (hours * 60 + minutes - MINUTES_BEFORE_ORDENHA + totalMinutesInDay) %
    totalMinutesInDay;

  return `${pad2(Math.floor(alertTotalMinutes / 60))}:${pad2(alertTotalMinutes % 60)}`;
}

/** Hora atual (HH:mm), ponto de partida do seletor para turnos sem agendamento. */
function currentTime(): string {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

/** Registro mais recente de cada turno (a lista já vem do mais recente ao mais antigo). */
function latestByPeriodo(
  ordenhas: Ordenha[]
): Partial<Record<PeriodoOrdenha, Ordenha>> {
  const latest: Partial<Record<PeriodoOrdenha, Ordenha>> = {};
  for (const ordenha of ordenhas) {
    latest[ordenha.periodo] ??= ordenha;
  }
  return latest;
}

function toHorario(ordenha?: Ordenha): HorarioOrdenha {
  return {
    horario: ordenha?.horarioPrevisto || null,
    notificacao: ordenha?.horarioNotificacao || null,
  };
}

export function useHomeOrdenha() {
  const { data: ordenhas } = useLiveQuery(todasOrdenhas());
  const [modalVisible, setModalVisible] = useState(false);
  const [schedulesModalVisible, setSchedulesModalVisible] = useState(false);

  const [periodo, setPeriodo] = useState<PeriodoOrdenha>('manha');
  const [horarioPrevisto, setHorarioPrevisto] = useState(currentTime);
  const [saving, setSaving] = useState(false);

  const latest = useMemo(() => latestByPeriodo(ordenhas), [ordenhas]);

  const horarios: Record<PeriodoOrdenha, HorarioOrdenha> = useMemo(
    () => ({
      manha: toHorario(latest.manha),
      tarde: toHorario(latest.tarde),
      noite: toHorario(latest.noite),
    }),
    [latest]
  );

  const selectPeriodoInForm = useCallback(
    (targetPeriodo: PeriodoOrdenha) => {
      setPeriodo(targetPeriodo);
      setHorarioPrevisto(latest[targetPeriodo]?.horarioPrevisto || currentTime());
    },
    [latest]
  );

  const openOrdenhaModal = useCallback(
    (initialPeriodo: PeriodoOrdenha = 'manha') => {
      selectPeriodoInForm(initialPeriodo);
      setModalVisible(true);
    },
    [selectPeriodoInForm]
  );

  const closeOrdenhaModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleSaveOrdenha = useCallback(async () => {
    const horario = horarioPrevisto.trim();
    if (!isValidTimeFormat(horario)) {
      return;
    }

    const dados = {
      periodo,
      horarioPrevisto: horario,
      horarioNotificacao: calculateNotificationTime(horario),
      dataRegistro: new Date(),
    };

    setSaving(true);
    try {
      await salvarOrdenha(dados, latest[periodo]?.id);
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  }, [horarioPrevisto, periodo, latest]);

  return {
    horarios,
    modalVisible,
    schedulesModalVisible,
    periodo,
    horarioPrevisto,
    saving,
    setHorarioPrevisto,
    selectPeriodoInForm,
    openOrdenhaModal,
    closeOrdenhaModal,
    openSchedulesModal: () => setSchedulesModalVisible(true),
    closeSchedulesModal: () => setSchedulesModalVisible(false),
    handleSaveOrdenha,
  };
}
