import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgroHeader } from '@/components/agro-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AgroColors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { talhaoRepository } from '@/database';
import { useLocalDatabase } from '@/database/DatabaseProvider';
import {
  calculateFenceMaterials,
  calculateSeedRequirementKg,
  estimatePerimeterFromHectares,
  formatHectares,
} from '@/utils';

type ActiveTool = 'area' | 'cercas' | 'sementes';

export default function MapaScreen() {
  const { isInitialized } = useLocalDatabase();
  const [talhoes, setTalhoes] = useState<any[]>([]);
  const [activeTool, setActiveTool] = useState<ActiveTool>('area');
  const [modalVisible, setModalVisible] = useState(false);

  // Novo talhão form
  const [novoNome, setNovoNome] = useState('');
  const [novoTipo, setNovoTipo] = useState('Pastagem');
  const [novaAreaHa, setNovaAreaHa] = useState('');

  const loadTalhoes = useCallback(async () => {
    try {
      const items = await talhaoRepository.getAll();
      setTalhoes(items);
    } catch (error) {
      console.error('Erro ao carregar talhões locais:', error);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      loadTalhoes();
    }
  }, [isInitialized, loadTalhoes]);

  const totalAreaHa = talhoes.reduce((acc, t) => acc + (t.areaHa || 0), 0);
  const totalPerimeterM = talhoes.reduce(
    (acc, t) => acc + estimatePerimeterFromHectares(t.areaHa || 0),
    0
  );
  const fenceEstimate = calculateFenceMaterials(totalPerimeterM, 2.5, 5);
  const totalSeedKg = calculateSeedRequirementKg(totalAreaHa, 20);

  const handleAddTalhao = async () => {
    const areaNumber = parseFloat(novaAreaHa.replace(',', '.'));
    if (!novoNome.trim() || isNaN(areaNumber) || areaNumber <= 0) {
      return;
    }

    await talhaoRepository.createTalhao({
      nome: novoNome.trim(),
      tipo: novoTipo.trim() || 'Pastagem',
      areaHa: areaNumber,
      possuiCerca: true,
    });

    setNovoNome('');
    setNovaAreaHa('');
    setModalVisible(false);
    await loadTalhoes();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <AgroHeader
            title="Mapeamento & Áreas"
            subtitle="Fazenda Recanto Verde • Operação Offline"
          />

          {/* Visualizador Esquemático de Satélite e Polígonos dos Talhões */}
          <View style={styles.mapPreviewCard}>
            <View style={styles.mapTopBar}>
              <Text style={styles.mapPropertyTitle}>Fazenda Recanto Verde</Text>
              <View style={styles.gpsBadge}>
                <Text style={styles.gpsBadgeText}>📍 GPS Local Ativo</Text>
              </View>
            </View>

            <View style={styles.satelliteCanvas}>
              {talhoes.map((t, index) => {
                const isLavoura =
                  (t.tipo || '').toLowerCase().includes('lavoura') ||
                  (t.nome || '').toLowerCase().includes('lavoura');
                return (
                  <View
                    key={t.id || index}
                    style={[
                      styles.polygonBox,
                      isLavoura ? styles.polygonLavoura : styles.polygonPasto,
                    ]}>
                    <Text style={styles.polygonLabel}>{t.nome}</Text>
                    <Text style={styles.polygonSubLabel}>{formatHectares(t.areaHa)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.mapFooterBar}>
              <Text style={styles.mapFooterText}>
                {talhoes.length} talhões registrados no aparelho
              </Text>
              <Text style={styles.mapTotalHaText}>Total: {formatHectares(totalAreaHa)}</Text>
            </View>
          </View>

          {/* Lista de Talhões com botões grandes */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="subtitle">Talhões da Propriedade</ThemedText>
              <Pressable
                onPress={() => setModalVisible(true)}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <Text style={styles.addButtonText}>+ Novo Talhão</Text>
              </Pressable>
            </View>

            {talhoes.map((t, idx) => {
              const isLavoura =
                (t.tipo || '').toLowerCase().includes('lavoura') ||
                (t.nome || '').toLowerCase().includes('lavoura');
              return (
                <View key={t.id || idx} style={styles.talhaoRow}>
                  <View style={styles.talhaoLeft}>
                    <View
                      style={[
                        styles.colorIndicator,
                        {
                          backgroundColor: isLavoura
                            ? AgroColors.wheatGold
                            : AgroColors.primaryLight,
                        },
                      ]}
                    />
                    <View>
                      <ThemedText style={styles.talhaoName}>{t.nome}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.tipo || 'Área Rural'} • {t.possuiCerca ? 'Com cerca' : 'Sem cerca'}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.talhaoArea}>
                    {formatHectares(t.areaHa)}
                  </ThemedText>
                </View>
              );
            })}
          </ThemedView>

          {/* 3 Botões Grandes de Ferramentas do Campo (Conforme Protótipo) */}
          <View style={styles.bigActionsRow}>
            <Pressable
              onPress={() => setActiveTool('area')}
              style={[
                styles.bigActionCard,
                activeTool === 'area' && styles.bigActionCardActive,
              ]}>
              <Text style={styles.bigActionIcon}>📐</Text>
              <Text style={styles.bigActionTitle}>Calcular Área</Text>
              <Text style={styles.bigActionValue}>{formatHectares(totalAreaHa)}</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTool('cercas')}
              style={[
                styles.bigActionCard,
                activeTool === 'cercas' && styles.bigActionCardActive,
              ]}>
              <Text style={styles.bigActionIcon}>🚧</Text>
              <Text style={styles.bigActionTitle}>Cercas</Text>
              <Text style={styles.bigActionValue}>
                {(totalPerimeterM / 1000).toFixed(1)} km
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTool('sementes')}
              style={[
                styles.bigActionCard,
                activeTool === 'sementes' && styles.bigActionCardActive,
              ]}>
              <Text style={styles.bigActionIcon}>🌱</Text>
              <Text style={styles.bigActionTitle}>Kg Sementes</Text>
              <Text style={styles.bigActionValue}>{totalSeedKg} kg</Text>
            </Pressable>
          </View>

          {/* Detalhe da ferramenta selecionada */}
          <ThemedView type="backgroundElement" style={styles.toolDetailCard}>
            {activeTool === 'area' && (
              <View style={styles.toolDetailBody}>
                <ThemedText type="smallBold">
                  📐 Resumo de Área Total (Cálculo Offline)
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Soma automática de todos os polígonos de talhões salvos no banco local:
                </ThemedText>
                <Text style={styles.highlightMetric}>
                  {formatHectares(totalAreaHa)} ({Math.round(totalAreaHa * 10000).toLocaleString()} m²)
                </Text>
              </View>
            )}

            {activeTool === 'cercas' && (
              <View style={styles.toolDetailBody}>
                <ThemedText type="smallBold">
                  🚧 Estimativa de Material para Cercas (5 fios / 2.5m)
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Perímetro estimado: {fenceEstimate.perimeterMeters} metros
                </ThemedText>
                <Text style={styles.highlightMetric}>
                  {fenceEstimate.postsNeeded} mourões • {fenceEstimate.wireMetersNeeded}m de arame ({fenceEstimate.wireRolls500m} rolos)
                </Text>
              </View>
            )}

            {activeTool === 'sementes' && (
              <View style={styles.toolDetailBody}>
                <ThemedText type="smallBold">
                  🌱 Planejamento de Sementes (Taxa base: 20 kg/ha)
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Necessidade estimada para cobrir {formatHectares(totalAreaHa)}:
                </ThemedText>
                <Text style={styles.highlightMetric}>
                  {totalSeedKg} kg de sementes ({Math.ceil(totalSeedKg / 20)} sacas de 20kg)
                </Text>
              </View>
            )}
          </ThemedView>
        </ScrollView>

        {/* Modal para criar novo Talhão offline */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Novo Talhão (Salvo no Celular)</Text>

              <Text style={styles.inputLabel}>Nome do Talhão</Text>
              <TextInput
                value={novoNome}
                onChangeText={setNovoNome}
                placeholder="Ex: Pasto 3 ou Lavoura Soja"
                placeholderTextColor="#7A8C7D"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Tipo de Uso</Text>
              <TextInput
                value={novoTipo}
                onChangeText={setNovoTipo}
                placeholder="Pastagem ou Lavoura"
                placeholderTextColor="#7A8C7D"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Área (Hectares)</Text>
              <TextInput
                value={novaAreaHa}
                onChangeText={setNovaAreaHa}
                placeholder="Ex: 18.5"
                keyboardType="numeric"
                placeholderTextColor="#7A8C7D"
                style={styles.input}
              />

              <View style={styles.modalButtonsRow}>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={[styles.modalBtn, styles.modalBtnCancel]}>
                  <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddTalhao}
                  style={[styles.modalBtn, styles.modalBtnConfirm]}>
                  <Text style={styles.modalBtnConfirmText}>Salvar Offline</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
  mapPreviewCard: {
    backgroundColor: '#1E3F24',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2E5A36',
  },
  mapTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  mapPropertyTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  gpsBadge: {
    backgroundColor: 'rgba(46, 125, 50, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  gpsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  satelliteCanvas: {
    minHeight: 170,
    padding: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  polygonBox: {
    minWidth: 130,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  polygonPasto: {
    backgroundColor: 'rgba(76, 175, 80, 0.35)',
    borderColor: '#81C784',
  },
  polygonLavoura: {
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    borderColor: '#FCD34D',
  },
  polygonLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  polygonSubLabel: {
    color: '#E8F5E9',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 2,
  },
  mapFooterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  mapFooterText: {
    color: '#D1FAE5',
    fontSize: 12,
  },
  mapTotalHaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  sectionCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  addButton: {
    backgroundColor: AgroColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Spacing.two,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  talhaoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  talhaoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  colorIndicator: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  talhaoName: {
    fontWeight: '700',
    fontSize: 16,
  },
  talhaoArea: {
    fontWeight: '800',
    fontSize: 17,
  },
  bigActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bigActionCard: {
    flex: 1,
    backgroundColor: AgroColors.mintBg,
    borderWidth: 2,
    borderColor: AgroColors.mintBorder,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bigActionCardActive: {
    borderColor: AgroColors.primaryDark,
    backgroundColor: '#D1FAE5',
  },
  bigActionIcon: {
    fontSize: 26,
  },
  bigActionTitle: {
    color: '#112211',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  bigActionValue: {
    color: AgroColors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  toolDetailCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  toolDetailBody: {
    gap: 6,
  },
  highlightMetric: {
    color: AgroColors.primary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#112211',
    marginBottom: Spacing.one,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: Spacing.two,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#112211',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#E5E7EB',
  },
  modalBtnCancelText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 15,
  },
  modalBtnConfirm: {
    backgroundColor: AgroColors.primary,
  },
  modalBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
