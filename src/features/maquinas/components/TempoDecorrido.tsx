import React from 'react';
import { Text, type TextStyle } from 'react-native';

import { useRelogio } from '../hooks/useRelogio';
import { formatarCronometro } from '../services/uso';

const UM_SEGUNDO = 1000;

export interface TempoDecorridoProps {
  /** Início do uso em andamento */
  desde: Date;
  style?: TextStyle | TextStyle[];
}

/**
 * Cronômetro "HH:MM:SS" do uso em andamento. Só este texto renderiza a cada
 * segundo: o card e a lista em volta ficam parados.
 */
export function TempoDecorrido({ desde, style }: TempoDecorridoProps) {
  const agora = useRelogio(UM_SEGUNDO);
  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {formatarCronometro(agora.getTime() - desde.getTime())}
    </Text>
  );
}
