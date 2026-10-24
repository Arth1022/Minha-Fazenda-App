import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Button } from '@/components/ui';
import { Radius, Shadows } from '@/constants/theme';
import type { PeriodoOrdenha } from '@/database';

import { PERIODOS, SEM_HORARIO } from './periodos';
import { HorarioOrdenha } from './useHomeOrdenha';

export interface OrdenhaCardProps {
  horarios: Record<PeriodoOrdenha, HorarioOrdenha>;
  onSchedulePress: (periodo?: PeriodoOrdenha) => void;
  onViewSchedulesPress: () => void;
}

/**
 * Card de Ordenha Pixel Perfect padronizado com o Figma e AppIcon (Feather SVG).
 * Exibe os turnos Manhã, Tarde e Noite com seus respectivos horários e alertas em verde.
 */
export function OrdenhaCard({
  horarios,
  onSchedulePress,
  onViewSchedulesPress,
}: OrdenhaCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Ordenha</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeaderTitle}>Horários de Ordenha</Text>

        {PERIODOS.map((periodo, index) => (
          <React.Fragment key={periodo.value}>
            {index > 0 && <View style={styles.divider} />}
            <Pressable
              onPress={() => onSchedulePress(periodo.value)}
              style={({ pressed }) => [
                styles.rowItem,
                pressed && styles.rowPressed,
              ]}>
              <View style={styles.leftGroup}>
                <View style={styles.iconContainer}>
                  <AppIcon
                    name={periodo.icon}
                    size={20}
                    color={periodo.iconColor}
                  />
                </View>
                <View style={styles.periodCol}>
                  <Text style={styles.periodLabel}>{periodo.label}</Text>
                  <Text style={styles.timeValue}>
                    {horarios[periodo.value].horario ?? SEM_HORARIO}
                  </Text>
                </View>
              </View>

              <View style={styles.rightGroup}>
                <Text style={styles.notifLabel}>Notificação</Text>
                <Text style={styles.notifTime}>
                  {horarios[periodo.value].notificacao ?? SEM_HORARIO}
                </Text>
              </View>
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <Button
          label="+ Agendar Notificação"
          variant="primary"
          size="sm"
          style={styles.actionBtn}
          onPress={() => onSchedulePress('manha')}
        />
        <Button
          label="Ver Horários Agendados"
          variant="secondary"
          size="sm"
          style={styles.actionBtn}
          onPress={onViewSchedulesPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    ...Shadows.sm,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.75,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
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
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  rightGroup: {
    alignItems: 'flex-end',
    gap: 2,
  },
  notifLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  notifTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
  },
});
