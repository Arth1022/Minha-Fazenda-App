import { Image } from 'expo-image';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import { escolherFoto, type OrigemFoto } from '@/services/fotos';

export interface CampoFotoProps {
  label: string;
  /** Foto escolhida (arquivo temporário até salvar o registro); null sem foto */
  uri: string | null;
  onChange: (uri: string | null) => void;
}

/** Foto opcional do registro (bomba, nota, painel, defeito): câmera ou galeria. */
export function CampoFoto({ label, uri, onChange }: CampoFotoProps) {
  const escolher = async (origem: OrigemFoto) => {
    try {
      const nova = await escolherFoto(origem);
      if (nova) onChange(nova);
    } catch (erro) {
      Alert.alert('Foto', erro instanceof Error ? erro.message : 'Não foi possível abrir a câmera.');
    }
  };

  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      {uri ? (
        <View style={styles.previa}>
          <Image source={{ uri }} style={styles.imagem} contentFit="cover" />
          <Pressable onPress={() => onChange(null)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.remover}>Remover foto</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.botoes}>
          <Button label="Tirar foto" variant="outline" size="sm" onPress={() => escolher('camera')} style={styles.botao} />
          <Button label="Da galeria" variant="ghost" size="sm" onPress={() => escolher('galeria')} style={styles.botao} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.captionBold,
    color: AgroColors.textSecondary,
  },
  botoes: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  botao: {
    flex: 1,
  },
  previa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  imagem: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: AgroColors.subtleBg,
  },
  remover: {
    ...Typography.captionBold,
    color: AgroColors.danger,
  },
});
