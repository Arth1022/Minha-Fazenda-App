import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, Card } from '@/components/ui';
import { AgroColors, IconSize, Spacing } from '@/constants/theme';
import type { DosePendente } from '@/dtos';
import { diasEntre, formatDiaMes } from '@/utils/date';

function formatHora(date: Date): string {
  const horas = String(date.getHours()).padStart(2, '0');
  const minutos = String(date.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

/** "Hoje 08:00", "Amanhã 20:00", "30/10 08:00"; sem horário, só o dia. */
function textoDaProximaDose(dose: DosePendente | null, agora = new Date()): string {
  if (!dose) return 'Todas as doses dadas';
  const dias = diasEntre(agora, dose.dia);
  const dia = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : formatDiaMes(dose.dia);
  // Hoje: o próximo horário que ainda não passou (ou o primeiro, se já passaram)
  const horario =
    (dias === 0 ? dose.horarios.find((h) => h.getTime() >= agora.getTime()) : undefined) ??
    dose.horarios[0];
  return horario ? `${dia} ${formatHora(horario)}` : dia;
}

export interface ProximaDoseCardProps {
  proximaDose: DosePendente | null;
}

/** Card "Próxima dose" do tratamento em andamento. */
export function ProximaDoseCard({ proximaDose }: ProximaDoseCardProps) {
  return (
    <Card padding="md">
      <View style={styles.linha}>
        <View style={styles.esquerda}>
          <View style={styles.iconeCircle}>
            <AppIcon name="clock" size={IconSize.sm} color={AgroColors.primary} />
          </View>
          <Text style={styles.titulo}>Próxima dose</Text>
        </View>
        <Text style={styles.valor}>{textoDaProximaDose(proximaDose)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: Spacing.two,
  },
  esquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AgroColors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 12,
    fontWeight: '500',
    color: AgroColors.textSecondary,
    flex: 1,
  },
  valor: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
});
