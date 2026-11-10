import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, BottomSheet } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import type { LoteResumo } from '@/services/loteService';

export interface EscolherLoteSheetProps {
  /** "Estrela · Brinco 10388" */
  identificacao: string;
  lotes: readonly LoteResumo[];
  loteAtualId: string | null;
  /** Grava a troca; null tira do lote */
  onEscolher: (loteId: string | null) => Promise<void>;
  onNovoLote: () => void;
  onClose: () => void;
}

/** Lote do animal pela ficha (RF-015): um lote só por animal (RN-001), ou nenhum. */
export function EscolherLoteSheet({
  identificacao,
  lotes,
  loteAtualId,
  onEscolher,
  onNovoLote,
  onClose,
}: EscolherLoteSheetProps) {
  const [salvando, setSalvando] = useState(false);

  const escolher = async (loteId: string | null) => {
    if (salvando) return;
    if (loteId === loteAtualId) {
      onClose();
      return;
    }
    setSalvando(true);
    try {
      await onEscolher(loteId);
      onClose();
    } catch (erro) {
      Alert.alert('Não deu certo', erro instanceof Error ? erro.message : 'Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const opcoes = [
    ...lotes.map((l) => ({
      id: l.id as string | null,
      titulo: l.nome,
      detalhe: [l.animais === 1 ? '1 animal' : `${l.animais} animais`, l.areaNome].filter(Boolean).join(' · '),
    })),
    { id: null, titulo: 'Sem lote', detalhe: 'O animal fica solto, sem grupo' },
  ];

  return (
    <BottomSheet visible title="Lote" subtitle={identificacao} alturaMaxima={0.7} onClose={onClose}>
      {opcoes.map((opcao) => {
        const atual = opcao.id === loteAtualId;
        return (
          <Pressable
            key={opcao.id ?? 'sem-lote'}
            onPress={() => escolher(opcao.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: atual }}
            style={({ pressed }) => [estilos.opcao, atual && estilos.opcaoAtual, pressed && estilos.pressionado]}>
            <View style={estilos.textos}>
              <Text style={estilos.titulo}>{opcao.titulo}</Text>
              <Text style={estilos.detalhe}>{opcao.detalhe}</Text>
            </View>
            {atual ? <AppIcon name="check" size={IconSize.lg} color={AgroColors.forest} /> : null}
          </Pressable>
        );
      })}
      <Pressable onPress={onNovoLote} hitSlop={8} accessibilityRole="button" style={estilos.novo}>
        <AppIcon name="plus" size={IconSize.lg} color={AgroColors.forest} />
        <Text style={estilos.novoTexto}>Novo lote</Text>
      </Pressable>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
  },
  opcaoAtual: { borderColor: AgroColors.forest },
  pressionado: { opacity: 0.8 },
  textos: { flex: 1, gap: 2 },
  titulo: { ...Typography.bodyBold, fontSize: 16 },
  detalhe: { ...Typography.caption, fontSize: 13.5 },
  novo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm },
  novoTexto: { ...Typography.bodyBold, fontSize: 15, color: AgroColors.forest },
});
