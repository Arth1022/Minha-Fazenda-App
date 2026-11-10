import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Shadows } from '@/constants/theme';
import { CoresTexto } from './elementos';

export interface RotuloAreaProps {
  nome: string;
  /** Segunda linha em cinza (ex.: "Milho silagem", "Vazia", "APP") */
  legenda: string | null;
  /** Pasto ocupado: selo verde com a vaca e quantas cabeças estão nele */
  cabecas?: number | null;
  /** Sem `onPress` o rótulo é só leitura (ex.: durante o desenho) */
  onPress?: () => void;
}

/** Cartão branco no centro da área: nome em negrito, a situação embaixo e o selo de cabeças. */
export function RotuloArea({ nome, legenda, cabecas = null, onPress }: RotuloAreaProps) {
  const conteudo = (
    <View style={estilos.coluna}>
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
      {cabecas ? (
        <View style={estilos.selo}>
          <AppIcon name="cow" size={16} color={AgroColors.textInverse} />
          <Text style={estilos.seloTexto}>{cabecas}</Text>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return conteudo;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={[nome, legenda, cabecas ? `${cabecas} cabeças` : null].filter(Boolean).join(', ')}
      style={({ pressed }) => pressed && estilos.pressionado}>
      {conteudo}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  coluna: { alignItems: 'center', gap: 8 },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.forest,
    ...Shadows.sm,
  },
  seloTexto: { fontSize: 13.5, lineHeight: 17, fontWeight: '800', color: AgroColors.textInverse },
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
