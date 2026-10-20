import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { Header } from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import Animal from '@/entities/Animal';
import { animalRepository } from './AnimalRepository';

export default function AnimalDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [animal, setAnimal] = useState<Animal | null>(null);

  useEffect(() => {
    if (id) {
      animalRepository.findById(id).then(setAnimal);
    }
  }, [id]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Header
            title={animal ? `Brinco ${animal.brinco}` : 'Ficha do Animal'}
            subtitle="Consulta Individual • QR Code Offline"
            showBack
          />

          <ThemedView type="backgroundElement" style={styles.card}>
            {animal ? (
              <View style={styles.detailsCol}>
                <ThemedText type="subtitle">
                  {animal.nome || 'Animal sem nome'} ({animal.raca || 'Raça não informada'})
                </ThemedText>
                <Text style={styles.detailLine}>Peso: {animal.pesoKg ?? 0} kg</Text>
                <Text style={styles.detailLine}>
                  Produção de Leite: {animal.producaoLeiteL ?? 0} L/dia
                </Text>
                <Text style={styles.detailLine}>Crias: {animal.crias ?? 0}</Text>
                <Text style={styles.detailLine}>Ração: {animal.racaoKgDia ?? 0} kg/dia</Text>
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Animal não encontrado para o identificador informado ({id}).
              </ThemedText>
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
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  detailsCol: {
    gap: 8,
  },
  detailLine: {
    fontSize: 16,
    fontWeight: '600',
    color: '#112211',
  },
});
