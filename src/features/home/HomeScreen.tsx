import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  ChipOption,
  ChipSelector,
  CustomInput,
  FormModal,
} from '@/components/forms';
import { ThemedText } from '@/components/ThemedText';
import {
  Badge,
  Card,
  Header,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { PeriodoOrdenha } from '@/entities/Ordenha';
import { useQuickAction } from '@/providers/QuickActionContext';

import { OrdenhaCard } from './OrdenhaCard';
import { useHomeOrdenha } from './useHomeOrdenha';

const PERIODO_OPTIONS: ChipOption<PeriodoOrdenha>[] = [
  { value: 'manha', label: 'Manhã', icon: '☀️' },
  { value: 'tarde', label: 'Tarde', icon: '🌅' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { registerQuickAction } = useQuickAction();

  const {
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
    setHorarioPrevisto,
    setVolumeLitros,
    selectPeriodoInForm,
    openOrdenhaModal,
    closeOrdenhaModal,
    handleSaveOrdenha,
    handleTestNotifications,
    dismissFeedback,
  } = useHomeOrdenha();

  useEffect(() => {
    return registerQuickAction('index', () => openOrdenhaModal('manha'));
  }, [registerQuickAction, openOrdenhaModal]);

  return (
    <ScreenContainer
      header={<Header title="Minha Fazenda" status="ready" showNotification />}>
      <SectionHeader
        title="Painel Inicial"
        size="lg"
        rightElement={<Badge label="Fazenda Recanto Verde" variant="success" dot />}
      />

      {/* Seção de Ordenha com Cards e Agendamento Direto */}
      <OrdenhaCard
        manhaHorario={manhaHorario}
        manhaNotificacao={manhaNotificacao}
        tardeHorario={tardeHorario}
        tardeNotificacao={tardeNotificacao}
        totalVolumeL={totalVolumeL}
        notificationFeedback={notificationFeedback}
        onSchedulePress={openOrdenhaModal}
        onTestPress={handleTestNotifications}
        onDismissFeedback={dismissFeedback}
      />

      {/* Acesso Rápido ao Mapeamento & Áreas (Mantendo estrutura base simples para expansão futura) */}
      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Mapeamento & Áreas"
          size="md"
          showChevron
          onPress={() => router.push('/mapa')}
        />
        <Card
          variant="default"
          padding="three"
          onPress={() => router.push('/mapa')}>
          <View style={styles.mapShortcutRow}>
            <View style={styles.mapShortcutInfo}>
              <ThemedText type="smallBold">
                🗺️ Visualizar Áreas e Piquetes
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Acesse o mapa interativo, piquetes e pontos de água da fazenda.
              </ThemedText>
            </View>
            <Badge label="Abrir" variant="neutral" />
          </View>
        </Card>
      </View>

      {/* Modal Reutilizável para Agendamento de Ordenha e Notificação (15 min antes) */}
      <FormModal
        visible={modalVisible}
        title="Agendar Ordenha"
        submitLabel="Salvar e Agendar Alerta"
        loading={saving}
        onClose={closeOrdenhaModal}
        onSubmit={handleSaveOrdenha}>
        <ChipSelector
          label="Período da Ordenha"
          options={PERIODO_OPTIONS}
          value={periodo}
          onChange={selectPeriodoInForm}
        />

        <CustomInput
          label="Horário Agendado (HH:MM)"
          placeholder="Ex.: 05:30 ou 17:00"
          value={horarioPrevisto}
          onChangeText={setHorarioPrevisto}
          error={errors.horarioPrevisto}
          helperText={`🔔 Serão disparados 2 alertas: às ${previewHorarioNotificacao} (15 min antes) e às ${horarioPrevisto.trim() || '--:--'} (no horário exato).`}
        />

        <CustomInput
          label="Volume Estimado / Produzido (Litros)"
          placeholder="Ex.: 225"
          keyboardType="numeric"
          value={volumeLitros}
          onChangeText={setVolumeLitros}
          error={errors.volumeLitros}
        />
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    gap: Spacing.two,
  },
  mapShortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  mapShortcutInfo: {
    flex: 1,
    gap: 2,
  },
});
