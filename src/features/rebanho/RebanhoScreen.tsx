import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RelativePathString, useRouter } from 'expo-router';

import {
  ChipSelector,
  type ChipOption,
  CustomInput,
  FormModal,
} from '@/components/forms';
import {
  Card,
  Header,
  ScreenContainer,
  SegmentedTabs,
  type SegmentedTabItem,
} from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';
import Animal from '@/entities/Animal';
import { useQuickAction } from '@/providers/QuickActionContext';
import { AnimalCard } from './AnimalCard';
import { useRebanho } from './useRebanho';

type RebanhoTabKey = 'rebanho' | 'pasto';

const TABS: SegmentedTabItem<RebanhoTabKey>[] = [
  { key: 'rebanho', label: 'Rebanho' },
  { key: 'pasto', label: 'Pasto' },
];

const RACA_OPTIONS: ChipOption<string>[] = [
  { label: 'Holandesa', value: 'Holandesa', icon: '🐄' },
  { label: 'Nelore', value: 'Nelore', icon: '🐂' },
  { label: 'Girolando', value: 'Girolando', icon: '🐮' },
  { label: 'Jersey', value: 'Jersey', icon: '🥛' },
];

export default function RebanhoScreen() {
  const router = useRouter();
  const { animais, createAnimal } = useRebanho();
  const { registerQuickAction } = useQuickAction();

  const [activeTab, setActiveTab] = useState<RebanhoTabKey>('rebanho');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlyHighMilkFilter, setOnlyHighMilkFilter] = useState(false);

  // Estado do formulário modular para Novo Animal
  const [modalVisible, setModalVisible] = useState(false);
  const [brinco, setBrinco] = useState('');
  const [nome, setNome] = useState('');
  const [raca, setRaca] = useState('Holandesa');
  const [pesoKg, setPesoKg] = useState('');
  const [producaoLeiteL, setProducaoLeiteL] = useState('');
  const [crias, setCrias] = useState('1');
  const [racaoKgDia, setRacaoKgDia] = useState('6.5');
  const [errors, setErrors] = useState<{ brinco?: string; peso?: string }>({});
  const [saving, setSaving] = useState(false);

  const openModal = useCallback(() => {
    setErrors({});
    setModalVisible(true);
  }, []);

  useEffect(() => {
    return registerQuickAction('rebanho', openModal);
  }, [registerQuickAction, openModal]);

  const filteredAnimais = useMemo(() => {
    let list = animais;
    if (onlyHighMilkFilter) {
      list = list.filter((a) => (a.producaoLeiteL ?? 0) >= 20);
    }
    if (activeTab === 'pasto') {
      list = list.filter((a) => Boolean(a.talhaoId) || true);
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
      router.push(`/animal/${animal.id}` as RelativePathString);
    } else {
      setSelectedId(animal.id);
    }
  };

  const handleAddAnimal = async () => {
    const nextErrors: { brinco?: string; peso?: string } = {};
    if (!brinco.trim()) {
      nextErrors.brinco = 'Informe o número do brinco (ex: #104).';
    }
    const pesoNumber = parseFloat(pesoKg.replace(',', '.'));
    if (!pesoKg.trim() || isNaN(pesoNumber) || pesoNumber <= 0) {
      nextErrors.peso = 'Informe um peso válido em kg.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const formattedBrinco = brinco.trim().startsWith('#')
        ? brinco.trim()
        : `#${brinco.trim()}`;

      const created = await createAnimal({
        brinco: formattedBrinco,
        nome: nome.trim() || `Brinco ${formattedBrinco}`,
        raca,
        pesoKg: pesoNumber,
        producaoLeiteL: parseFloat(producaoLeiteL.replace(',', '.')) || 0,
        crias: parseInt(crias, 10) || 0,
        racaoKgDia: parseFloat(racaoKgDia.replace(',', '.')) || 0,
      });

      setSelectedId(created.id);
      setBrinco('');
      setNome('');
      setPesoKg('');
      setProducaoLeiteL('');
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
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
      {/* Abas Rebanho / Pasto + Ícone de Filtro (Fiel ao Figma) */}
      <SegmentedTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showFilter
        filterActive={onlyHighMilkFilter}
        onFilterPress={() => setOnlyHighMilkFilter((prev) => !prev)}
      />

      {/* Lista de Animais */}
      <View style={styles.listColumn}>
        {filteredAnimais.map((animal: Animal) => (
          <AnimalCard
            key={animal.id}
            animal={animal}
            selected={selectedAnimal?.id === animal.id}
            onPress={() => handleAnimalPress(animal)}
          />
        ))}
      </View>

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

          <Pressable
            onPress={() =>
              router.push(`/animal/${selectedAnimal.id}` as RelativePathString)
            }
            style={({ pressed }) => [
              styles.treatmentLinkRow,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.treatmentLinkText}>
              Abrir Tratamento Animal ({selectedAnimal.brinco}) →
            </Text>
          </Pressable>
        </Card>
      )}

      {/* Modal de Formulário Modular para Cadastro de Animal */}
      <FormModal
        visible={modalVisible}
        title="Novo Animal"
        subtitle="Cadastre um novo animal no rebanho local"
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddAnimal}
        submitLabel="Salvar Animal"
        loading={saving}>
        <CustomInput
          label="Identificação (Brinco)"
          required
          value={brinco}
          onChangeText={(t) => {
            setBrinco(t);
            if (errors.brinco)
              setErrors((prev) => ({ ...prev, brinco: undefined }));
          }}
          placeholder="Ex: #104"
          error={errors.brinco}
        />

        <CustomInput
          label="Nome do Animal (Opcional)"
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Mimosa"
        />

        <ChipSelector
          label="Raça"
          options={RACA_OPTIONS}
          value={raca}
          onChange={setRaca}
        />

        <View style={styles.twoColInputs}>
          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Peso"
            required
            value={pesoKg}
            onChangeText={(t) => {
              setPesoKg(t);
              if (errors.peso)
                setErrors((prev) => ({ ...prev, peso: undefined }));
            }}
            placeholder="512"
            keyboardType="numeric"
            suffix="kg"
            error={errors.peso}
          />

          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Produção de Leite"
            value={producaoLeiteL}
            onChangeText={setProducaoLeiteL}
            placeholder="22.1"
            keyboardType="numeric"
            suffix="L"
          />
        </View>

        <View style={styles.twoColInputs}>
          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Crias"
            value={crias}
            onChangeText={setCrias}
            placeholder="3"
            keyboardType="numeric"
          />

          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Ração Concentrado"
            value={racaoKgDia}
            onChangeText={setRacaoKgDia}
            placeholder="6.5"
            keyboardType="numeric"
            suffix="kg/dia"
          />
        </View>
      </FormModal>
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
  treatmentLinkRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AgroColors.divider,
    alignItems: 'flex-end',
  },
  treatmentLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  twoColInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
