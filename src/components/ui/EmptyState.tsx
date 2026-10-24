import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Typography } from '@/constants/theme';
import { Card } from './Card';

export interface EmptyStateProps {
  /** Mensagem exibida quando não há registros */
  message: string;
}

/**
 * Cartão padronizado para listas e seções sem registros.
 */
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Card padding="three">
      <Text style={styles.message}>{message}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  message: {
    ...Typography.bodyMedium,
    textAlign: 'center',
  },
});
