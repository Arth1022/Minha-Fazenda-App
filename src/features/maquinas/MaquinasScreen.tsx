import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AgroColors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useMaquinas } from './useMaquinas';

export default function MaquinasScreen() {
  const { maquinas } = useMaquinas();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Header
            title="Máquinas & Frota"
            subtitle="Tratores, Implementos e Manutenção"
          />

          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">🚜 Máquinas e Implementos ({maquinas.length})</ThemedText>
            {maquinas.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhuma máquina cadastrada ainda no banco local.
              </ThemedText>
            ) : (
              maquinas.map((m) => (
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
              ))
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
});
