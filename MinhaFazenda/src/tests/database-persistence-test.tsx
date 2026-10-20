import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  animalRepository,
  estoqueRepository,
  maquinaRepository,
  ordenhaRepository,
  talhaoRepository,
  tratamentoRepository,
} from '@/database';
import {
  runPersistenceTest,
  PersistenceTestResult,
} from './persistenceTest';

interface DatabaseCounts {
  talhoes: number;
  animais: number;
  estoque: number;
  maquinas: number;
  ordenhas: number;
  tratamentos: number;
}

export function DatabasePersistenceTest() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<PersistenceTestResult | null>(null);
  const [counts, setCounts] = useState<DatabaseCounts>({
    talhoes: 0,
    animais: 0,
    estoque: 0,
    maquinas: 0,
    ordenhas: 0,
    tratamentos: 0,
  });
  const [recentAnimals, setRecentAnimals] = useState<any[]>([]);

  // Atualiza as contagens e dados persistidos
  const refreshData = async () => {
    try {
      const [talhoes, animais, estoque, maquinas, ordenhas, tratamentos, allAnimais] =
        await Promise.all([
          talhaoRepository.count(),
          animalRepository.count(),
          estoqueRepository.count(),
          maquinaRepository.count(),
          ordenhaRepository.count(),
          tratamentoRepository.count(),
          animalRepository.getAll(),
        ]);

      setCounts({
        talhoes,
        animais,
        estoque,
        maquinas,
        ordenhas,
        tratamentos,
      });

      setRecentAnimals(allAnimais.slice(-4).reverse());
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleRunTest = async (cleanup: boolean = false) => {
    setLoading(true);
    try {
      const result = await runPersistenceTest(cleanup);
      setTestResult(result);
      await refreshData();
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuickAnimal = async () => {
    setLoading(true);
    try {
      const tag = Math.floor(1000 + Math.random() * 9000);
      await animalRepository.createAnimal({
        brinco: `BR-${tag}`,
        nome: `Vaca ${tag}`,
        raca: 'Girolando',
        pesoKg: 480,
        producaoLeiteL: 22.0,
      });
      await refreshData();
    } catch (err) {
      console.error('Erro ao adicionar animal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        tratamentoRepository.deleteAll(),
        animalRepository.deleteAll(),
        talhaoRepository.deleteAll(),
        estoqueRepository.deleteAll(),
        maquinaRepository.deleteAll(),
        ordenhaRepository.deleteAll(),
      ]);
      setTestResult(null);
      await refreshData();
    } catch (err) {
      console.error('Erro ao limpar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="subtitle">💾 Persistência WatermelonDB</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Validação de leitura/escrita e retenção de dados entre aberturas
        </ThemedText>
      </View>

      {/* Grid de Contadores do Banco */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <ThemedText type="small">Animais</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>
            {counts.animais}
          </ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText type="small">Talhões</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>
            {counts.talhoes}
          </ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText type="small">Estoque</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>
            {counts.estoque}
          </ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText type="small">Máquinas</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>
            {counts.maquinas}
          </ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText type="small">Ordenhas</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>
            {counts.ordenhas}
          </ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText type="small">Tratamentos</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>
            {counts.tratamentos}
          </ThemedText>
        </View>
      </View>

      {/* Botões de Ação */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={() => handleRunTest(false)}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>
              ▶ Executar Teste (Persistir)
            </ThemedText>
          )}
        </Pressable>

        <View style={styles.secondaryActions}>
          <Pressable
            style={[styles.secondaryButton, loading && styles.buttonDisabled]}
            onPress={handleAddQuickAnimal}
            disabled={loading}>
            <ThemedText type="small">+ Animal Rápido</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, styles.dangerButton, loading && styles.buttonDisabled]}
            onPress={handleClearAll}
            disabled={loading}>
            <ThemedText type="small" style={styles.dangerText}>
              Limpar Banco
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Lista de Registros Recentes Persistidos */}
      {recentAnimals.length > 0 && (
        <View style={styles.recentSection}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            🐮 Últimos Animais Persistidos no Banco:
          </ThemedText>
          {recentAnimals.map((animal) => (
            <View key={animal.id} style={styles.animalRow}>
              <ThemedText type="small" style={styles.animalBrinco}>
                {animal.brinco}
              </ThemedText>
              <ThemedText type="small">
                {animal.nome || 'Sem nome'} ({animal.raca || 'N/D'})
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {animal.pesoKg ? `${animal.pesoKg}kg` : ''}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Logs do Teste */}
      {testResult && (
        <View
          style={[
            styles.logContainer,
            testResult.success ? styles.logSuccess : styles.logError,
          ]}>
          <ThemedText type="smallBold" style={styles.logTitle}>
            {testResult.success ? '✅ Teste Concluído com Sucesso' : '❌ Falha no Teste'} ({testResult.durationMs}ms)
          </ThemedText>
          <ScrollView style={styles.logScroll} nestedScrollEnabled>
            {testResult.logs.map((log, index) => (
              <ThemedText key={index} type="code" style={styles.logLine}>
                {log}
              </ThemedText>
            ))}
          </ScrollView>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  header: {
    gap: Spacing.half,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  statBox: {
    width: '30%',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    alignItems: 'center',
    gap: Spacing.half,
  },
  statValue: {
    fontWeight: 'bold',
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
  },
  dangerText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  recentSection: {
    marginTop: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
    gap: Spacing.one,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: Spacing.half,
  },
  animalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.half,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  animalBrinco: {
    fontWeight: 'bold',
  },
  logContainer: {
    marginTop: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    maxHeight: 180,
  },
  logSuccess: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    borderColor: '#2E7D32',
    borderWidth: 1,
  },
  logError: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderColor: '#D32F2F',
    borderWidth: 1,
  },
  logTitle: {
    fontWeight: 'bold',
    marginBottom: Spacing.one,
  },
  logScroll: {
    maxHeight: 130,
  },
  logLine: {
    fontSize: 11,
    lineHeight: 16,
  },
});
