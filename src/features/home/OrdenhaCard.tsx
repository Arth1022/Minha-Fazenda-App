import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Button, Card, SectionHeader } from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';
import { PeriodoOrdenha } from '@/entities/Ordenha';

export interface OrdenhaCardProps {
  manhaHorario: string;
  manhaNotificacao: string;
  tardeHorario: string;
  tardeNotificacao: string;
  onSchedulePress: (periodo?: PeriodoOrdenha) => void;
  onViewSchedulesPress: () => void;
}

/**
 * Componente de apresentação da seção de Ordenha na tela Home.
 */
export function OrdenhaCard({
  manhaHorario,
  manhaNotificacao,
  tardeHorario,
  tardeNotificacao,
  onSchedulePress,
  onViewSchedulesPress,
}: OrdenhaCardProps) {
  return (
    <View style={styles.sectionWrapper}>
      <SectionHeader title="Ordenha" size="md" />

      <Card variant="default" padding="three" style={styles.mainCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <ThemedText style={styles.cowEmoji}>🐄</ThemedText>
          </View>

          <View style={styles.summaryColumn}>
            <ThemedText type="smallBold">Cronograma Diário</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              2 turnos agendados
            </ThemedText>
          </View>
        </View>

        <View style={styles.periodsRow}>
          <Card
            variant="mint"
            padding="two"
            onPress={() => onSchedulePress('manha')}
            style={styles.periodCol}>
            <View style={styles.periodHeader}>
              <ThemedText type="smallBold" style={styles.periodLabel}>
                ☀️ Manhã
              </ThemedText>
              <ThemedText type="small" style={styles.bellText}>
                🔔 {manhaNotificacao}
              </ThemedText>
            </View>
            <ThemedText style={styles.timeDisplay}>{manhaHorario}</ThemedText>
          </Card>

          <Card
            variant="mint"
            padding="two"
            onPress={() => onSchedulePress('tarde')}
            style={styles.periodCol}>
            <View style={styles.periodHeader}>
              <ThemedText type="smallBold" style={styles.periodLabel}>
                🌅 Tarde
              </ThemedText>
              <ThemedText type="small" style={styles.bellText}>
                🔔 {tardeNotificacao}
              </ThemedText>
            </View>
            <ThemedText style={styles.timeDisplay}>{tardeHorario}</ThemedText>
          </Card>
        </View>

        <View style={styles.buttonsRow}>
          <Button
            label="+ Adicionar Notificação"
            variant="primary"
            size="sm"
            style={styles.flexBtn}
            onPress={() => onSchedulePress('manha')}
          />
          <Button
            label="Horários Agendados"
            variant="outline"
            size="sm"
            style={styles.flexBtn}
            onPress={onViewSchedulesPress}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrapper: {
    gap: Spacing.two,
  },
  mainCard: {
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AgroColors.mintBg,
    borderWidth: 1,
    borderColor: AgroColors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cowEmoji: {
    fontSize: 22,
  },
  summaryColumn: {
    flex: 1,
    gap: 2,
  },
  periodsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  periodCol: {
    flex: 1,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodLabel: {
    fontSize: 13,
    color: AgroColors.textPrimary,
  },
  bellText: {
    fontSize: 11,
    color: AgroColors.primaryDark,
    fontWeight: '600',
  },
  timeDisplay: {
    fontSize: 20,
    fontWeight: '800',
    color: AgroColors.primaryDark,
    marginTop: 2,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flexBtn: {
    flex: 1,
  },
});
