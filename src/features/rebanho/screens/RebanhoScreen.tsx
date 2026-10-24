import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
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
import { NovoAnimalForm } from '../components/NovoAnimalForm';
import { ResumoAnimalCard } from '../components/ResumoAnimalCard';
import { useRebanho, type AnimalComFase } from '../hooks/useRebanho';
import { calcularFase, type Fase } from '../services/fase';

type Grupo = 'vacas' | 'novilhas' | 'bezerros' | 'machos';

const TABS: SegmentedTabItem<Grupo>[] = [
  { key: 'vacas', label: 'Vacas' },
  { key: 'novilhas', label: 'Novilhas' },
  { key: 'bezerros', label: 'Bezerros' },
];

const TAB_MACHOS: SegmentedTabItem<Grupo> = { key: 'machos', label: 'Machos' };

const GRUPO_DA_FASE: Record<Fase, Grupo> = {
  vaca: 'vacas',
  novilha: 'novilhas',
  bezerra: 'bezerros',
  bezerro: 'bezerros',
  garrote: 'machos',
  touro: 'machos',
};

// Quantidade de cards visíveis na lista antes de precisar rolar
const VISIBLE_ANIMALS = 3;

// Filtro do funil: produção diária mínima para "alta produção"
const ALTA_PRODUCAO_LEITE_L = 20;

export default function RebanhoScreen() {
  const router = useRouter();
  const rebanho = useRebanho();

  const [activeTab, setActiveTab] = useState<Grupo>('vacas');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlyHighMilkFilter, setOnlyHighMilkFilter] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = useCallback(() => setModalVisible(true), []);

  // A aba "Machos" só aparece quando há garrote ou touro no rebanho
  const tabs = useMemo(
    () =>
      rebanho.some((animal) => GRUPO_DA_FASE[animal.fase] === 'machos')
        ? [...TABS, TAB_MACHOS]
        : TABS,
    [rebanho]
  );

  const filteredAnimais = useMemo(() => {
    const doGrupo = rebanho.filter(
      (animal) => GRUPO_DA_FASE[animal.fase] === activeTab
    );
    if (!onlyHighMilkFilter) return doGrupo;
    return doGrupo.filter(
      (animal) => (animal.producaoLeiteL ?? 0) >= ALTA_PRODUCAO_LEITE_L
    );
  }, [rebanho, onlyHighMilkFilter, activeTab]);

  const selectedAnimal: AnimalComFase | null =
    filteredAnimais.find((animal) => animal.id === selectedId) ??
    filteredAnimais[0] ??
    null;

  // 1º toque seleciona o animal; 2º toque no selecionado abre a ficha
  const handleAnimalPress = (animal: Animal) => {
    if (selectedAnimal?.id === animal.id) {
      router.push({ pathname: '/animal/[id]', params: { id: animal.id } });
    } else {
      setSelectedId(animal.id);
    }
  };

  const handleAnimalCreated = (animal: Animal) => {
    const fase = calcularFase({
      sexo: animal.sexo,
      dataNascimento: animal.dataNascimento,
      ultimoParto: null,
      jaPariu: animal.jaPariu,
    });
    setActiveTab(GRUPO_DA_FASE[fase]);
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
      <SegmentedTabs
        tabs={tabs}
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
          {filteredAnimais.map((animal, index) => (
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

      {selectedAnimal && <ResumoAnimalCard animal={selectedAnimal} />}

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
