import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';
import { CoresTexto } from './elementos';

export interface CartaoFazendaMapaProps {
  nome: string;
  /** "3,7 ha · 2 áreas" */
  resumo: string;
  onBuscar: () => void;
}

/** Cartão do topo da aba Mapa: a fazenda, o tamanho dela e a busca de área ou animal. */
export function CartaoFazendaMapa({ nome, resumo, onBuscar }: CartaoFazendaMapaProps) {
  return (
    <View style={estilos.cartao}>
      <View style={estilos.textos}>
        <Text style={estilos.nome} numberOfLines={1}>
          {nome || 'Minha fazenda'}
        </Text>
        <Text style={estilos.resumo} numberOfLines={1}>
          {resumo}
        </Text>
      </View>
      <Pressable
        onPress={onBuscar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Buscar área ou animal"
        style={({ pressed }) => [estilos.buscar, pressed && estilos.pressionado]}>
        <AppIcon name="search" size={22} color={CoresTexto.escuro} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.8 },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 60,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.cardBg,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.sm,
    ...Shadows.md,
  },
  textos: { flex: 1, gap: 1 },
  nome: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: CoresTexto.escuro },
  resumo: { fontSize: 13.5, lineHeight: 18, color: CoresTexto.suave },
  buscar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
