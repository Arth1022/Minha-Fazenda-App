import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormModal } from '@/components/forms';
import { AppIcon } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';

export type TipoRegistro = 'pesagem' | 'cobertura' | 'parto' | 'saida';

interface OpcaoRegistro {
  tipo: TipoRegistro;
  titulo: string;
  descricao: string;
  /** Só aparece para fêmea em idade reprodutiva (novilha ou vaca) */
  reprodutiva?: boolean;
}

const OPCOES: OpcaoRegistro[] = [
  { tipo: 'pesagem', titulo: 'Pesagem', descricao: 'Registrar o peso do animal' },
  {
    tipo: 'cobertura',
    titulo: 'Cobertura',
    descricao: 'Monta natural ou inseminação',
    reprodutiva: true,
  },
  {
    tipo: 'parto',
    titulo: 'Parto',
    descricao: 'Registrar o nascimento da cria',
    reprodutiva: true,
  },
  { tipo: 'saida', titulo: 'Saída', descricao: 'Venda, morte ou descarte' },
];

export interface AdicionarRegistroMenuProps {
  visible: boolean;
  onClose: () => void;
  /** Fêmea novilha ou vaca: mostra Cobertura e Parto */
  reprodutiva: boolean;
  onSelect: (tipo: TipoRegistro) => void;
}

/** Menu "Adicionar" da ficha: Pesagem, Cobertura, Parto e Saída. */
export function AdicionarRegistroMenu({
  visible,
  onClose,
  reprodutiva,
  onSelect,
}: AdicionarRegistroMenuProps) {
  const opcoes = OPCOES.filter((opcao) => reprodutiva || !opcao.reprodutiva);

  return (
    <FormModal visible={visible} title="Adicionar" onClose={onClose}>
      {opcoes.map((opcao) => (
        <Pressable
          key={opcao.tipo}
          onPress={() => onSelect(opcao.tipo)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.opcao, pressed && styles.pressed]}>
          <View style={styles.textos}>
            <Text style={styles.titulo}>{opcao.titulo}</Text>
            <Text style={styles.descricao}>{opcao.descricao}</Text>
          </View>
          <AppIcon name="chevronRight" size={IconSize.lg} color={AgroColors.textMuted} />
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
});
