import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipSelector, CustomInput, type ChipOption } from '@/components/forms';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { TipoCobertura } from '@/entities/Cobertura';
import { formatDataBR, parseDataBR } from '@/utils';
import type { CoberturaFormValue } from '@/features/rebanho/useNovoAnimalForm';

const TIPO_COBERTURA_OPTIONS: ChipOption<TipoCobertura>[] = [
  { label: 'Monta Natural', value: 'monta_natural', icon: '🐂' },
  { label: 'Inseminação', value: 'inseminacao', icon: '🧪' },
];

const TIPO_COBERTURA_LABEL: Record<TipoCobertura, string> = {
  monta_natural: 'Monta Natural',
  inseminacao: 'Inseminação',
};

export interface CoberturasFieldProps {
  /** Coberturas já adicionadas, da mais recente para a mais antiga */
  coberturas: (CoberturaFormValue & { id: string })[];
  onAdd: (cobertura: CoberturaFormValue) => void;
  onRemove: (index: number) => void;
}

/**
 * Seção "Histórico de Coberturas / Inseminações" do cadastro de animal:
 * lista os registros adicionados e um mini-formulário para incluir novos.
 */
export function CoberturasField({
  coberturas,
  onAdd,
  onRemove,
}: CoberturasFieldProps) {
  const [tipo, setTipo] = useState<TipoCobertura>('inseminacao');
  const [data, setData] = useState('');
  const [touroSemen, setTouroSemen] = useState('');
  const [dataError, setDataError] = useState<string>();

  const handleAdd = () => {
    const parsed = parseDataBR(data);
    if (!parsed) {
      setDataError('Informe a data no formato DD/MM/AAAA.');
      return;
    }
    onAdd({ data: parsed, tipo, touroSemen: touroSemen.trim() || undefined });
    setData('');
    setTouroSemen('');
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>
        Histórico de Coberturas / Inseminações
      </Text>

      {coberturas.map((cobertura, index) => (
        <View key={cobertura.id} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.title}>
              {formatDataBR(cobertura.data)} ·{' '}
              {TIPO_COBERTURA_LABEL[cobertura.tipo]}
            </Text>
            {cobertura.touroSemen ? (
              <Text style={styles.sub}>
                Touro / Sêmen: {cobertura.touroSemen}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => onRemove(index)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Remover cobertura">
            <Text style={styles.removeText}>Remover</Text>
          </Pressable>
        </View>
      ))}

      <ChipSelector
        label="Tipo"
        options={TIPO_COBERTURA_OPTIONS}
        value={tipo}
        onChange={setTipo}
      />

      <View style={styles.twoCol}>
        <CustomInput
          containerStyle={{ flex: 1 }}
          label="Data"
          value={data}
          onChangeText={(t) => {
            setData(t);
            if (dataError) setDataError(undefined);
          }}
          placeholder="DD/MM/AAAA"
          keyboardType="numbers-and-punctuation"
          error={dataError}
        />

        <CustomInput
          containerStyle={{ flex: 1 }}
          label="Touro / Sêmen"
          value={touroSemen}
          onChangeText={setTouroSemen}
          placeholder="Ex: #050"
        />
      </View>

      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        accessibilityRole="button">
        <Text style={styles.addText}>+ Adicionar cobertura</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: AgroColors.divider,
  },
  sectionLabel: {
    ...Typography.sectionTitle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: AgroColors.mintSurface,
    borderWidth: 1,
    borderColor: AgroColors.mintBorder,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.captionBold,
  },
  sub: {
    ...Typography.caption,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.danger,
  },
  twoCol: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addBtn: {
    borderWidth: 1,
    borderColor: AgroColors.primaryLight,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  addText: {
    fontSize: 13,
    fontWeight: '700',
    color: AgroColors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
});
