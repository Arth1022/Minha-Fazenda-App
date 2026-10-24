import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AgroColors, Spacing } from '@/constants/theme';
import type { DiaDaTrilha, TratamentoAtivo } from '@/dtos';
import { confirmarDia, desfazerDia } from '../data/doses';
import { PeriodoDoTratamento } from './tratamento/PeriodoDoTratamento';
import { ProximaDoseCard } from './tratamento/ProximaDoseCard';
import { TrilhaDeDoses } from './tratamento/TrilhaDeDoses';

export interface TratamentoAtivoCardProps {
  ativo: TratamentoAtivo;
}

/**
 * Tratamento em andamento na Ficha Animal: período (fim editável), trilha de
 * dias com dose (toque no círculo para marcar ou desmarcar um dia que já
 * chegou) e a próxima dose.
 */
export function TratamentoAtivoCard({ ativo }: TratamentoAtivoCardProps) {
  const { tratamento, trilha, proximaDose } = ativo;
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
      {/* Faixa verde à esquerda marca onde começa cada tratamento */}
      <View style={styles.titulo}>
        <View style={styles.faixa} />
        <View style={styles.tituloCol}>
          <Text style={styles.medicamento}>{tratamento.medicamento}</Text>
          {tratamento.dose ? <Text style={styles.dose}>{tratamento.dose}</Text> : null}
        </View>
      </View>

      <PeriodoDoTratamento tratamento={tratamento} />
      <TrilhaDeDoses trilha={trilha} salvando={salvando} onAlternar={alternarDia} />
      <ProximaDoseCard proximaDose={proximaDose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  titulo: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  faixa: {
    width: 4,
    borderRadius: 2,
    backgroundColor: AgroColors.primaryLight,
  },
  tituloCol: {
    flex: 1,
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
});
