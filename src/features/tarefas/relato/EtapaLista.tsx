import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';

export interface ItemLista {
  /** null = "sem área / sem animal / sem máquina" */
  id: string | null;
  titulo: string;
  subtitulo?: string | null;
}

export interface EtapaListaProps {
  itens: ItemLista[];
  selecionado: string | null;
  onEscolher: (id: string | null) => void;
}

/** Escolha do local, do animal ou da máquina ("Ajustar"): um toque escolhe e volta. */
export function EtapaLista({ itens, selecionado, onEscolher }: EtapaListaProps) {
  return (
    <View style={styles.lista}>
      {itens.map((item) => {
        const ativo = item.id === selecionado;
        return (
          <Pressable
            key={item.id ?? 'nenhum'}
            onPress={() => onEscolher(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            style={({ pressed }) => [styles.item, ativo && styles.itemAtivo, pressed && styles.itemPressionado]}>
            <View style={styles.textos}>
              <Text style={[styles.titulo, item.id === null && styles.tituloNenhum]}>{item.titulo}</Text>
              {item.subtitulo ? <Text style={styles.subtitulo}>{item.subtitulo}</Text> : null}
            </View>
            {ativo ? <AppIcon name="check" size={20} color={AgroColors.forest} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
  },
  itemAtivo: {
    borderColor: AgroColors.forest,
    backgroundColor: AgroColors.mintSurface,
  },
  itemPressionado: {
    backgroundColor: AgroColors.mintSurface,
  },
  textos: {
    flex: 1,
    gap: 1,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  tituloNenhum: {
    color: AgroColors.textSecondary,
  },
  subtitulo: {
    fontSize: 13,
    color: AgroColors.textSecondary,
  },
});
