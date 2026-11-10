import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import { formatDiaMes } from '@/utils/date';
import { linhaDoTempoDoLocal, resumoDoLocal, type PassagemDoAnimal } from '../../services/local';

export interface OndeEstaSheetProps {
  visible: boolean;
  /** "Teste · Brinco 23232" */
  identificacao: string;
  historico: readonly PassagemDoAnimal[];
  atual: PassagemDoAnimal | null;
  loteNome: string | null;
  onMover: () => void;
  onTrocarLote: () => void;
  onClose: () => void;
}

const textoDias = (dias: number) => (dias === 1 ? '1 dia' : `${dias} dias`);

/** "Onde está" (protótipo, tela 20): o pasto de agora, o lote e por onde o animal passou. */
export function OndeEstaSheet({
  visible,
  identificacao,
  historico,
  atual,
  loteNome,
  onMover,
  onTrocarLote,
  onClose,
}: OndeEstaSheetProps) {
  const resumo = resumoDoLocal(atual, loteNome);
  const itens = useMemo(() => linhaDoTempoDoLocal(historico), [historico]);
  const cor = atual ? COR_POR_TIPO_AREA[atual.areaTipo] : AgroColors.borderStrong;

  return (
    <BottomSheet visible={visible} title="Onde está" subtitle={identificacao} alturaMaxima={0.75} onClose={onClose}>
      <View style={estilos.atual}>
        <View style={[estilos.barra, { backgroundColor: cor }]} />
        <View style={estilos.atualTextos}>
          <Text style={estilos.atualTitulo}>{resumo.titulo}</Text>
          {resumo.detalhe ? <Text style={estilos.atualDetalhe}>{resumo.detalhe}</Text> : null}
        </View>
        <Pressable
          onPress={onMover}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.mover, pressed && estilos.pressionado]}>
          <Text style={estilos.moverTexto}>{atual ? 'Mover' : 'Colocar'}</Text>
        </Pressable>
      </View>

      <View style={estilos.lote}>
        <Text style={estilos.loteRotulo}>Lote</Text>
        <Text style={estilos.loteNome} numberOfLines={1}>
          {loteNome ?? 'Sem lote'}
        </Text>
        <Pressable onPress={onTrocarLote} hitSlop={8} accessibilityRole="button">
          <Text style={estilos.link}>{loteNome ? 'Trocar' : 'Escolher'}</Text>
        </Pressable>
      </View>

      <Text style={estilos.historico}>Histórico</Text>
      {itens.length === 0 ? (
        <Text style={estilos.vazio}>Ainda não esteve em nenhum pasto.</Text>
      ) : (
        itens.map((item, indice) => (
          <View key={item.chave} style={estilos.item}>
            <View style={estilos.trilho}>
              <View style={[estilos.ponto, item.atual && estilos.pontoAtual]} />
              {indice < itens.length - 1 ? <View style={estilos.linha} /> : null}
            </View>
            <View style={estilos.itemTextos}>
              <View style={estilos.itemCabecalho}>
                <Text style={[estilos.itemTitulo, item.semLocal && estilos.itemSemLocal]}>{item.titulo}</Text>
                {item.dias !== null && !item.semLocal ? (
                  <Text style={estilos.itemDias}>{textoDias(item.dias)}</Text>
                ) : null}
              </View>
              <Text style={estilos.itemDetalhe}>
                {item.de === null
                  ? `até ${formatDiaMes(item.ate!)}`
                  : [`${formatDiaMes(item.de)} → ${item.ate ? formatDiaMes(item.ate) : 'hoje'}`, item.por ? `por ${item.por}` : null]
                      .filter(Boolean)
                      .join(' · ')}
              </Text>
            </View>
          </View>
        ))
      )}
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  atual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
  },
  barra: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
  atualTextos: { flex: 1, gap: 2 },
  atualTitulo: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: AgroColors.textPrimary },
  atualDetalhe: { ...Typography.bodyMedium },
  mover: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: AgroColors.forest,
  },
  moverTexto: { ...Typography.bodyBold, fontSize: 15, color: AgroColors.forest },
  pressionado: { opacity: 0.7 },
  lote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: 2 },
  loteRotulo: { ...Typography.bodyMedium },
  loteNome: { flex: 1, ...Typography.bodyBold, fontSize: 15 },
  link: { ...Typography.bodyBold, fontSize: 15, color: AgroColors.forest },
  historico: { ...Typography.sectionTitle, fontSize: 16, color: AgroColors.textSecondary, marginTop: Spacing.sm },
  vazio: { ...Typography.body, color: AgroColors.textMuted },
  item: { flexDirection: 'row', gap: Spacing.md },
  trilho: { width: 16, alignItems: 'center' },
  ponto: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
    borderWidth: 2,
    borderColor: AgroColors.textMuted,
    backgroundColor: AgroColors.cardBg,
  },
  pontoAtual: { borderColor: AgroColors.forest, backgroundColor: AgroColors.forest },
  linha: { flex: 1, width: 2, marginVertical: 2, backgroundColor: AgroColors.border },
  itemTextos: { flex: 1, gap: 2, paddingBottom: Spacing.three },
  itemCabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  itemTitulo: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '700', color: AgroColors.textPrimary },
  itemSemLocal: { color: AgroColors.textSecondary },
  itemDias: { ...Typography.bodyMedium, fontSize: 14 },
  itemDetalhe: { ...Typography.bodyMedium, fontSize: 14 },
});
