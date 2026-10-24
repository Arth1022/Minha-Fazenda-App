import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import { useRebanho } from '../hooks/useRebanho';
import { calcularFase, type Fase } from '../services/fase';

type Grupo = 'vacas' | 'novilhas' | 'bezerros' | 'machos';

const TABS: SegmentedTabItem<Grupo>[] = [
  { key: 'vacas', label: 'Vacas' },
  { key: 'novilhas', label: 'Novilhas' },
  { key: 'bezerros', label: 'Bezerros' },
  { key: 'machos', label: 'Machos' },
];

const GRUPO_DA_FASE: Record<Fase, Grupo> = {
  vaca: 'vacas',
  novilha: 'novilhas',
  bezerra: 'bezerros',
  bezerro: 'bezerros',
  garrote: 'machos',
  touro: 'machos',
};

export default function RebanhoScreen() {
  const router = useRouter();
  const rebanho = useRebanho();

  const [activeTab, setActiveTab] = useState<Grupo>('vacas');
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = useCallback(() => setModalVisible(true), []);

  const animaisDoGrupo = useMemo(
    () => rebanho.filter((animal) => GRUPO_DA_FASE[animal.fase] === activeTab),
    [rebanho, activeTab]
  );

  const abrirFicha = (animal: Animal) =>
    router.push({ pathname: '/animal/[id]', params: { id: animal.id } });

  const handleAnimalCreated = (animal: Animal) => {
    const fase = calcularFase({
      sexo: animal.sexo,
      dataNascimento: animal.dataNascimento,
      ultimoParto: null,
    });
    setActiveTab(GRUPO_DA_FASE[fase]);
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
      <SegmentedTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <Pressable
        onPress={openModal}
        style={({ pressed }) => [
          styles.newAnimalBtn,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button">
        <Text style={styles.newAnimalText}>NOVO ANIMAL</Text>
      </Pressable>

      {animaisDoGrupo.length === 0 ? (
        <EmptyState message="Nenhum animal nesta categoria." />
      ) : (
        <View style={styles.listColumn}>
          {animaisDoGrupo.map((animal) => (
            <AnimalCard
              key={animal.id}
              animal={animal}
              fase={animal.fase}
              alerta={animal.alerta}
              onPress={() => abrirFicha(animal)}
            />
          ))}
        </View>
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
