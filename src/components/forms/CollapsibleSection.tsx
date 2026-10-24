import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AgroColors, IconSize, Spacing, Typography } from '@/constants/theme';

export interface CollapsibleSectionProps {
  title: string;
  /** Começa aberta (padrão: fechada) */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Seção recolhível de formulário (ex.: "Mais detalhes"). */
export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <AppIcon
          name={open ? 'chevronUp' : 'chevronDown'}
          size={IconSize.lg}
          color={AgroColors.primary}
        />
      </Pressable>

      {open ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: AgroColors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.bodyBold,
    color: AgroColors.primary,
  },
  content: {
    gap: Spacing.md,
    paddingBottom: Spacing.two,
  },
});
