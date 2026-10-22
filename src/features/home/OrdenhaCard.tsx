import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Badge, Button, Card, SectionHeader } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { PeriodoOrdenha } from '@/entities/Ordenha';

export interface OrdenhaCardProps {
  manhaHorario: string;
  manhaNotificacao: string;
  tardeHorario: string;
  tardeNotificacao: string;
  totalVolumeL: number;
  notificationFeedback: string | null;
  onSchedulePress: (periodo?: PeriodoOrdenha) => void;
  onTestPress?: () => void;
  onDismissFeedback?: () => void;
}

/**
 * Componente de apresentação da seção de Ordenha na tela Home.
 * Reutiliza exclusivamente os componentes do Design System (Card, SectionHeader, Badge, Button, ThemedText).
 */
export function OrdenhaCard({
  manhaHorario,
  manhaNotificacao,
  tardeHorario,
  tardeNotificacao,
  totalVolumeL,
  notificationFeedback,
  onSchedulePress,
  onTestPress,
  onDismissFeedback,
}: OrdenhaCardProps) {
  return (
    <View style={styles.sectionWrapper}>
      <SectionHeader
        title="Ordenha"
        size="md"
        rightElement={
          <Badge
            label="15m antes + No horário"
            variant="info"
            icon="🔔"
          />
        }
      />

      {/* Card Principal de Ordenha (Fiel ao Figma + Agendamento Direto) */}
      <Card variant="default" padding="three" style={styles.mainCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <ThemedText style={styles.cowEmoji}>🐄</ThemedText>
          </View>

          <View style={styles.summaryColumn}>
            <ThemedText type="smallBold">Cronograma de Ordenha</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Toque em um turno para agendar o horário e os 2 alertas automáticos.
            </ThemedText>
          </View>

          <View style={styles.volumeBox}>
            <ThemedText style={styles.volumeLabel}>Volume</ThemedText>
            <ThemedText style={styles.volumeValue}>{totalVolumeL}L/d</ThemedText>
          </View>
        </View>

        {/* Sub-cards clicáveis de Manhã e Tarde reutilizando Card */}
        <View style={styles.periodsGrid}>
          <Card
            variant="mint"
            padding="two"
            onPress={() => onSchedulePress('manha')}
            style={styles.periodCard}>
            <View style={styles.periodTopRow}>
              <ThemedText type="smallBold">☀️ Manhã</ThemedText>
              <Badge label={manhaHorario} variant="success" />
            </View>
            <ThemedText type="small" style={styles.alertCaption}>
              🔔 Alertas: {manhaNotificacao} (15m antes) e {manhaHorario} (no horário)
            </ThemedText>
          </Card>

          <Card
            variant="mint"
            padding="two"
            onPress={() => onSchedulePress('tarde')}
            style={styles.periodCard}>
            <View style={styles.periodTopRow}>
              <ThemedText type="smallBold">🌅 Tarde</ThemedText>
              <Badge label={tardeHorario} variant="success" />
            </View>
            <ThemedText type="small" style={styles.alertCaption}>
              🔔 Alertas: {tardeNotificacao} (15m antes) e {tardeHorario} (no horário)
            </ThemedText>
          </Card>
        </View>

        <View style={styles.actionsRow}>
          <Button
            label="Agendar Horário de Ordenha"
            variant="outline"
            size="sm"
            fullWidth
            onPress={() => onSchedulePress('manha')}
          />
          {onTestPress ? (
            <Button
              label="🔔 Simular Disparo dos 2 Alertas Agora"
              variant="secondary"
              size="sm"
              fullWidth
              onPress={onTestPress}
            />
          ) : null}
        </View>
      </Card>

      {notificationFeedback ? (
        <Card
          variant="selected"
          padding="two"
          onPress={onDismissFeedback}
          style={styles.feedbackCard}>
          <View style={styles.feedbackRow}>
            <Badge label="Ativo" variant="success" dot />
            <ThemedText type="small" style={styles.feedbackText}>
              {notificationFeedback}
            </ThemedText>
          </View>
        </Card>
      ) : null}
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
    width: 46,
    height: 46,
    borderRadius: 23,
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
  volumeBox: {
    backgroundColor: AgroColors.mintBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AgroColors.mintBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
  },
  volumeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: AgroColors.textSecondary,
  },
  volumeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: AgroColors.primaryDark,
  },
  periodsGrid: {
    gap: Spacing.two,
  },
  periodCard: {
    gap: 4,
  },
  periodTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertCaption: {
    color: AgroColors.primaryDark,
  },
  actionsRow: {
    gap: Spacing.two,
  },
  feedbackCard: {
    paddingVertical: Spacing.two,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  feedbackText: {
    flex: 1,
    color: AgroColors.primaryDark,
  },
});
