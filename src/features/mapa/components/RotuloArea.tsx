import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgroColors, Radius, Shadows } from '@/constants/theme';
import { CoresTexto } from './elementos';

export interface RotuloAreaProps {
  nome: string;
  /** Segunda linha em cinza (ex.: "Milho silagem", "Vazia", "APP") */
  legenda: string | null;
  /** Sem `onPress` o rótulo é só leitura (ex.: durante o desenho) */
  onPress?: () => void;
}

/** Cartão branco no centro da área: nome em negrito e a situação embaixo. */
export function RotuloArea({ nome, legenda, onPress }: RotuloAreaProps) {
  const conteudo = (
    <View style={estilos.cartao}>
      <Text style={estilos.nome} numberOfLines={1}>
        {nome}
      </Text>
      {legenda ? (
        <Text style={estilos.legenda} numberOfLines={1}>
          {legenda}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return conteudo;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={legenda ? `${nome}, ${legenda}` : nome}
      style={({ pressed }) => pressed && estilos.pressionado}>
      {conteudo}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    maxWidth: 160,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: AgroColors.cardBg,
    ...Shadows.sm,
  },
  nome: { fontSize: 13.5, lineHeight: 18, fontWeight: '700', color: CoresTexto.escuro },
  legenda: { fontSize: 11.5, lineHeight: 15, fontWeight: '500', color: CoresTexto.suave },
  pressionado: { opacity: 0.75 },
});
