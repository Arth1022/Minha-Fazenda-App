import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { CATEGORIAS_TAREFA, type CategoriaTarefa } from '@/database';
import { ROTULO_CATEGORIA_TAREFA } from '@/services/ocorrenciaService';
import { ICONE_CATEGORIA_TAREFA } from '../categorias';

/** Fase 1 do relato ("O que aconteceu?"): um toque na categoria já segue para os detalhes. */
export function EtapaCategoria({ onEscolher }: { onEscolher: (categoria: CategoriaTarefa) => void }) {
  return (
    <View style={styles.grade}>
      {CATEGORIAS_TAREFA.map((cat) => (
        <Pressable
          key={cat}
          onPress={() => onEscolher(cat)}
          accessibilityRole="button"
          accessibilityLabel={ROTULO_CATEGORIA_TAREFA[cat]}
          style={({ pressed }) => [styles.item, pressed && styles.itemPressionado]}>
          <View style={styles.icone}>
            <AppIcon name={ICONE_CATEGORIA_TAREFA[cat]} size={26} color={AgroColors.forest} />
          </View>
          <Text style={styles.rotulo} numberOfLines={1} adjustsFontSizeToFit>
            {ROTULO_CATEGORIA_TAREFA[cat]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  item: {
    // Três por linha
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
  },
  itemPressionado: {
    backgroundColor: AgroColors.mintSurface,
    borderColor: AgroColors.forest,
  },
  icone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.surfaceMuted,
  },
  rotulo: {
    fontSize: 15,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
});
