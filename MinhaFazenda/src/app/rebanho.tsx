import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgroHeader } from '@/components/agro-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AgroColors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { animalRepository, tratamentoRepository } from '@/database';
import { useLocalDatabase } from '@/database/DatabaseProvider';

export default function RebanhoScreen() {
  const { isInitialized } = useLocalDatabase();
  const [animais, setAnimais] = useState<any[]>([]);
  const [tratamentos, setTratamentos] = useState<any[]>([]);

  const loadRebanho = useCallback(async () => {
    try {
      const [allAnimais, allTratamentos] = await Promise.all([
        animalRepository.getAll(),
        tratamentoRepository.getAll(),
      ]);
      setAnimais(allAnimais);
      setTratamentos(allTratamentos);
    } catch (error) {
      console.error('Erro ao carregar rebanho:', error);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      loadRebanho();
    }
  }, [isInitialized, loadRebanho]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <AgroHeader
            title="Gerenciamento Rebanho"
            subtitle="Controle de Gado e Tratamento Animal (Offline)"
          />

          {/* Cards de Animais conforme protótipo */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">🐄 Rebanho Registrado ({animais.length})</ThemedText>
            {animais.map((animal) => (
              <View key={animal.id} style={styles.animalCard}>
                <View style={styles.animalHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarEmoji}>🐄</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.brincoTitle}>
                      Brinco {animal.brinco} {animal.nome ? `• ${animal.nome}` : ''}
                    </Text>
                    <Text style={styles.breedSubtitle}>{animal.raca || 'Sem raça definida'}</Text>
                  </View>
                  <View style={styles.activeCheckBadge}>
                    <Text style={styles.activeCheckText}>✓ Ativo</Text>
                  </View>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Peso</Text>
                    <Text style={styles.metricValue}>{animal.pesoKg || 0} kg</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Produção de Leite</Text>
                    <Text style={[styles.metricValue, { color: AgroColors.waterBlue }]}>
                      💧 {animal.producaoLeiteL || 0} L
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Crias</Text>
                    <Text style={styles.metricValue}>{animal.crias || 0}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Ração Consumida</Text>
                    <Text style={styles.metricValue}>{animal.racaoKgDia || 0} kg/dia</Text>
                  </View>
                </View>
              </View>
            ))}
          </ThemedView>

          {/* Tratamento Animal */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">💊 Tratamento Animal ({tratamentos.length})</ThemedText>
            {tratamentos.map((trat) => (
              <View key={trat.id} style={styles.treatmentCard}>
                <View style={styles.treatmentTop}>
                  <Text style={styles.medName}>{trat.medicamento}</Text>
                  <Text style={styles.notifBadge}>
                    {trat.notificacaoAtiva ? '🔔 Alerta Ativo' : 'Silenciado'}
                  </Text>
                </View>
                <View style={styles.daysRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <View key={d} style={styles.dayBubble}>
                      <Text style={styles.dayNum}>{d}</Text>
                      <Text style={styles.dayCheck}>✓</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
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
  animalCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  animalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AgroColors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  brincoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#112211',
  },
  breedSubtitle: {
    fontSize: 13,
    color: '#475569',
  },
  activeCheckBadge: {
    backgroundColor: AgroColors.mintBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeCheckText: {
    color: AgroColors.primaryDark,
    fontWeight: '800',
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: Spacing.two,
  },
  metricItem: {
    minWidth: '45%',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#112211',
  },
  treatmentCard: {
    backgroundColor: AgroColors.mintBg,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  treatmentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#112211',
  },
  notifBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.primaryDark,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dayNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dayCheck: {
    fontSize: 13,
    fontWeight: '800',
    color: AgroColors.primary,
  },
});
