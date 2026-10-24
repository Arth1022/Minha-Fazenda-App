import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CustomInput } from '@/components/forms';
import { Button, Card } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { DiaDaTrilha, DosePendente, TratamentoAtivo } from '@/dtos';
import { diasEntre, formatDataBR, formatDiaMes } from '@/utils/date';
import { confirmarDia, desfazerDia } from '../data/doses';

const SEM_VALOR = '—';

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

export interface TratamentoAtivoCardProps {
  ativo: TratamentoAtivo;
}

/**
 * Tratamento em andamento na Ficha Animal: período, trilha de dias com dose
 * (toque para marcar ou desmarcar um dia que já chegou), próxima dose e o
 * botão "Dei a dose de hoje".
 */
export function TratamentoAtivoCard({ ativo }: TratamentoAtivoCardProps) {
  const { tratamento, trilha, hoje, proximaDose } = ativo;
  const [salvando, setSalvando] = useState(false);

  const alternarDia = async ({ dia, confirmado }: DiaDaTrilha) => {
    setSalvando(true);
    try {
      if (confirmado) await desfazerDia(tratamento.id, dia);
      else await confirmarDia(tratamento.id, dia);
    } catch (error) {
      Alert.alert(
        'Não foi possível registrar a dose',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tituloCol}>
        <Text style={styles.medicamento}>{tratamento.medicamento}</Text>
        {tratamento.dose ? <Text style={styles.dose}>{tratamento.dose}</Text> : null}
      </View>

      {/* Período do tratamento */}
      <View style={styles.dateInputsRow}>
        <CustomInput
          containerStyle={styles.coluna}
          label="Início"
          value={formatDataBR(tratamento.dataInicio)}
          editable={false}
        />
        <CustomInput
          containerStyle={styles.coluna}
          label="Fim"
          value={tratamento.dataFim ? formatDataBR(tratamento.dataFim) : SEM_VALOR}
          editable={false}
        />
      </View>

      {/* Dias com dose, com o check verde dos confirmados */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Dias</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.daysTrackBox}
          contentContainerStyle={styles.daysTrackContent}>
          {trilha.map((d) => (
            <Pressable
              key={d.indice}
              onPress={() => alternarDia(d)}
              disabled={d.futuro || salvando}
              style={[styles.dayColumn, d.futuro && styles.dayFuturo]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: d.confirmado, disabled: d.futuro }}
              accessibilityLabel={`Dia ${d.indice}, ${formatDiaMes(d.dia)}`}>
              <Text style={styles.dayNumberText}>{d.indice}</Text>
              <View
                style={[
                  styles.dayCheckCircle,
                  d.confirmado ? styles.dayCheckCircleActive : styles.dayCheckCircleInactive,
                ]}>
                {d.confirmado && <Text style={styles.dayCheckMark}>✓</Text>}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Notificações */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Notificações</Text>
        <Card padding="md">
          <View style={styles.notifRow}>
            <View style={styles.notifLeft}>
              <View style={styles.notifIconCircle}>
                <Text style={styles.notifIconText}>🕒</Text>
              </View>
              <Text style={styles.notifTitle}>Próxima dose</Text>
            </View>
            <Text style={styles.notifValueBold}>{textoDaProximaDose(proximaDose)}</Text>
          </View>
        </Card>
      </View>

      {hoje ? (
        <Button
          label={hoje.confirmado ? 'Desfazer dose de hoje' : 'Dei a dose de hoje'}
          variant={hoje.confirmado ? 'outline' : 'primary'}
          fullWidth
          loading={salvando}
          onPress={() => alternarDia(hoje)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  tituloCol: {
    gap: 2,
  },
  medicamento: {
    fontSize: 16,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  dose: {
    fontSize: 12,
    fontWeight: '500',
    color: AgroColors.textMuted,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  coluna: {
    flex: 1,
  },
  sectionBlock: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  daysTrackBox: {
    backgroundColor: AgroColors.mintBg,
    borderRadius: Radius.md,
  },
  daysTrackContent: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  dayColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  dayFuturo: {
    opacity: 0.45,
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: AgroColors.textSecondary,
  },
  dayCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCheckCircleActive: {
    backgroundColor: AgroColors.primaryLight,
  },
  dayCheckCircleInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: AgroColors.borderStrong,
  },
  dayCheckMark: {
    color: AgroColors.textInverse,
    fontSize: 11,
    fontWeight: '900',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: Spacing.two,
  },
  notifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  notifIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AgroColors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconText: {
    fontSize: 12,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: AgroColors.textSecondary,
    flex: 1,
  },
  notifValueBold: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
});
