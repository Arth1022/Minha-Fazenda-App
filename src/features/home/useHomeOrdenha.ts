import { useCallback, useEffect, useMemo, useState } from 'react';

import Ordenha, { PeriodoOrdenha } from '@/entities/Ordenha';
import { ordenhaRepository } from '@/features/rebanho/OrdenhaRepository';

import {
  calculateNotificationTime,
  configureOrdenhaNotifications,
  isValidTimeFormat,
  scheduleOrdenhaReminder,
  triggerTestOrdenhaNotifications,
} from './ordenhaNotificationService';

export interface OrdenhaFormErrors {
  horarioPrevisto?: string;
  volumeLitros?: string;
}

const DEFAULT_HORARIO_MANHA = '05:30';
const DEFAULT_HORARIO_TARDE = '17:00';

export function useHomeOrdenha() {
  const [ordenhas, setOrdenhas] = useState<Ordenha[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [periodo, setPeriodo] = useState<PeriodoOrdenha>('manha');
  const [horarioPrevisto, setHorarioPrevisto] = useState(DEFAULT_HORARIO_MANHA);
  const [volumeLitros, setVolumeLitros] = useState('');
  const [errors, setErrors] = useState<OrdenhaFormErrors>({});
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

  const totalVolumeL = useMemo(() => {
    if (ordenhas.length === 0) return 450;
    const sum = ordenhas.reduce((acc, o) => acc + (o.volumeLitros || 0), 0);
    return sum > 0 ? sum : 450;
  }, [ordenhas]);

  const previewHorarioNotificacao = useMemo(() => {
    return (
      calculateNotificationTime(horarioPrevisto)?.horarioNotificacao ?? '--:--'
    );
  }, [horarioPrevisto]);

  const selectPeriodoInForm = useCallback(
    (targetPeriodo: PeriodoOrdenha) => {
      setPeriodo(targetPeriodo);
      setErrors({});

      if (targetPeriodo === 'manha') {
        const current = ordenhaManha?.horarioPrevisto || DEFAULT_HORARIO_MANHA;
        setHorarioPrevisto(current);
        setVolumeLitros(
          ordenhaManha?.volumeLitros ? String(ordenhaManha.volumeLitros) : ''
        );
      } else {
        const current = ordenhaTarde?.horarioPrevisto || DEFAULT_HORARIO_TARDE;
        setHorarioPrevisto(current);
        setVolumeLitros(
          ordenhaTarde?.volumeLitros ? String(ordenhaTarde.volumeLitros) : ''
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
    setErrors({});
  }, []);

  const handleSaveOrdenha = useCallback(async () => {
    const newErrors: OrdenhaFormErrors = {};
    const trimmedTime = horarioPrevisto.trim();

    if (!isValidTimeFormat(trimmedTime)) {
      newErrors.horarioPrevisto =
        'Informe um horário válido no formato HH:MM (ex.: 05:30 ou 17:00).';
    }

    const parsedVolume = volumeLitros.trim()
      ? Number(volumeLitros.replace(',', '.'))
      : 0;
    if (Number.isNaN(parsedVolume) || parsedVolume < 0) {
      newErrors.volumeLitros = 'Informe um volume válido em litros.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
          volumeLitros:
            parsedVolume > 0 ? parsedVolume : existing.volumeLitros ?? 0,
          dataRegistro: new Date(),
        });
      } else {
        await ordenhaRepository.createOrdenha({
          periodo,
          horarioPrevisto: trimmedTime,
          horarioNotificacao: calculatedAlertTime,
          volumeLitros: parsedVolume,
          dataRegistro: new Date(),
        });
      }

      const scheduleResult = await scheduleOrdenhaReminder(
        periodo,
        trimmedTime
      );

      const periodoLabel = periodo === 'manha' ? 'Manhã' : 'Tarde';
      if (scheduleResult.scheduled) {
        setNotificationFeedback(
          `Alertas da ${periodoLabel} agendados: às ${scheduleResult.horarioNotificacao} (15 min antes) e às ${trimmedTime} (horário exato).`
        );
      } else {
        setNotificationFeedback(
          `Horário da ${periodoLabel} salvo: alertas configurados para ${scheduleResult.horarioNotificacao} (15m antes) e ${trimmedTime} (no horário).`
        );
      }

      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  }, [
    horarioPrevisto,
    volumeLitros,
    periodo,
    ordenhaManha,
    ordenhaTarde,
  ]);

  const handleTestNotifications = useCallback(async () => {
    const sent = await triggerTestOrdenhaNotifications('manha', manhaHorario);
    if (sent) {
      setNotificationFeedback(
        `Disparo de teste iniciado! Você receberá o 1º alerta (15m antes) em 2s e o 2º alerta (horário exato) em 6s.`
      );
    } else {
      setNotificationFeedback(
        `Verifique se a permissão de notificações está ativa no emulador/dispositivo para testar os alertas.`
      );
    }
  }, [manhaHorario]);

  return {
    ordenhas,
    ordenhaManha,
    ordenhaTarde,
    manhaHorario,
    manhaNotificacao,
    tardeHorario,
    tardeNotificacao,
    totalVolumeL,
    modalVisible,
    periodo,
    horarioPrevisto,
    previewHorarioNotificacao,
    volumeLitros,
    errors,
    saving,
    notificationFeedback,
    setHorarioPrevisto: (value: string) => {
      setHorarioPrevisto(value);
      if (errors.horarioPrevisto) {
        setErrors((prev) => ({ ...prev, horarioPrevisto: undefined }));
      }
    },
    setVolumeLitros: (value: string) => {
      setVolumeLitros(value);
      if (errors.volumeLitros) {
        setErrors((prev) => ({ ...prev, volumeLitros: undefined }));
      }
    },
    selectPeriodoInForm,
    openOrdenhaModal,
    closeOrdenhaModal,
    handleSaveOrdenha,
    handleTestNotifications,
    dismissFeedback: () => setNotificationFeedback(null),
  };
}
