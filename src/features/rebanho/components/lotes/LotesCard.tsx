import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppIcon, Card, SectionHeader } from '@/components/ui';
import { AgroColors, IconSize, Spacing, Typography } from '@/constants/theme';
import { useConsultaAoVivo } from '@/database';
import { listarLotes, TABELAS_LOTES, type LoteResumo } from '@/services/loteService';
import { LoteFormSheet } from './LoteFormSheet';

const abrirLote = (id: string) => router.push(`/lote/${encodeURIComponent(id)}` as Href);

/**
 * Lotes na aba Rebanho (RF-014): opcionais (RF-016), cada um com quantos
 * animais tem e o pasto em que está. Tocar abre a tela do lote.
 */
export function LotesCard() {
  const { dados: lotes, carregado } = useConsultaAoVivo<LoteResumo[]>(
    () => listarLotes(),
    TABELAS_LOTES,
    'lotes',
    []
  );
  const [criando, setCriando] = useState(false);

  return (
    <View style={estilos.secao}>
      <SectionHeader
        title="Lotes"
        rightElement={
          <Pressable onPress={() => setCriando(true)} hitSlop={8} accessibilityRole="button" style={estilos.novo}>
            <AppIcon name="plus" size={IconSize.md} color={AgroColors.primary} />
            <Text style={estilos.novoTexto}>Novo lote</Text>
          </Pressable>
        }
      />
      <Card padding="three">
        {carregado && lotes.length === 0 ? (
          <Text style={estilos.vazio}>
            Lotes são opcionais: agrupe animais (ex.: Novilhas) para mover vários de pasto de uma vez.
          </Text>
        ) : (
          lotes.map((lote, indice) => (
            <Pressable
              key={lote.id}
              onPress={() => abrirLote(lote.id)}
              accessibilityRole="button"
              style={({ pressed }) => [estilos.linha, indice > 0 && estilos.divisor, pressed && estilos.pressionado]}>
              <View style={estilos.textos}>
                <Text style={estilos.nome} numberOfLines={1}>
                  {lote.nome}
                </Text>
                <Text style={estilos.detalhe} numberOfLines={1}>
                  {[lote.animais === 1 ? '1 animal' : `${lote.animais} animais`, lote.areaNome ?? 'sem local'].join(
                    ' · '
                  )}
                </Text>
              </View>
              <AppIcon name="chevronRight" size={IconSize.lg} color={AgroColors.textMuted} />
            </Pressable>
          ))
        )}
      </Card>

      {criando ? (
        <LoteFormSheet
          onClose={() => setCriando(false)}
          onSalvo={(lote) => {
            setCriando(false);
            abrirLote(lote.id);
          }}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: { gap: Spacing.md },
  novo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  novoTexto: { ...Typography.captionBold, fontSize: 14, color: AgroColors.primary },
  vazio: { ...Typography.caption, fontSize: 14, lineHeight: 20 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  divisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  pressionado: { opacity: 0.75 },
  textos: { flex: 1, gap: 2 },
  nome: { ...Typography.bodyBold, fontSize: 16 },
  detalhe: { ...Typography.caption, fontSize: 13.5 },
});
