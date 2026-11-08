import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChipSelector, CustomInput, FormModal, type ChipOption } from '@/components/forms';
import { AgroColors, Radius, Spacing } from '@/constants/theme';

type OpcaoFios = '4' | '5' | '1' | '2';
type OpcaoEspacamento = '2.5' | '3' | '4';

const OPCOES_FIOS: ChipOption<OpcaoFios>[] = [
  { label: '4 fios', value: '4' },
  { label: '5 fios', value: '5' },
  { label: 'Elétrica (1 fio)', value: '1' },
  { label: 'Elétrica (2 fios)', value: '2' },
];

const OPCOES_ESPACAMENTO: ChipOption<OpcaoEspacamento>[] = [
  { label: '2,5 m', value: '2.5' },
  { label: '3,0 m', value: '3' },
  { label: '4,0 m', value: '4' },
];

export interface ModalCalculadoraCercasProps {
  visible: boolean;
  perimetroInicialKm: number;
  nomeTalhao?: string | null;
  onClose: () => void;
}

export function ModalCalculadoraCercas({
  visible,
  perimetroInicialKm,
  nomeTalhao,
  onClose,
}: ModalCalculadoraCercasProps) {
  const [kmTexto, setKmTexto] = useState('');
  const [fios, setFios] = useState<OpcaoFios>('5');
  const [espacamento, setEspacamento] = useState<OpcaoEspacamento>('3');

  useEffect(() => {
    if (visible) {
      setKmTexto(perimetroInicialKm > 0 ? String(perimetroInicialKm) : '');
    }
  }, [visible, perimetroInicialKm]);

  const km = Math.max(0, Number(kmTexto.replace(',', '.')) || 0);
  const metrosCerca = Math.round(km * 1000);
  const metrosArame = metrosCerca * Number(fios);
  const rolos500m = metrosArame > 0 ? Math.ceil(metrosArame / 500) : 0;
  const qtdMouroes = metrosCerca > 0 ? Math.ceil(metrosCerca / Number(espacamento)) : 0;

  return (
    <FormModal
      visible={visible}
      title="Calculadora de Cercas"
      subtitle={
        nomeTalhao
          ? `Cálculo focado no talhão: ${nomeTalhao}`
          : 'Estimativa de arame e mourões da fazenda'
      }
      onClose={onClose}>
      <CustomInput
        label="Extensão da cerca"
        placeholder="Ex.: 2.4"
        keyboardType="decimal-pad"
        suffix="km"
        value={kmTexto}
        onChangeText={setKmTexto}
        helperText={
          perimetroInicialKm > 0
            ? `${nomeTalhao ? `Perímetro de ${nomeTalhao}` : 'Soma dos talhões'}: ${perimetroInicialKm} km (${Math.round(perimetroInicialKm * 1000)} m)`
            : 'Selecione um talhão ou digite a distância acima'
        }
      />

      <ChipSelector
        label="Tipo de Cerca / Quantidade de Fios"
        options={OPCOES_FIOS}
        value={fios}
        onChange={setFios}
      />

      <ChipSelector
        label="Espaçamento entre Mourões / Estacas"
        options={OPCOES_ESPACAMENTO}
        value={espacamento}
        onChange={setEspacamento}
      />

      <View style={styles.resumoBox}>
        <Text style={styles.resumoTitulo}>Materiais Estimados para Compra</Text>
        <View style={styles.resumoGrid}>
          <View style={styles.metricaCard}>
            <Text style={styles.metricaValor}>{rolos500m} rolos</Text>
            <Text style={styles.metricaSub}>
              {metrosArame.toLocaleString('pt-BR')} m de arame (500m/rolo)
            </Text>
          </View>
          <View style={styles.metricaCard}>
            <Text style={styles.metricaValor}>{qtdMouroes} un.</Text>
            <Text style={styles.metricaSub}>
              Mourões / lascas a cada {espacamento.replace('.', ',')} m
            </Text>
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
