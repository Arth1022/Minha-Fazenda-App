import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormModal } from '@/components/forms';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';

export type TipoRegistro = 'pesagem' | 'cobertura' | 'parto' | 'saida';

interface OpcaoRegistro {
  tipo: TipoRegistro;
  icone: string;
  titulo: string;
  descricao: string;
  /** Só aparece para fêmea em idade reprodutiva (novilha ou vaca) */
  reprodutiva?: boolean;
}

const OPCOES: OpcaoRegistro[] = [
  { tipo: 'pesagem', icone: '⚖', titulo: 'Pesagem', descricao: 'Registrar o peso do animal' },
  {
    tipo: 'cobertura',
    icone: '🐂',
    titulo: 'Cobertura',
    descricao: 'Monta natural ou inseminação',
    reprodutiva: true,
  },
  {
    tipo: 'parto',
    icone: '🐄',
    titulo: 'Parto',
    descricao: 'Registrar o nascimento da cria',
    reprodutiva: true,
  },
  { tipo: 'saida', icone: '🚪', titulo: 'Saída', descricao: 'Venda, morte ou descarte' },
];

export interface OutrosRegistrosMenuProps {
  visible: boolean;
  onClose: () => void;
  /** Fêmea novilha ou vaca: mostra Cobertura e Parto */
  reprodutiva: boolean;
  onSelect: (tipo: TipoRegistro) => void;
}

/** Menu "Outros registros" da ficha: Pesagem, Cobertura, Parto e Saída. */
export function OutrosRegistrosMenu({
  visible,
  onClose,
  reprodutiva,
  onSelect,
}: OutrosRegistrosMenuProps) {
  const opcoes = OPCOES.filter((opcao) => reprodutiva || !opcao.reprodutiva);

  return (
    <FormModal visible={visible} title="Outros registros" onClose={onClose}>
      {opcoes.map((opcao) => (
        <Pressable
          key={opcao.tipo}
          onPress={() => onSelect(opcao.tipo)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.opcao, pressed && styles.pressed]}>
          <View style={styles.iconeCircle}>
            <Text style={styles.icone}>{opcao.icone}</Text>
          </View>
          <View style={styles.textos}>
            <Text style={styles.titulo}>{opcao.titulo}</Text>
            <Text style={styles.descricao}>{opcao.descricao}</Text>
          </View>
          <Text style={styles.seta}>›</Text>
        </Pressable>
      ))}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
  },
  pressed: {
    backgroundColor: AgroColors.mintSurface,
  },
  iconeCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icone: {
    fontSize: 18,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  titulo: {
    ...Typography.bodyBold,
  },
  descricao: {
    ...Typography.caption,
  },
  seta: {
    ...Typography.screenTitle,
    color: AgroColors.textMuted,
  },
});
