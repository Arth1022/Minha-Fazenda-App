import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RelativePathString, useRouter } from 'expo-router';

import { Header } from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AgroColors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import Animal from '@/entities/Animal';
import Ordenha from '@/entities/Ordenha';
import Tratamento from '@/entities/Tratamento';
import { animalRepository } from './AnimalRepository';
import { ordenhaRepository } from './OrdenhaRepository';
import { tratamentoRepository } from './TratamentoRepository';

export default function RebanhoScreen() {
  const router = useRouter();
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [ordenhas, setOrdenhas] = useState<Ordenha[]>([]);

  useEffect(() => {
    const subAnimais = animalRepository.observeAll().subscribe(setAnimais);
    const subTratamentos = tratamentoRepository.observeAll().subscribe(setTratamentos);
    const subOrdenhas = ordenhaRepository.observeAll().subscribe(setOrdenhas);

    return () => {
      subAnimais.unsubscribe();
      subTratamentos.unsubscribe();
      subOrdenhas.unsubscribe();
    };
  }, []);

  const totalVolumeL = ordenhas.reduce((acc, o) => acc + (o.volumeLitros || 0), 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Header
            title="Rebanho & Manejo"
            subtitle="Gado, Tratamento Sanitário e Ordenha"
          />

          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">🐄 Rebanho Registrado ({animais.length})</ThemedText>
            {animais.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhum animal cadastrado ainda no banco local.
              </ThemedText>
            ) : (
              animais.map((animal) => (
                <Pressable
                  key={animal.id}
                  onPress={() => router.push(`/animal/${animal.id}` as RelativePathString)}
                  style={({ pressed }) => [styles.animalCard, pressed && styles.pressed]}>
                  <View style={styles.animalHeader}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarEmoji}>🐄</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.brincoTitle}>
                        Brinco {animal.brinco} {animal.nome ? `• ${animal.nome}` : ''}
                      </Text>
                      <Text style={styles.breedSubtitle}>
                        {animal.raca || 'Sem raça definida'}
                      </Text>
                    </View>
                    <View style={styles.activeCheckBadge}>
                      <Text style={styles.activeCheckText}>Ficha →</Text>
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
                </Pressable>
              ))
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">💊 Tratamento Animal ({tratamentos.length})</ThemedText>
            {tratamentos.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhum tratamento sanitário ativo no momento.
              </ThemedText>
            ) : (
              tratamentos.map((trat) => (
                <View key={trat.id} style={styles.treatmentCard}>
                  <View style={styles.treatmentTop}>
                    <Text style={styles.medName}>{trat.medicamento}</Text>
                    <Text style={styles.notifBadge}>
                      {trat.notificacaoAtiva ? '🔔 Alerta Ativo' : 'Silenciado'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">🥛 Controle de Ordenha ({ordenhas.length})</ThemedText>
            {ordenhas.map((o) => (
              <View key={o.id} style={styles.ordenhaRow}>
                <View>
                  <Text style={styles.periodoTitle}>
                    {o.periodo === 'manha' ? '🌅 Manhã' : '🌇 Tarde'}
                  </Text>
                  <Text style={styles.horarioText}>
                    Horário: {o.horarioPrevisto || '06:00'} • Notificação:{' '}
                    {o.horarioNotificacao || '05:45'}
                  </Text>
                </View>
                <Text style={styles.volumeBadge}>{o.volumeLitros || 0} L</Text>
              </View>
            ))}

            <View style={styles.totalVolumeRow}>
              <ThemedText type="smallBold">Volume Diário Registrado</ThemedText>
              <Text style={styles.totalVolumeValue}>{totalVolumeL} L</Text>
            </View>
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
  pressed: {
    opacity: 0.8,
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
  ordenhaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AgroColors.mintBg,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  periodoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#112211',
  },
  horarioText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 2,
  },
  volumeBadge: {
    fontSize: 18,
    fontWeight: '800',
    color: AgroColors.primaryDark,
  },
  totalVolumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  totalVolumeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: AgroColors.primary,
  },
});
