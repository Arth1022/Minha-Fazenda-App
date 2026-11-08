import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, BottomSheet } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import type { Animal, StatusAnimal } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { formatarIdade } from '../../services/fase';
import { AnimalAvatar } from '../AnimalAvatar';
import { Chip } from './elementos';

const STATUS_LABEL: Record<Exclude<StatusAnimal, 'ativo'>, string> = {
  vendido: 'Vendido',
  morto: 'Morto',
  descarte: 'Descarte',
};

export interface CriasSheetProps {
  visible: boolean;
  /** Crias cadastradas no app (filhos com mae_id igual ao animal) */
  crias: Animal[];
  /** Crias de antes de entrar no app, que não têm cadastro */
  criasAnteriores: number;
  onClose: () => void;
  /** Toque numa cria: abre a ficha dela */
  onAbrir: (cria: Animal) => void;
}

/** Lista das crias da vaca; cada uma leva para a própria ficha. */
export function CriasSheet({ visible, crias, criasAnteriores, onClose, onAbrir }: CriasSheetProps) {
  const total = crias.length + criasAnteriores;

  return (
    <BottomSheet
      visible={visible}
      title="Crias"
      subtitle={total === 1 ? '1 cria' : `${total} crias`}
      onClose={onClose}>
      {crias.length === 0 ? (
        <Text style={styles.vazio}>Nenhuma cria cadastrada no app.</Text>
      ) : (
        crias.map((cria) => {
          const titulo = cria.nome ? `${cria.nome} · ${cria.brinco}` : `Brinco ${cria.brinco}`;
          const detalhe = [
            cria.sexo === 'F' ? 'Fêmea' : 'Macho',
            cria.dataNascimento ? formatarIdade(cria.dataNascimento) : null,
            cria.dataNascimento ? `nasceu ${formatDataBR(cria.dataNascimento)}` : null,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <Pressable
              key={cria.id}
              onPress={() => onAbrir(cria)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ficha de ${titulo}`}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <AnimalAvatar size={44} />
              <View style={styles.textos}>
                <Text style={styles.titulo} numberOfLines={1}>
                  {titulo}
                </Text>
                <Text style={styles.detalhe}>{detalhe}</Text>
                {cria.status !== 'ativo' ? (
                  <Chip tom="neutro" label={STATUS_LABEL[cria.status]} />
                ) : null}
              </View>
              <AppIcon name="chevronRight" size={IconSize.lg} color={AgroColors.textSecondary} />
            </Pressable>
          );
        })
      )}

      {criasAnteriores > 0 ? (
        <Text style={styles.nota}>
          {criasAnteriores === 1
            ? '+1 cria de antes de entrar no app (sem cadastro)'
            : `+${criasAnteriores} crias de antes de entrar no app (sem cadastro)`}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.subtleBg,
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
    fontSize: 16,
  },
  detalhe: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
  vazio: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  nota: {
    ...Typography.caption,
    color: AgroColors.textMuted,
    textAlign: 'center',
  },
});
