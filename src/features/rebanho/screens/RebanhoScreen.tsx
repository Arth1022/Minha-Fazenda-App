import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  EmptyState,
  Header,
  ScreenContainer,
  SegmentedTabs,
  type SegmentedTabItem,
} from '@/components/ui';
import {
  AgroColors,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '@/constants/theme';
import type { Animal } from '@/database';
import { AnimalCard } from '../components/AnimalCard';
import { categoriaService, type CategoriaAnimal } from '../services/CategoriaService';
import { NovoAnimalForm } from '../components/NovoAnimalForm';
import { useAnimais } from '../hooks/useRebanho';

const TABS: SegmentedTabItem<CategoriaAnimal>[] = [
  { key: 'vaca', label: 'Vacas' },
  { key: 'novilha', label: 'Novilhas' },
  { key: 'bezerro', label: 'Bezerros' },
];

// Quantidade de cards visíveis na lista antes de precisar rolar
const VISIBLE_ANIMALS = 3;

// Filtro do funil: produção diária mínima para "alta produção"
const ALTA_PRODUCAO_LEITE_L = 20;

export default function RebanhoScreen() {
  const router = useRouter();
  const animais = useAnimais();

  const [activeTab, setActiveTab] = useState<CategoriaAnimal>('vaca');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlyHighMilkFilter, setOnlyHighMilkFilter] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = useCallback(() => setModalVisible(true), []);

  const filteredAnimais = useMemo(() => {
    let list = animais.filter(
      (a) => categoriaService.getCategoriaAnimal(a) === activeTab
    );
    if (onlyHighMilkFilter) {
      list = list.filter(
        (a) => (a.producaoLeiteL ?? 0) >= ALTA_PRODUCAO_LEITE_L
      );
    }
    return list;
  }, [animais, onlyHighMilkFilter, activeTab]);

  const selectedAnimal: Animal | null = useMemo(() => {
    if (filteredAnimais.length === 0) return null;
    if (selectedId) {
      const found = filteredAnimais.find((a) => a.id === selectedId);
      if (found) return found;
    }
    return filteredAnimais[0];
  }, [filteredAnimais, selectedId]);

  const handleAnimalPress = (animal: Animal) => {
    if (selectedAnimal?.id === animal.id) {
      router.push({ pathname: '/animal/[id]', params: { id: animal.id } });
    } else {
      setSelectedId(animal.id);
    }
  };

  const handleAnimalCreated = (animal: Animal) => {
    setActiveTab(categoriaService.getCategoriaAnimal(animal));
    setSelectedId(animal.id);
    setModalVisible(false);
  };

  return (
    <ScreenContainer
      header={
        <Header
          title="Gerenciamento Rebanho"
          showBack
          showMore
          onRightPress={openModal}
        />
      }>
      {/* Abas Vacas / Novilhas / Bezerros + Ícone de Filtro */}
      <SegmentedTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showFilter
        filterActive={onlyHighMilkFilter}
        onFilterPress={() => setOnlyHighMilkFilter((prev) => !prev)}
      />

      <Pressable
        onPress={openModal}
        style={({ pressed }) => [
          styles.newAnimalBtn,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button">
        <Text style={styles.newAnimalText}>NOVO ANIMAL</Text>
      </Pressable>

      {filteredAnimais.length === 0 ? (
        <EmptyState message="Nenhum animal nesta categoria." />
      ) : (
        // Lista de Animais: área limitada a VISIBLE_ANIMALS cards, com rolagem interna
        <ScrollView
          style={
            cardHeight > 0 && {
              maxHeight:
                cardHeight * VISIBLE_ANIMALS + Spacing.sm * (VISIBLE_ANIMALS - 1),
            }
          }
          contentContainerStyle={styles.listColumn}
          nestedScrollEnabled>
          {filteredAnimais.map((animal: Animal, index: number) => (
            <View
              key={animal.id}
              onLayout={
                index === 0
                  ? (e) => setCardHeight(e.nativeEvent.layout.height)
                  : undefined
              }>
              <AnimalCard
                animal={animal}
                selected={selectedAnimal?.id === animal.id}
                onPress={() => handleAnimalPress(animal)}
              />
            </View>
          ))}
        </ScrollView>
      )}

      {/* Card Inferior de Métricas Detalhadas do Animal Selecionado (Fiel à Tela 2 do Figma) */}
      {selectedAnimal && (
        <Card padding="three">
          <View style={styles.summaryList}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Peso</Text>
              <Text style={styles.summaryValue}>
                {selectedAnimal.pesoKg ?? 0} kg
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Produção de Leite</Text>
              <Text style={styles.summaryValueBlue}>
                {(selectedAnimal.producaoLeiteL ?? 0).toFixed(1)} L
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Crias</Text>
              <Text style={styles.summaryValue}>
                {selectedAnimal.crias ?? 0}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ração Concentrado</Text>
              <Text style={styles.summaryValue}>
                {selectedAnimal.racaoKgDia ?? 0} kg/dia
              </Text>
            </View>
          </View>
        </Card>
      )}

      <NovoAnimalForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={handleAnimalCreated}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listColumn: {
    gap: Spacing.sm,
  },
  summaryList: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: AgroColors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  summaryValueBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: AgroColors.waterBlue,
  },
  newAnimalBtn: {
    backgroundColor: AgroColors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  newAnimalText: {
    ...Typography.button,
    color: AgroColors.textInverse,
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
