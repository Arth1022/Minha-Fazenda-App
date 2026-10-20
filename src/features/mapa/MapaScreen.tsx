import React, { useState } from 'react';
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

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { APP_NAME } from '@/constants/app';
import { AgroColors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatHectares } from '@/utils/formatters';
import Talhao, { TipoTalhao } from '@/entities/Talhao';
import {
  calculateFenceMaterials,
  calculatePerimeterFromTalhao,
  calculateSeedRequirementKg,
} from './calculos';
import { TalhaoCard } from './TalhaoCard';
import { useTalhoes } from './useTalhoes';

type ActiveTool = 'area' | 'cercas' | 'sementes';

export default function MapaScreen() {
  const { talhoes, createTalhao } = useTalhoes();
  const [activeTool, setActiveTool] = useState<ActiveTool>('area');
  const [modalVisible, setModalVisible] = useState(false);

  const [novoNome, setNovoNome] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoTalhao>('pastagem');
  const [novaAreaHa, setNovaAreaHa] = useState('');

  const totalAreaHa = talhoes.reduce((acc: number, t: Talhao) => acc + (t.areaHa || 0), 0);
  const totalPerimeterM = talhoes.reduce(
    (acc: number, t: Talhao) =>
      acc + calculatePerimeterFromTalhao(t.areaHa, t.poligonoGeoJson),
    0
  );
  const fenceEstimate = calculateFenceMaterials(totalPerimeterM, 2.5, 5);
  const totalSeedKg = calculateSeedRequirementKg(totalAreaHa, 20);

  const handleAddTalhao = async () => {
    const areaNumber = parseFloat(novaAreaHa.replace(',', '.'));
    if (!novoNome.trim() || isNaN(areaNumber) || areaNumber <= 0) {
      return;
    }

    await createTalhao({
      nome: novoNome.trim(),
      tipo: novoTipo,
      areaHa: areaNumber,
      possuiCerca: true,
    });

    setNovoNome('');
    setNovoTipo('pastagem');
    setNovaAreaHa('');
    setModalVisible(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Header
            title="Mapeamento & Áreas"
            subtitle={`${APP_NAME} • Operação Offline`}
          />

          <View style={styles.mapPreviewCard}>
            <View style={styles.mapTopBar}>
              <Text style={styles.mapPropertyTitle}>Mapa de Talhões</Text>
              <View style={styles.gpsBadge}>
                <Text style={styles.gpsBadgeText}>📍 GPS Local Ativo</Text>
              </View>
            </View>

            <View style={styles.satelliteCanvas}>
              {talhoes.length === 0 ? (
                <Text style={styles.emptyMapText}>
                  Nenhum talhão cadastrado ainda. Toque em &quot;+ Novo Talhão&quot; para iniciar.
                </Text>
              ) : (
                talhoes.map((t: Talhao) => {
                  const isLavoura = t.tipo === 'lavoura';
                  return (
                    <View
                      key={t.id}
                      style={[
                        styles.polygonBox,
                        isLavoura ? styles.polygonLavoura : styles.polygonPasto,
                      ]}>
                      <Text style={styles.polygonLabel}>{t.nome}</Text>
                      <Text style={styles.polygonSubLabel}>{formatHectares(t.areaHa)}</Text>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.mapFooterBar}>
              <Text style={styles.mapFooterText}>
                {talhoes.length} talhões registrados no aparelho
              </Text>
              <Text style={styles.mapTotalHaText}>Total: {formatHectares(totalAreaHa)}</Text>
            </View>
          </View>

          <Card>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="subtitle">Talhões da Propriedade</ThemedText>
              <Button label="+ Novo Talhão" onPress={() => setModalVisible(true)} />
            </View>

            {talhoes.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Cadastre o primeiro talhão da sua propriedade para visualizar a área em hectares.
              </ThemedText>
            ) : (
              talhoes.map((t: Talhao) => <TalhaoCard key={t.id} talhao={t} />)
            )}
          </Card>

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

          <Card>
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
          </Card>
        </ScrollView>

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
                placeholder="Ex: Pasto 1 ou Lavoura Milho"
                placeholderTextColor="#7A8C7D"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Tipo de Uso</Text>
              <View style={styles.chipRow}>
                {(['pastagem', 'lavoura', 'reserva', 'outro'] as const).map((tipo) => (
                  <Pressable
                    key={tipo}
                    onPress={() => setNovoTipo(tipo)}
                    style={[
                      styles.chipBtn,
                      novoTipo === tipo && styles.chipBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        novoTipo === tipo && styles.chipTextActive,
                      ]}>
                      {tipo === 'pastagem'
                        ? 'Pastagem'
                        : tipo === 'lavoura'
                        ? 'Lavoura'
                        : tipo === 'reserva'
                        ? 'Reserva'
                        : 'Outro'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Área (Hectares)</Text>
              <TextInput
                value={novaAreaHa}
                onChangeText={setNovaAreaHa}
                placeholder="Ex: 15.2"
                keyboardType="numeric"
                placeholderTextColor="#7A8C7D"
                style={styles.input}
              />

              <View style={styles.modalButtonsRow}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Salvar Offline"
                  onPress={handleAddTalhao}
                  style={{ flex: 1 }}
                />
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
  emptyMapText: {
    color: '#D1FAE5',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  chipBtnActive: {
    backgroundColor: AgroColors.mintBg,
    borderColor: AgroColors.primaryDark,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: AgroColors.primaryDark,
    fontWeight: '800',
  },
});
