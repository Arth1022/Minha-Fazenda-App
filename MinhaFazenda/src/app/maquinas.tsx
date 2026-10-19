import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgroHeader } from '@/components/agro-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AgroColors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { maquinaRepository, ordenhaRepository } from '@/database';
import { useLocalDatabase } from '@/database/DatabaseProvider';

export default function MaquinasScreen() {
  const { isInitialized } = useLocalDatabase();
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [ordenhas, setOrdenhas] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [allMaquinas, allOrdenhas] = await Promise.all([
        maquinaRepository.getAll(),
        ordenhaRepository.getAll(),
      ]);
      setMaquinas(allMaquinas);
      setOrdenhas(allOrdenhas);
    } catch (error) {
      console.error('Erro ao carregar máquinas e ordenhas:', error);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      loadData();
    }
  }, [isInitialized, loadData]);

  const totalVolumeL = ordenhas.reduce((acc, o) => acc + (o.volumeLitros || 0), 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <AgroHeader
            title="Máquinas & Ordenha"
            subtitle="Frota, Manutenção e Horários de Ordenha"
          />

          {/* Máquinas */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">🚜 Máquinas e Implementos</ThemedText>
            {maquinas.map((m) => (
              <View key={m.id} style={styles.machineCard}>
                <Text style={styles.machineEmoji}>🚜</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.machineName}>{m.nome}</Text>
                  <Text style={styles.machineStatus}>
                    Status operacional: {m.statusPercentual ?? 100}%
                  </Text>
                  {m.manutencaoDevida ? (
                    <Text style={styles.maintDueText}>⚠️ Manutenção devida</Text>
                  ) : (
                    <Text style={styles.maintOkText}>✓ Revisão em dia</Text>
                  )}
                </View>
              </View>
            ))}
          </ThemedView>

          {/* Ordenha */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">🥛 Horários de Ordenha</ThemedText>
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
  machineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  machineEmoji: {
    fontSize: 32,
  },
  machineName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#112211',
  },
  machineStatus: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  maintDueText: {
    color: AgroColors.warning,
    fontWeight: '800',
    fontSize: 13,
    marginTop: 4,
  },
  maintOkText: {
    color: AgroColors.primary,
    fontWeight: '800',
    fontSize: 13,
    marginTop: 4,
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
