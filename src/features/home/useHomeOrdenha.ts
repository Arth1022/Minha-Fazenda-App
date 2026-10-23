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
const DEFAULT_HORARIO_TARDE = '13:30';
const DEFAULT_HORARIO_NOITE = '21:00';

export function useHomeOrdenha() {
  const [ordenhas, setOrdenhas] = useState<Ordenha[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [schedulesModalVisible, setSchedulesModalVisible] = useState(false);

  const [periodo, setPeriodo] = useState<PeriodoOrdenha>('manha');
  const [horarioPrevisto, setHorarioPrevisto] = useState(DEFAULT_HORARIO_MANHA);
  const [saving, setSaving] = useState(false);

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

  const ordenhaNoite = useMemo(() => {
    const list = ordenhas.filter((o) => o.periodo === 'noite');
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
      calculateNotificationTime(tardeHorario)?.horarioNotificacao ?? '13:15'
    );
  }, [ordenhaTarde, tardeHorario]);

  const noiteHorario = ordenhaNoite?.horarioPrevisto || DEFAULT_HORARIO_NOITE;
  const noiteNotificacao = useMemo(() => {
    if (ordenhaNoite?.horarioNotificacao) {
      return ordenhaNoite.horarioNotificacao;
    }
    return (
      calculateNotificationTime(noiteHorario)?.horarioNotificacao ?? '20:45'
    );
  }, [ordenhaNoite, noiteHorario]);

  const selectPeriodoInForm = useCallback(
    (targetPeriodo: PeriodoOrdenha) => {
      setPeriodo(targetPeriodo);

      if (targetPeriodo === 'manha') {
        setHorarioPrevisto(
          ordenhaManha?.horarioPrevisto || DEFAULT_HORARIO_MANHA
        );
      } else if (targetPeriodo === 'tarde') {
        setHorarioPrevisto(
          ordenhaTarde?.horarioPrevisto || DEFAULT_HORARIO_TARDE
        );
      } else {
        setHorarioPrevisto(
          ordenhaNoite?.horarioPrevisto || DEFAULT_HORARIO_NOITE
        );
      }
    },
    [ordenhaManha, ordenhaTarde, ordenhaNoite]
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
      const existing =
        periodo === 'manha'
          ? ordenhaManha
          : periodo === 'tarde'
          ? ordenhaTarde
          : ordenhaNoite;

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
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  }, [horarioPrevisto, periodo, ordenhaManha, ordenhaTarde, ordenhaNoite]);

  return {
    ordenhas,
    ordenhaManha,
    ordenhaTarde,
    ordenhaNoite,
    manhaHorario,
    manhaNotificacao,
    tardeHorario,
    tardeNotificacao,
    noiteHorario,
    noiteNotificacao,
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
