import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  ChipOption,
  ChipSelector,
  FormModal,
  TimeWheelPicker,
} from '@/components/forms';
import {
  AppIcon,
  Badge,
  Button,
  Card,
  Header,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { CardUsoAtual } from '@/features/maquinas';
import { AvatarDoCabecalho } from '@/features/perfil';
import { AgroColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import type { PeriodoOrdenha } from '@/dtos';

import { OrdenhaCard } from './OrdenhaCard';
import { PERIODOS, SEM_HORARIO } from './periodos';
import { useHomeOrdenha } from './useHomeOrdenha';

const PERIODO_OPTIONS: ChipOption<PeriodoOrdenha>[] = PERIODOS.map(
  (periodo) => ({
    value: periodo.value,
    label: periodo.label,
    renderIcon: (selected) => (
      <AppIcon
        name={periodo.icon}
        size={16}
        color={selected ? '#15803D' : periodo.iconColor}
      />
    ),
  })
);

export default function HomeScreen() {
  const router = useRouter();

  const {
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
    openSchedulesModal,
    closeSchedulesModal,
    handleSaveOrdenha,
  } = useHomeOrdenha();

  const editarHorario = (target: PeriodoOrdenha) => {
    closeSchedulesModal();
    openOrdenhaModal(target);
  };

  return (
    <ScreenContainer header={<Header title={APP_NAME} showNotification direita={<AvatarDoCabecalho />} />}>
      <SectionHeader title="Painel Inicial" size="lg" />

      {/* Máquina em uso por quem está com o celular (some sem uso aberto) */}
      <CardUsoAtual />

      {/* Card de Ordenha Pixel Perfect (Manhã, Tarde, Noite - Estilo Figma) */}
      <OrdenhaCard
        horarios={horarios}
        onSchedulePress={openOrdenhaModal}
        onViewSchedulesPress={openSchedulesModal}
      />

      {/* Acesso Rápido ao Mapeamento & Áreas */}
      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Mapeamento & Áreas"
          size="md"
          showChevron
          onPress={() => router.navigate('/mapa')}
        />
        <Card
          variant="default"
          padding="three"
          onPress={() => router.navigate('/mapa')}>
          <View style={styles.mapShortcutRow}>
            <View style={styles.mapShortcutInfo}>
              <Text style={styles.mapShortcutTitle}>
                🗺️ Visualizar Áreas e Piquetes
              </Text>
              <Text style={styles.mapShortcutText}>
                Acesse o mapa interativo, piquetes e pontos de água da fazenda.
              </Text>
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
          label="Horário"
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
        onSubmit={() => editarHorario('manha')}>
        <View style={styles.figmaSchedulesCard}>
          <Text style={styles.figmaCardHeader}>Turnos Configurados</Text>

          {PERIODOS.map((item, index) => (
            <React.Fragment key={item.value}>
              {index > 0 && <View style={styles.divider} />}
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleRowLeft}>
                  <View style={styles.iconBox}>
                    <AppIcon name={item.icon} size={20} color={item.iconColor} />
                  </View>
                  <View style={styles.periodCol}>
                    <Text style={styles.periodLabel}>{item.label}</Text>
                    <Text style={styles.timeValue}>
                      {horarios[item.value].horario ?? SEM_HORARIO}
                    </Text>
                  </View>
                </View>

                <View style={styles.scheduleRowRight}>
                  <View style={styles.notifCol}>
                    <Text style={styles.notifLabel}>Notificação</Text>
                    <Text style={styles.notifTime}>
                      {horarios[item.value].notificacao ?? SEM_HORARIO}
                    </Text>
                  </View>
                  <Button
                    label="Editar"
                    variant="outline"
                    size="sm"
                    onPress={() => editarHorario(item.value)}
                  />
                </View>
              </View>
            </React.Fragment>
          ))}
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
  mapShortcutTitle: {
    ...Typography.bodyBold,
  },
  mapShortcutText: {
    ...Typography.bodyMedium,
    color: AgroColors.textSecondary,
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
