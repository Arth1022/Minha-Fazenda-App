import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  ChipOption,
  ChipSelector,
  FormModal,
  TimeWheelPicker,
} from '@/components/forms';
import { ThemedText } from '@/components/ThemedText';
import {
  Badge,
  Button,
  Card,
  Header,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';
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
    modalVisible,
    schedulesModalVisible,
    periodo,
    horarioPrevisto,
    saving,
    setHorarioPrevisto,
    selectPeriodoInForm,
    openOrdenhaModal,
    closeOrdenhaModal,
    openSchedulesModal,
    closeSchedulesModal,
    handleSaveOrdenha,
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

      <OrdenhaCard
        manhaHorario={manhaHorario}
        manhaNotificacao={manhaNotificacao}
        tardeHorario={tardeHorario}
        tardeNotificacao={tardeNotificacao}
        onSchedulePress={openOrdenhaModal}
        onViewSchedulesPress={openSchedulesModal}
      />

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

      {/* Modal de Agendamento com Seletor de Horário Nativo */}
      <FormModal
        visible={modalVisible}
        title="Agendar Ordenha"
        submitLabel="Salvar"
        loading={saving}
        onClose={closeOrdenhaModal}
        onSubmit={handleSaveOrdenha}>
        <ChipSelector
          label="Turno"
          options={PERIODO_OPTIONS}
          value={periodo}
          onChange={selectPeriodoInForm}
        />

        <TimeWheelPicker
          value={horarioPrevisto}
          onChange={setHorarioPrevisto}
        />
      </FormModal>

      {/* Modal de Horários Agendados */}
      <FormModal
        visible={schedulesModalVisible}
        title="Horários Agendados"
        submitLabel="Adicionar / Editar"
        cancelLabel="Fechar"
        onClose={closeSchedulesModal}
        onSubmit={() => {
          closeSchedulesModal();
          openOrdenhaModal('manha');
        }}>
        <View style={styles.schedulesList}>
          <Card
            variant="mint"
            padding="three"
            onPress={() => {
              closeSchedulesModal();
              openOrdenhaModal('manha');
            }}>
            <View style={styles.scheduleItemHeader}>
              <View style={styles.scheduleTitleGroup}>
                <ThemedText type="smallBold">☀️ Manhã</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Alerta prévio às {manhaNotificacao}
                </ThemedText>
              </View>
              <ThemedText style={styles.scheduleBigTime}>
                {manhaHorario}
              </ThemedText>
            </View>
            <Button
              label="Editar"
              variant="outline"
              size="sm"
              fullWidth
              onPress={() => {
                closeSchedulesModal();
                openOrdenhaModal('manha');
              }}
            />
          </Card>

          <Card
            variant="mint"
            padding="three"
            onPress={() => {
              closeSchedulesModal();
              openOrdenhaModal('tarde');
            }}>
            <View style={styles.scheduleItemHeader}>
              <View style={styles.scheduleTitleGroup}>
                <ThemedText type="smallBold">🌅 Tarde</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Alerta prévio às {tardeNotificacao}
                </ThemedText>
              </View>
              <ThemedText style={styles.scheduleBigTime}>
                {tardeHorario}
              </ThemedText>
            </View>
            <Button
              label="Editar"
              variant="outline"
              size="sm"
              fullWidth
              onPress={() => {
                closeSchedulesModal();
                openOrdenhaModal('tarde');
              }}
            />
          </Card>
        </View>
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
  schedulesList: {
    gap: Spacing.md,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleTitleGroup: {
    gap: 2,
  },
  scheduleBigTime: {
    fontSize: 24,
    fontWeight: '800',
    color: AgroColors.primaryDark,
  },
});
