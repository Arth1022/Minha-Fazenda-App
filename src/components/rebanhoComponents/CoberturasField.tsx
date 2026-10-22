import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipSelector, CustomInput, type ChipOption } from '@/components/forms';
import { Badge, Button } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { TipoCobertura } from '@/entities/Cobertura';
import { formatDataBR, maskDataBR, parseDataBR } from '@/utils';
import type { CoberturaFormValue } from '@/features/rebanho/useNovoAnimalForm';

const TIPO_COBERTURA_OPTIONS: ChipOption<TipoCobertura>[] = [
  { label: 'Inseminação', value: 'inseminacao' },
  { label: 'Monta Natural', value: 'monta_natural' },
];

const TIPO_COBERTURA_LABEL: Record<TipoCobertura, string> = {
  monta_natural: 'Monta Natural',
  inseminacao: 'Inseminação',
};

/** Na monta natural o campo identifica o touro; na inseminação, o sêmen. */
const REPRODUTOR_LABEL: Record<TipoCobertura, string> = {
  monta_natural: 'Touro',
  inseminacao: 'Sêmen',
};

export interface CoberturasFieldProps {
  /** Coberturas já adicionadas, da mais recente para a mais antiga */
  coberturas: (CoberturaFormValue & { id: string })[];
  onAdd: (cobertura: CoberturaFormValue) => void;
  onRemove: (index: number) => void;
}

/**
 * Seção "Histórico de Coberturas / Inseminações" do cadastro de animal:
 * exibe os registros em linha do tempo e um mini-formulário, aberto sob
 * demanda, para incluir novos.
 */
export function CoberturasField({
  coberturas,
  onAdd,
  onRemove,
}: CoberturasFieldProps) {
  const [adding, setAdding] = useState(false);
  const [tipo, setTipo] = useState<TipoCobertura>('inseminacao');
  const [data, setData] = useState('');
  const [touroSemen, setTouroSemen] = useState('');
  const [dataError, setDataError] = useState<string>();

  const closeDraft = () => {
    setAdding(false);
    setData('');
    setTouroSemen('');
    setDataError(undefined);
  };

  const handleAdd = () => {
    const parsed = parseDataBR(data);
    if (!parsed) {
      setDataError('Informe a data no formato DD/MM/AAAA.');
      return;
    }
    onAdd({ data: parsed, tipo, touroSemen: touroSemen.trim() || undefined });
    closeDraft();
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>
          Histórico de Coberturas / Inseminações
        </Text>
        {coberturas.length > 0 ? (
          <Badge label={String(coberturas.length)} variant="success" />
        ) : null}
      </View>

      {coberturas.length > 0 ? (
        <View>
          {coberturas.map((cobertura, index) => {
            const isLast = index === coberturas.length - 1;
            return (
              <View key={cobertura.id} style={styles.item}>
                <View style={styles.rail}>
                  <View style={[styles.dot, index === 0 && styles.dotLatest]} />
                  {!isLast ? <View style={styles.line} /> : null}
                </View>

                <View style={[styles.info, !isLast && styles.infoSpaced]}>
                  <Text style={styles.title}>
                    {TIPO_COBERTURA_LABEL[cobertura.tipo]}
                  </Text>
                  <Text style={styles.sub}>
                    {formatDataBR(cobertura.data)}
                    {cobertura.touroSemen
                      ? ` · ${REPRODUTOR_LABEL[cobertura.tipo]} ${cobertura.touroSemen}`
                      : ''}
                  </Text>
                </View>

                <Pressable
                  onPress={() => onRemove(index)}
                  hitSlop={10}
                  style={({ pressed }) => pressed && styles.pressed}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover registro de ${formatDataBR(cobertura.data)}`}>
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {adding ? (
        <View style={styles.draft}>
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
              required
              value={data}
              onChangeText={(t) => {
                setData(maskDataBR(t));
                if (dataError) setDataError(undefined);
              }}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
              error={dataError}
            />

            <CustomInput
              containerStyle={{ flex: 1 }}
              label={REPRODUTOR_LABEL[tipo]}
              value={touroSemen}
              onChangeText={setTouroSemen}
              placeholder="Opcional"
            />
          </View>

          <View style={styles.actions}>
            <Button
              label="Cancelar"
              variant="ghost"
              size="sm"
              onPress={closeDraft}
              textStyle={styles.cancelText}
            />
            <Button label="Adicionar" size="sm" onPress={handleAdd} />
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          accessibilityRole="button">
          <Text style={styles.addText}>+ Adicionar cobertura</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: AgroColors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.sectionTitle,
    flexShrink: 1,
  },
  item: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rail: {
    width: 12,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    marginTop: 3,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: AgroColors.primary,
    backgroundColor: AgroColors.cardBg,
  },
  dotLatest: {
    backgroundColor: AgroColors.primary,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: 2,
    backgroundColor: AgroColors.mintBorder,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  infoSpaced: {
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.captionBold,
  },
  sub: {
    ...Typography.caption,
  },
  removeText: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '500',
    color: AgroColors.textMuted,
  },
  draft: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.subtleBg,
  },
  twoCol: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  cancelText: {
    color: AgroColors.textSecondary,
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
