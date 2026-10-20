import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AgroColors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useEstoque } from './useEstoque';

export default function EstoqueScreen() {
  const { insumos, medicamentos, pecas, ajustarQuantidade: handleAdjust } = useEstoque();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Header
            title="Estoque Fazenda"
            subtitle="Insumos, Medicamentos e Peças (Offline)"
          />

          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">🌾 Insumos</ThemedText>
            {insumos.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhum insumo registrado no estoque local.
              </ThemedText>
            ) : (
              <View style={styles.gridRow}>
                {insumos.map((item) => (
                  <View key={item.id} style={styles.insumoCard}>
                    <Text style={styles.insumoTitle}>{item.nome}</Text>
                    <Text style={styles.insumoQty}>
                      {item.quantidade} {item.unidade}
                    </Text>
                    <View style={styles.qtyActions}>
                      <Pressable
                        onPress={() => handleAdjust(item.id, -10)}
                        style={styles.qtyBtn}>
                        <Text style={styles.qtyBtnText}>-10</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleAdjust(item.id, 10)}
                        style={[styles.qtyBtn, styles.qtyBtnPlus]}>
                        <Text style={styles.qtyBtnPlusText}>+10</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">💉 Medicamentos</ThemedText>
            {medicamentos.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhum medicamento registrado no estoque local.
              </ThemedText>
            ) : (
              medicamentos.map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <View>
                    <ThemedText style={styles.itemName}>{item.nome}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Mínimo ideal: {item.estoqueMinimo ?? 0} {item.unidade}
                    </ThemedText>
                  </View>
                  <Text style={styles.itemQtyBadge}>
                    {item.quantidade} {item.unidade}
                  </Text>
                </View>
              ))
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">⚙️ Peças de Máquinas</ThemedText>
            {pecas.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhuma peça de máquina registrada no estoque local.
              </ThemedText>
            ) : (
              pecas.map((item) => {
                const isLow = item.quantidade <= (item.estoqueMinimo || 0);
                return (
                  <View
                    key={item.id}
                    style={[styles.listRow, isLow && styles.lowStockRow]}>
                    <View>
                      <ThemedText style={styles.itemName}>{item.nome}</ThemedText>
                      {isLow && (
                        <Text style={styles.warningText}>
                          ⚠️ Alerta: Abaixo do estoque mínimo ({item.estoqueMinimo} {item.unidade})
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.itemQtyBadge, isLow && styles.lowStockBadge]}>
                      {item.quantidade} {item.unidade}
                    </Text>
                  </View>
                );
              })
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  sectionCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  insumoCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: AgroColors.mintBg,
    borderWidth: 1.5,
    borderColor: AgroColors.mintBorder,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
    gap: 6,
  },
  insumoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#112211',
  },
  insumoQty: {
    fontSize: 18,
    fontWeight: '800',
    color: AgroColors.primaryDark,
  },
  qtyActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  qtyBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  qtyBtnText: {
    fontWeight: '700',
    color: '#334155',
    fontSize: 12,
  },
  qtyBtnPlus: {
    backgroundColor: AgroColors.primary,
    borderColor: AgroColors.primary,
  },
  qtyBtnPlusText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 12,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.18)',
  },
  lowStockRow: {
    backgroundColor: AgroColors.warningBg,
    borderColor: AgroColors.warning,
  },
  itemName: {
    fontWeight: '700',
    fontSize: 16,
  },
  warningText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },
  itemQtyBadge: {
    fontWeight: '800',
    fontSize: 16,
    color: AgroColors.primary,
  },
  lowStockBadge: {
    color: AgroColors.danger,
  },
});
