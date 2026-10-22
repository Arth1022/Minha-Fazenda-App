import { useCallback, useEffect, useMemo, useState } from 'react';

import Ordenha, { PeriodoOrdenha } from '@/entities/Ordenha';
import { ordenhaRepository } from '@/features/rebanho/OrdenhaRepository';

import {
  calculateNotificationTime,
  configureOrdenhaNotifications,
  isValidTimeFormat,
  scheduleOrdenhaReminder,
} from './ordenhaNotificationService';

const DEFAULT_HORARIO_MANHA = '05:30';
const DEFAULT_HORARIO_TARDE = '17:00';

export function useHomeOrdenha() {
  const [ordenhas, setOrdenhas] = useState<Ordenha[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [schedulesModalVisible, setSchedulesModalVisible] = useState(false);

  const [periodo, setPeriodo] = useState<PeriodoOrdenha>('manha');
  const [horarioPrevisto, setHorarioPrevisto] = useState(DEFAULT_HORARIO_MANHA);
  const [saving, setSaving] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState<string | null>(
    null
  );

  useEffect(() => {
    configureOrdenhaNotifications();
    const sub = ordenhaRepository.observeAll().subscribe(setOrdenhas);
    return () => sub.unsubscribe();
  }, []);

  const ordenhaManha = useMemo(() => {
    const list = ordenhas.filter((o) => o.periodo === 'manha');
    return list[list.length - 1] ?? null;
  }, [ordenhas]);

  const ordenhaTarde = useMemo(() => {
    const list = ordenhas.filter((o) => o.periodo === 'tarde');
    return list[list.length - 1] ?? null;
  }, [ordenhas]);

  const manhaHorario = ordenhaManha?.horarioPrevisto || DEFAULT_HORARIO_MANHA;
  const manhaNotificacao = useMemo(() => {
    if (ordenhaManha?.horarioNotificacao) {
      return ordenhaManha.horarioNotificacao;
    }
    return (
      calculateNotificationTime(manhaHorario)?.horarioNotificacao ?? '05:15'
    );
  }, [ordenhaManha, manhaHorario]);

  const tardeHorario = ordenhaTarde?.horarioPrevisto || DEFAULT_HORARIO_TARDE;
  const tardeNotificacao = useMemo(() => {
    if (ordenhaTarde?.horarioNotificacao) {
      return ordenhaTarde.horarioNotificacao;
    }
    return (
      calculateNotificationTime(tardeHorario)?.horarioNotificacao ?? '16:45'
    );
  }, [ordenhaTarde, tardeHorario]);

  const previewHorarioNotificacao = useMemo(() => {
    return (
      calculateNotificationTime(horarioPrevisto)?.horarioNotificacao ?? '--:--'
    );
  }, [horarioPrevisto]);

  const selectPeriodoInForm = useCallback(
    (targetPeriodo: PeriodoOrdenha) => {
      setPeriodo(targetPeriodo);

      if (targetPeriodo === 'manha') {
        setHorarioPrevisto(
          ordenhaManha?.horarioPrevisto || DEFAULT_HORARIO_MANHA
        );
      } else {
        setHorarioPrevisto(
          ordenhaTarde?.horarioPrevisto || DEFAULT_HORARIO_TARDE
        );
      }
    },
    [ordenhaManha, ordenhaTarde]
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
    const trimmedTime = horarioPrevisto.trim();
    if (!isValidTimeFormat(trimmedTime)) {
      return;
    }

    const calc = calculateNotificationTime(trimmedTime);
    const calculatedAlertTime = calc?.horarioNotificacao ?? trimmedTime;

    setSaving(true);
    try {
      const existing = periodo === 'manha' ? ordenhaManha : ordenhaTarde;

      if (existing) {
        await ordenhaRepository.updateOrdenha(existing.id, {
          periodo,
          horarioPrevisto: trimmedTime,
          horarioNotificacao: calculatedAlertTime,
          dataRegistro: new Date(),
        });
      } else {
        await ordenhaRepository.createOrdenha({
          periodo,
          horarioPrevisto: trimmedTime,
          horarioNotificacao: calculatedAlertTime,
          dataRegistro: new Date(),
        });
      }

      await scheduleOrdenhaReminder(periodo, trimmedTime);

      const periodoLabel = periodo === 'manha' ? 'Manhã' : 'Tarde';
      setNotificationFeedback(
        `Alarme da ${periodoLabel} salvo para ${trimmedTime} (alerta às ${calculatedAlertTime}).`
      );
      setTimeout(() => setNotificationFeedback(null), 3500);

      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  }, [horarioPrevisto, periodo, ordenhaManha, ordenhaTarde]);

  return {
    ordenhas,
    ordenhaManha,
    ordenhaTarde,
    manhaHorario,
    manhaNotificacao,
    tardeHorario,
    tardeNotificacao,
    modalVisible,
    schedulesModalVisible,
    periodo,
    horarioPrevisto,
    previewHorarioNotificacao,
    saving,
    notificationFeedback,
    setHorarioPrevisto,
    selectPeriodoInForm,
    openOrdenhaModal,
    closeOrdenhaModal,
    openSchedulesModal: () => setSchedulesModalVisible(true),
    closeSchedulesModal: () => setSchedulesModalVisible(false),
    handleSaveOrdenha,
    dismissFeedback: () => setNotificationFeedback(null),
  };
}
