import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Button } from '@/components/ui';
import { Radius, Shadows } from '@/constants/theme';
import { PeriodoOrdenha } from '@/entities/Ordenha';

export interface OrdenhaCardProps {
  manhaHorario: string;
  manhaNotificacao: string;
  tardeHorario: string;
  tardeNotificacao: string;
  noiteHorario: string;
  noiteNotificacao: string;
  onSchedulePress: (periodo?: PeriodoOrdenha) => void;
  onViewSchedulesPress: () => void;
}

/**
 * Card de Ordenha Pixel Perfect padronizado com o Figma e AppIcon (Feather SVG).
 * Exibe os turnos Manhã, Tarde e Noite com seus respectivos horários e alertas em verde.
 */
export function OrdenhaCard({
  manhaHorario,
  manhaNotificacao,
  tardeHorario,
  tardeNotificacao,
  noiteHorario,
  noiteNotificacao,
  onSchedulePress,
  onViewSchedulesPress,
}: OrdenhaCardProps) {
  return (
    <View style={styles.container}>
      {/* Título da Seção */}
      <Text style={styles.sectionTitle}>Ordenha</Text>

      {/* Card Principal Idêntico ao Figma */}
      <View style={styles.card}>
        <Text style={styles.cardHeaderTitle}>Horários de Ordenha</Text>

        {/* Linha 1: Manhã */}
        <Pressable
          onPress={() => onSchedulePress('manha')}
          style={({ pressed }) => [styles.rowItem, pressed && styles.rowPressed]}>
          <View style={styles.leftGroup}>
            <View style={styles.iconContainer}>
              <AppIcon name="sun" size={20} color="#D97706" />
            </View>
            <View style={styles.periodCol}>
              <Text style={styles.periodLabel}>Manhã</Text>
              <Text style={styles.timeValue}>{manhaHorario}</Text>
            </View>
          </View>

          <View style={styles.rightGroup}>
            <Text style={styles.notifLabel}>Notificação</Text>
            <Text style={styles.notifTime}>{manhaNotificacao}</Text>
          </View>
        </Pressable>

        <View style={styles.divider} />

        {/* Linha 2: Tarde */}
        <Pressable
          onPress={() => onSchedulePress('tarde')}
          style={({ pressed }) => [styles.rowItem, pressed && styles.rowPressed]}>
          <View style={styles.leftGroup}>
            <View style={styles.iconContainer}>
              <AppIcon name="sunset" size={20} color="#EA580C" />
            </View>
            <View style={styles.periodCol}>
              <Text style={styles.periodLabel}>Tarde</Text>
              <Text style={styles.timeValue}>{tardeHorario}</Text>
            </View>
          </View>

          <View style={styles.rightGroup}>
            <Text style={styles.notifLabel}>Notificação</Text>
            <Text style={styles.notifTime}>{tardeNotificacao}</Text>
          </View>
        </Pressable>

        <View style={styles.divider} />

        {/* Linha 3: Noite */}
        <Pressable
          onPress={() => onSchedulePress('noite')}
          style={({ pressed }) => [styles.rowItem, pressed && styles.rowPressed]}>
          <View style={styles.leftGroup}>
            <View style={styles.iconContainer}>
              <AppIcon name="moon" size={20} color="#6366F1" />
            </View>
            <View style={styles.periodCol}>
              <Text style={styles.periodLabel}>Noite</Text>
              <Text style={styles.timeValue}>{noiteHorario}</Text>
            </View>
          </View>

          <View style={styles.rightGroup}>
            <Text style={styles.notifLabel}>Notificação</Text>
            <Text style={styles.notifTime}>{noiteNotificacao}</Text>
          </View>
        </Pressable>
      </View>

      {/* Ações de Agendamento e Consulta no Design System do Figma */}
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
