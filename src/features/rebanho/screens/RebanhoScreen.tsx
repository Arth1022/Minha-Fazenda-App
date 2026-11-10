import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import {
  EmptyState,
  Header,
  ScreenContainer,
  ScrollHintList,
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
import type { Animal, AnimalComFase, Fase } from '@/dtos';
import { AnimalCard } from '../components/AnimalCard';
import { BuscarAnimalModal } from '../components/BuscarAnimalModal';
import { LotesCard } from '../components/lotes/LotesCard';
import { NovoAnimalForm } from '../components/NovoAnimalForm';
import { ResumoAnimalCard } from '../components/ResumoAnimalCard';
import { useRebanho } from '../hooks/useRebanho';
import { calcularFase } from '../services/fase';

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
const VISIBLE_ANIMALS = 4;

// Filtro do funil: produção diária mínima para "alta produção"
const ALTA_PRODUCAO_LEITE_L = 20;

const isAltaProducao = (animal: Animal) =>
  (animal.producaoLeiteL ?? 0) >= ALTA_PRODUCAO_LEITE_L;

export default function RebanhoScreen() {
  const router = useRouter();
  const rebanho = useRebanho();

  const [activeTab, setActiveTab] = useState<Grupo>('vacas');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlyHighMilkFilter, setOnlyHighMilkFilter] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

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
    return onlyHighMilkFilter ? doGrupo.filter(isAltaProducao) : doGrupo;
  }, [rebanho, onlyHighMilkFilter, activeTab]);

  const selectedAnimal: AnimalComFase | null =
    filteredAnimais.find((animal) => animal.id === selectedId) ??
    filteredAnimais[0] ??
    null;

  // Um toque abre a ficha; o resumo abaixo da lista fica com o último aberto
  const handleAnimalPress = (animal: Animal) => {
    setSelectedId(animal.id);
    router.push({ pathname: '/animal/[id]', params: { id: animal.id } });
  };

  // Achado na busca: a lista vai para a aba dele (sem o filtro que o esconderia)
  // para o resumo mostrar o animal aberto ao voltar da ficha
  const handleSearchSelect = (animal: AnimalComFase) => {
    setSearchVisible(false);
    setActiveTab(GRUPO_DA_FASE[animal.fase]);
    if (!isAltaProducao(animal)) setOnlyHighMilkFilter(false);
    handleAnimalPress(animal);
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
        showSearch
        onSearchPress={() => setSearchVisible(true)}
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
        // Lista de Animais: VISIBLE_ANIMALS cards à vista, rolagem interna e a seta
        // indicando que há mais. A key volta a lista ao topo ao trocar de aba ou filtro
        <ScrollHintList
          key={`${activeTab}-${onlyHighMilkFilter}`}
          data={filteredAnimais}
          keyExtractor={(animal) => animal.id}
          visibleCount={VISIBLE_ANIMALS}
          renderItem={(animal) => (
            <AnimalCard animal={animal} onPress={() => handleAnimalPress(animal)} />
          )}
        />
      )}

      {selectedAnimal && <ResumoAnimalCard animal={selectedAnimal} />}

      <LotesCard />

      <NovoAnimalForm
        visible={modalVisible}
        animais={rebanho}
        onClose={() => setModalVisible(false)}
        onSaved={handleAnimalCreated}
      />

      <BuscarAnimalModal
        visible={searchVisible}
        animais={rebanho}
        onClose={() => setSearchVisible(false)}
        onSelect={handleSearchSelect}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
