import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChipSelector, CustomInput, FormModal, type ChipOption } from '@/components/forms';
import { AgroColors, Radius, Spacing } from '@/constants/theme';

export type CulturaSemente = 'braquiaria' | 'mombaca' | 'milho' | 'outro';

export const CONFIG_CULTURAS: Record<
  Exclude<CulturaSemente, 'outro'>,
  { taxaKgHa: number; sacoKg: number }
> = {
  braquiaria: { taxaKgHa: 12, sacoKg: 20 },
  mombaca: { taxaKgHa: 5, sacoKg: 5 },
  milho: { taxaKgHa: 20, sacoKg: 20 },
};

const OPCOES_CULTURA: ChipOption<CulturaSemente>[] = [
  { label: 'Braquiária (12 kg/ha)', value: 'braquiaria' },
  { label: 'Mombaça (5 kg/ha)', value: 'mombaca' },
  { label: 'Milho Silagem (20 kg/ha)', value: 'milho' },
  { label: 'Outro', value: 'outro' },
];

export interface ModalCalculadoraSementesProps {
  visible: boolean;
  areaInicialHa: number;
  nomeTalhao?: string | null;
  onClose: () => void;
}

export function ModalCalculadoraSementes({
  visible,
  areaInicialHa,
  nomeTalhao,
  onClose,
}: ModalCalculadoraSementesProps) {
  const [areaTexto, setAreaTexto] = useState('');
  const [cultura, setCultura] = useState<CulturaSemente>('braquiaria');
  const [taxaManual, setTaxaManual] = useState('15');

  useEffect(() => {
    if (visible) {
      setAreaTexto(areaInicialHa > 0 ? String(areaInicialHa) : '');
    }
  }, [visible, areaInicialHa]);

  const hectares = Math.max(0, Number(areaTexto.replace(',', '.')) || 0);
  const taxaKgHa =
    cultura === 'outro'
      ? Math.max(0, Number(taxaManual.replace(',', '.')) || 0)
      : CONFIG_CULTURAS[cultura].taxaKgHa;
  const sacoKg = cultura === 'outro' ? 20 : CONFIG_CULTURAS[cultura].sacoKg;

  const totalKg = Number((hectares * taxaKgHa).toFixed(1));
  const totalSacos = totalKg > 0 ? Math.ceil(totalKg / sacoKg) : 0;

  return (
    <FormModal
      visible={visible}
      title="Calculadora de Sementes"
      subtitle={
        nomeTalhao
          ? `Cálculo focado no talhão: ${nomeTalhao}`
          : 'Planejamento de plantio da fazenda'
      }
      onClose={onClose}>
      <CustomInput
        label="Área para plantio"
        placeholder="Ex.: 15.2"
        keyboardType="decimal-pad"
        suffix="Ha"
        value={areaTexto}
        onChangeText={setAreaTexto}
        helperText={
          areaInicialHa > 0
            ? `${nomeTalhao ? `Área de ${nomeTalhao}` : 'Soma de Pasto e Lavoura'}: ${areaInicialHa} Ha`
            : 'Selecione um talhão ou informe os hectares acima'
        }
      />

      <ChipSelector
        label="Cultura / Forrageira"
        options={OPCOES_CULTURA}
        value={cultura}
        onChange={setCultura}
      />

      {cultura === 'outro' ? (
        <CustomInput
          label="Taxa de semeadura recomendada"
          placeholder="Ex.: 15"
          keyboardType="decimal-pad"
          suffix="kg/ha"
          value={taxaManual}
          onChangeText={setTaxaManual}
        />
      ) : null}

      <View style={styles.resumoBox}>
        <Text style={styles.resumoTitulo}>Recomendação para Compra</Text>
        <View style={styles.resumoGrid}>
          <View style={styles.metricaCard}>
            <Text style={styles.metricaValor}>{totalKg} kg</Text>
            <Text style={styles.metricaSub}>Taxa aplicada: {taxaKgHa} kg/ha</Text>
          </View>
          <View style={styles.metricaCard}>
            <Text style={styles.metricaValor}>
              {totalSacos} {totalSacos === 1 ? 'saco' : 'sacos'}
            </Text>
            <Text style={styles.metricaSub}>Sacos fechados de {sacoKg} kg</Text>
          </View>
        </View>
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  resumoBox: {
    backgroundColor: AgroColors.mintBg,
    borderWidth: 1,
    borderColor: AgroColors.mintBorder,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  resumoTitulo: { fontSize: 12, fontWeight: '700', color: AgroColors.headerGreen },
  resumoGrid: { flexDirection: 'row', gap: Spacing.sm },
  metricaCard: {
    flex: 1,
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: AgroColors.mintBorder,
    gap: 2,
  },
  metricaValor: { fontSize: 16, fontWeight: '800', color: AgroColors.primaryDark },
  metricaSub: { fontSize: 11, fontWeight: '500', color: AgroColors.textSecondary },
});
