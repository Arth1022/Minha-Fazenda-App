import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AgroHeader } from '@/components/agro-header';
import { DatabasePersistenceTest } from '@/components/database-persistence-test';
import { ThemedView } from '@/components/themed-view';
import { AgroColors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <AgroHeader
            title="AgroFazenda"
            subtitle="Gestão Rural Local-First • Operação sem Internet"
          />

          {/* Botão Principal de Acesso ao Mapeamento (Sprint 1) */}
          <Pressable
            onPress={() => router.push('/mapa')}
            style={({ pressed }) => [styles.primaryHeroBanner, pressed && styles.pressed]}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroBadge}>ACESSO PRINCIPAL • CAMPO</Text>
              <Text style={styles.heroTitle}>🗺️ Mapeamento & Áreas da Fazenda</Text>
              <Text style={styles.heroDesc}>
                Registre suas terras, divida em talhões, calcule hectares, cercas e sementes mesmo sem sinal.
              </Text>
            </View>
            <View style={styles.heroCtaBox}>
              <Text style={styles.heroCtaText}>Abrir Mapa →</Text>
            </View>
          </Pressable>

          {/* Atalhos Grandes e Legíveis para os Módulos */}
          <View style={styles.modulesGrid}>
            <Pressable
              onPress={() => router.push('/mapa')}
              style={({ pressed }) => [styles.moduleCard, pressed && styles.pressed]}>
              <Text style={styles.moduleEmoji}>📐</Text>
              <Text style={styles.moduleTitle}>Mapa & Talhões</Text>
              <Text style={styles.moduleSub}>Áreas em Ha e Cercas</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/rebanho')}
              style={({ pressed }) => [styles.moduleCard, pressed && styles.pressed]}>
              <Text style={styles.moduleEmoji}>🐄</Text>
              <Text style={styles.moduleTitle}>Rebanho</Text>
              <Text style={styles.moduleSub}>Gado e Tratamentos</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/estoque')}
              style={({ pressed }) => [styles.moduleCard, pressed && styles.pressed]}>
              <Text style={styles.moduleEmoji}>🌾</Text>
              <Text style={styles.moduleTitle}>Estoque</Text>
              <Text style={styles.moduleSub}>Insumos e Vacinas</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/maquinas')}
              style={({ pressed }) => [styles.moduleCard, pressed && styles.pressed]}>
              <Text style={styles.moduleEmoji}>🚜</Text>
              <Text style={styles.moduleTitle}>Máquinas & Ordenha</Text>
              <Text style={styles.moduleSub}>Frota e Produção</Text>
            </Pressable>
          </View>

          {/* Painel de Validação e Persistência Local WatermelonDB */}
          <View style={styles.fullWidth}>
            <DatabasePersistenceTest />
          </View>
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
    alignItems: 'stretch',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  fullWidth: {
    width: '100%',
    alignItems: 'center',
  },
  primaryHeroBanner: {
    backgroundColor: AgroColors.primary,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 2,
    borderColor: AgroColors.primaryDark,
  },
  pressed: {
    opacity: 0.85,
  },
  heroTextCol: {
    gap: 6,
  },
  heroBadge: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroDesc: {
    color: '#ECFDF5',
    fontSize: 14,
    lineHeight: 20,
  },
  heroCtaBox: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Spacing.two,
  },
  heroCtaText: {
    color: AgroColors.primaryDark,
    fontWeight: '800',
    fontSize: 16,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  moduleCard: {
    minWidth: '47%',
    flex: 1,
    backgroundColor: AgroColors.mintBg,
    borderWidth: 2,
    borderColor: AgroColors.mintBorder,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: 4,
  },
  moduleEmoji: {
    fontSize: 28,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#112211',
    marginTop: 2,
  },
  moduleSub: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
});
