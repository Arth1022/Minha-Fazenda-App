import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  ChipOption,
  ChipSelector,
  FormModal,
  TimeWheelPicker,
} from '@/components/forms';
import { ThemedText } from '@/components/ThemedText';
import {
  AppIcon,
  Badge,
  Button,
  Card,
  Header,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { PeriodoOrdenha } from '@/entities/Ordenha';
import { useQuickAction } from '@/providers/QuickActionContext';

import { OrdenhaCard } from './OrdenhaCard';
import { useHomeOrdenha } from './useHomeOrdenha';

const PERIODO_OPTIONS: ChipOption<PeriodoOrdenha>[] = [
  {
    value: 'manha',
    label: 'Manhã',
    renderIcon: (selected) => (
      <AppIcon
        name="sun"
        size={16}
        color={selected ? '#15803D' : '#D97706'}
      />
    ),
  },
  {
    value: 'tarde',
    label: 'Tarde',
    renderIcon: (selected) => (
      <AppIcon
        name="sunset"
        size={16}
        color={selected ? '#15803D' : '#EA580C'}
      />
    ),
  },
  {
    value: 'noite',
    label: 'Noite',
    renderIcon: (selected) => (
      <AppIcon
        name="moon"
        size={16}
        color={selected ? '#15803D' : '#6366F1'}
      />
    ),
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { registerQuickAction } = useQuickAction();

  const {
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

      {/* Card de Ordenha Pixel Perfect (Manhã, Tarde, Noite - Estilo Figma) */}
      <OrdenhaCard
        manhaHorario={manhaHorario}
        manhaNotificacao={manhaNotificacao}
        tardeHorario={tardeHorario}
        tardeNotificacao={tardeNotificacao}
        noiteHorario={noiteHorario}
        noiteNotificacao={noiteNotificacao}
        onSchedulePress={openOrdenhaModal}
        onViewSchedulesPress={openSchedulesModal}
      />

      {/* Acesso Rápido ao Mapeamento & Áreas */}
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

      {/* Modal 1: Agendar Horário de Ordenha (Estilo Figma) */}
      <FormModal
        visible={modalVisible}
        title="Agendar Horário de Ordenha"
        subtitle="Defina o horário do turno selecionado"
        submitLabel="Salvar Horário"
        loading={saving}
        onClose={closeOrdenhaModal}
        onSubmit={handleSaveOrdenha}>
        <ChipSelector
          label="Turno da Ordenha"
          options={PERIODO_OPTIONS}
          value={periodo}
          onChange={selectPeriodoInForm}
        />

        <TimeWheelPicker
          value={horarioPrevisto}
          onChange={setHorarioPrevisto}
        />
      </FormModal>

      {/* Modal 2: Visualização dos Horários Agendados (Padronizado ao Estilo Figma) */}
      <FormModal
        visible={schedulesModalVisible}
        title="Horários de Ordenha"
        subtitle="Turnos agendados e alertas ativos"
        submitLabel="+ Novo / Editar Horário"
        cancelLabel="Fechar"
        onClose={closeSchedulesModal}
        onSubmit={() => {
          closeSchedulesModal();
          openOrdenhaModal('manha');
        }}>
        <View style={styles.figmaSchedulesCard}>
          <Text style={styles.figmaCardHeader}>Turnos Configurados</Text>

          {/* Turno Manhã */}
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleRowLeft}>
              <View style={styles.iconBox}>
                <AppIcon name="sun" size={20} color="#D97706" />
              </View>
              <View style={styles.periodCol}>
                <Text style={styles.periodLabel}>Manhã</Text>
                <Text style={styles.timeValue}>{manhaHorario}</Text>
              </View>
            </View>

            <View style={styles.scheduleRowRight}>
              <View style={styles.notifCol}>
                <Text style={styles.notifLabel}>Notificação</Text>
                <Text style={styles.notifTime}>{manhaNotificacao}</Text>
              </View>
              <Button
                label="Editar"
                variant="outline"
                size="sm"
                onPress={() => {
                  closeSchedulesModal();
                  openOrdenhaModal('manha');
                }}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Turno Tarde */}
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleRowLeft}>
              <View style={styles.iconBox}>
                <AppIcon name="sunset" size={20} color="#EA580C" />
              </View>
              <View style={styles.periodCol}>
                <Text style={styles.periodLabel}>Tarde</Text>
                <Text style={styles.timeValue}>{tardeHorario}</Text>
              </View>
            </View>

            <View style={styles.scheduleRowRight}>
              <View style={styles.notifCol}>
                <Text style={styles.notifLabel}>Notificação</Text>
                <Text style={styles.notifTime}>{tardeNotificacao}</Text>
              </View>
              <Button
                label="Editar"
                variant="outline"
                size="sm"
                onPress={() => {
                  closeSchedulesModal();
                  openOrdenhaModal('tarde');
                }}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Turno Noite */}
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleRowLeft}>
              <View style={styles.iconBox}>
                <AppIcon name="moon" size={20} color="#6366F1" />
              </View>
              <View style={styles.periodCol}>
                <Text style={styles.periodLabel}>Noite</Text>
                <Text style={styles.timeValue}>{noiteHorario}</Text>
              </View>
            </View>

            <View style={styles.scheduleRowRight}>
              <View style={styles.notifCol}>
                <Text style={styles.notifLabel}>Notificação</Text>
                <Text style={styles.notifTime}>{noiteNotificacao}</Text>
              </View>
              <Button
                label="Editar"
                variant="outline"
                size="sm"
                onPress={() => {
                  closeSchedulesModal();
                  openOrdenhaModal('noite');
                }}
              />
            </View>
          </View>
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
  figmaSchedulesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    ...Shadows.sm,
  },
  figmaCardHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  scheduleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodCol: {
    gap: 1,
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scheduleRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  notifLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  notifTime: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
});
