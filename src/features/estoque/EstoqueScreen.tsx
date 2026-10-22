import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ChipSelector,
  type ChipOption,
  CustomInput,
  FormModal,
} from '@/components/forms';
import {
  Badge,
  Card,
  Header,
  ScreenContainer,
  SectionHeader,
  StatActionCard,
} from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import EstoqueItem, { CategoriaEstoque } from '@/entities/EstoqueItem';
import { useQuickAction } from '@/providers/QuickActionContext';
import { useEstoque } from './useEstoque';

const CATEGORIA_OPTIONS: ChipOption<CategoriaEstoque>[] = [
  { label: 'Insumo', value: 'insumo', icon: '🌾' },
  { label: 'Medicamento', value: 'medicamento', icon: '💉' },
  { label: 'Peça Máquina', value: 'peca_maquina', icon: '⚙️' },
];

function formatEstoqueValue(quantidade: number, unidade: string): string {
  if (unidade.toLowerCase() === 'kg' && quantidade >= 1000) {
    return `${(quantidade / 1000).toFixed(1)} Ton`;
  }
  return `${quantidade} ${unidade}`;
}

function getItemVisuals(nome: string, categoria: CategoriaEstoque) {
  const lower = nome.toLowerCase();
  if (lower.includes('ração') || lower.includes('racao')) {
    return { icon: '🌾', bg: '#FEF3C7' };
  }
  if (lower.includes('semente')) {
    return { icon: '🌱', bg: AgroColors.mintBg };
  }
  if (lower.includes('adubo') || lower.includes('fertilizante')) {
    return { icon: '🪴', bg: AgroColors.mintBg };
  }
  if (lower.includes('vacina')) {
    return { icon: '💉', bg: AgroColors.waterBlueBg };
  }
  if (lower.includes('antibiótico') || lower.includes('antibiotico')) {
    return { icon: '💊', bg: AgroColors.purpleMedBg };
  }
  if (categoria === 'medicamento') {
    return { icon: '💊', bg: AgroColors.waterBlueBg };
  }
  if (categoria === 'peca_maquina') {
    return { icon: '⚙️', bg: '#F3F4F6' };
  }
  return { icon: '📦', bg: AgroColors.mintBg };
}

/**
 * Tela 4 do Figma: "Estoque Fazenda"
 * Exibe as 3 seções (Insumos, Medicamentos, Peças Máquinas) com cartões em grade,
 * ícones semânticos e badge de alerta "⚠️ Estoque baixo".
 */
export default function EstoqueScreen() {
  const {
    insumos,
    medicamentos,
    pecas,
    ajustarQuantidade,
    criarItem,
  } = useEstoque();
  const { registerQuickAction } = useQuickAction();

  const [selectedItem, setSelectedItem] = useState<EstoqueItem | null>(null);

  // Estado do formulário modular para Novo Item de Estoque
  const [modalVisible, setModalVisible] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaEstoque>('insumo');
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('kg');
  const [estoqueMinimo, setEstoqueMinimo] = useState('10');
  const [errors, setErrors] = useState<{ nome?: string; quantidade?: string }>(
    {}
  );
  const [saving, setSaving] = useState(false);

  const openModalWithCategory = useCallback(
    (cat: CategoriaEstoque = 'insumo') => {
      setCategoria(cat);
      setUnidade(
        cat === 'medicamento'
          ? 'doses'
          : cat === 'peca_maquina'
          ? 'un'
          : 'kg'
      );
      setErrors({});
      setModalVisible(true);
    },
    []
  );

  useEffect(() => {
    return registerQuickAction('estoque', () =>
      openModalWithCategory('insumo')
    );
  }, [registerQuickAction, openModalWithCategory]);

  const handleSaveItem = async () => {
    const nextErrors: { nome?: string; quantidade?: string } = {};
    if (!nome.trim()) {
      nextErrors.nome = 'Informe o nome do item.';
    }
    const qtyNumber = parseFloat(quantidade.replace(',', '.'));
    if (!quantidade.trim() || isNaN(qtyNumber) || qtyNumber < 0) {
      nextErrors.quantidade = 'Informe uma quantidade válida.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await criarItem({
        categoria,
        nome: nome.trim(),
        quantidade: qtyNumber,
        unidade: unidade.trim() || 'un',
        estoqueMinimo: parseFloat(estoqueMinimo.replace(',', '.')) || 0,
      });

      setNome('');
      setQuantidade('');
      setErrors({});
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      header={<Header title="Estoque Fazenda" showBack />}>
      {/* Seção 1: Insumos */}
      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Insumos"
          showChevron
          onPress={() => openModalWithCategory('insumo')}
        />

        <View style={styles.cardsGridRow}>
          {insumos.map((item: EstoqueItem) => {
            const visuals = getItemVisuals(item.nome, item.categoria);
            const isSelected = selectedItem?.id === item.id;
            return (
              <StatActionCard
                key={item.id}
                align="center"
                icon={visuals.icon}
                iconBgColor={visuals.bg}
                title={item.nome}
                subtitle={formatEstoqueValue(item.quantidade, item.unidade)}
                active={isSelected}
                onPress={() =>
                  setSelectedItem(isSelected ? null : item)
                }
              />
            );
          })}
        </View>
      </View>

      {/* Seção 2: Medicamentos */}
      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Medicamentos"
          showChevron
          onPress={() => openModalWithCategory('medicamento')}
        />

        <View style={styles.cardsGridRow}>
          {medicamentos.map((item: EstoqueItem) => {
            const visuals = getItemVisuals(item.nome, item.categoria);
            const isSelected = selectedItem?.id === item.id;
            return (
              <StatActionCard
                key={item.id}
                align="center"
                icon={visuals.icon}
                iconBgColor={visuals.bg}
                title={item.nome}
                subtitle={formatEstoqueValue(item.quantidade, item.unidade)}
                active={isSelected}
                onPress={() =>
                  setSelectedItem(isSelected ? null : item)
                }
              />
            );
          })}
          {/* Espaçador invisível caso haja 2 cards para manter proporção */}
          {medicamentos.length === 2 && <View style={{ flex: 0.4 }} />}
        </View>
      </View>

      {/* Seção 3: Peças Máquinas */}
      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Peças Máquinas"
          showChevron
          onPress={() => openModalWithCategory('peca_maquina')}
        />

        <View style={styles.pecasColumn}>
          {pecas.map((item: EstoqueItem) => {
            const isLow = item.quantidade <= (item.estoqueMinimo || 0);
            const isSelected = selectedItem?.id === item.id;
            return (
              <Card
                key={item.id}
                variant={isSelected ? 'selected' : 'default'}
                padding="md"
                onPress={() =>
                  setSelectedItem(isSelected ? null : item)
                }>
                <View style={styles.pecaRow}>
                  <View style={styles.pecaLeft}>
                    <View style={styles.gearIconBox}>
                      <Text style={styles.gearIconText}>⚙️</Text>
                    </View>
                    <View style={styles.pecaInfoCol}>
                      <Text style={styles.pecaTitle}>{item.nome}</Text>
                      <Text style={styles.pecaSubtitle}>
                        Quantidade: {item.quantidade}
                      </Text>
                    </View>
                  </View>

                  {isLow ? (
                    <Badge
                      label="Estoque baixo"
                      icon="⚠️"
                      variant="warning"
                    />
                  ) : (
                    <Badge
                      label={`${item.quantidade} ${item.unidade}`}
                      variant="success"
                    />
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      </View>

      {/* Barra de Ajuste Rápido quando um item é selecionado */}
      {selectedItem && (
        <Card variant="mint" padding="md">
          <View style={styles.adjustRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.adjustTitle}>
                Ajustar saldo: {selectedItem.nome}
              </Text>
              <Text style={styles.adjustSubtitle}>
                Saldo atual: {selectedItem.quantidade} {selectedItem.unidade}
              </Text>
            </View>

            <View style={styles.adjustButtons}>
              <Pressable
                onPress={() =>
                  ajustarQuantidade(
                    selectedItem.id,
                    selectedItem.unidade === 'kg' &&
                      selectedItem.quantidade >= 100
                      ? -10
                      : -1
                  )
                }
                style={styles.qtyBtnOutline}>
                <Text style={styles.qtyBtnOutlineText}>
                  {selectedItem.unidade === 'kg' &&
                  selectedItem.quantidade >= 100
                    ? '-10'
                    : '-1'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  ajustarQuantidade(
                    selectedItem.id,
                    selectedItem.unidade === 'kg' &&
                      selectedItem.quantidade >= 100
                      ? 10
                      : 1
                  )
                }
                style={styles.qtyBtnPrimary}>
                <Text style={styles.qtyBtnPrimaryText}>
                  {selectedItem.unidade === 'kg' &&
                  selectedItem.quantidade >= 100
                    ? '+10'
                    : '+1'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>
      )}

      {/* Modal de Formulário Modular para Novo Item de Estoque */}
      <FormModal
        visible={modalVisible}
        title="Novo Item de Estoque"
        subtitle="Adicione insumos, medicamentos ou peças no banco local"
        onClose={() => setModalVisible(false)}
        onSubmit={handleSaveItem}
        submitLabel="Salvar no Estoque"
        loading={saving}>
        <ChipSelector
          label="Categoria"
          options={CATEGORIA_OPTIONS}
          value={categoria}
          onChange={(cat) => {
            setCategoria(cat);
            setUnidade(
              cat === 'medicamento'
                ? 'doses'
                : cat === 'peca_maquina'
                ? 'un'
                : 'kg'
            );
          }}
        />

        <CustomInput
          label="Nome do Item"
          required
          value={nome}
          onChangeText={(t) => {
            setNome(t);
            if (errors.nome)
              setErrors((prev) => ({ ...prev, nome: undefined }));
          }}
          placeholder="Ex: Ração, Sementes, Vacinas..."
          error={errors.nome}
        />

        <View style={styles.twoColRow}>
          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Quantidade Inicial"
            required
            value={quantidade}
            onChangeText={(t) => {
              setQuantidade(t);
              if (errors.quantidade)
                setErrors((prev) => ({ ...prev, quantidade: undefined }));
            }}
            placeholder="100"
            keyboardType="numeric"
            error={errors.quantidade}
          />

          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Unidade"
            value={unidade}
            onChangeText={setUnidade}
            placeholder="kg, sacas, doses, un"
          />
        </View>

        <CustomInput
          label="Alerta de Estoque Mínimo"
          value={estoqueMinimo}
          onChangeText={setEstoqueMinimo}
          placeholder="10"
          keyboardType="numeric"
          suffix={unidade}
          helperText="Exibe o alerta 'Estoque baixo' quando atingir este limite."
        />
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    gap: Spacing.sm,
  },
  cardsGridRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pecasColumn: {
    gap: Spacing.sm,
  },
  pecaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  pecaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  gearIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIconText: {
    fontSize: 18,
  },
  pecaInfoCol: {
    gap: 2,
    flex: 1,
  },
  pecaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  pecaSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: AgroColors.textMuted,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  adjustTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AgroColors.primaryDark,
  },
  adjustSubtitle: {
    fontSize: 11,
    color: AgroColors.textSecondary,
    marginTop: 2,
  },
  adjustButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  qtyBtnOutline: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
  },
  qtyBtnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  qtyBtnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.xs,
    backgroundColor: AgroColors.primary,
  },
  qtyBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textInverse,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
