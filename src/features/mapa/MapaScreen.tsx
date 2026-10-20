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
import { APP_NAME } from '@/constants/app';
import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';
import Talhao, { TipoTalhao } from '@/entities/Talhao';
import { useQuickAction } from '@/providers/QuickActionContext';
import { formatHectares } from '@/utils/formatters';
import {
  calculateFenceMaterials,
  calculatePerimeterFromTalhao,
  calculateSeedRequirementKg,
} from './calculos';
import { TalhaoCard } from './TalhaoCard';
import { useTalhoes } from './useTalhoes';

type ActiveTool = 'area' | 'cercas' | 'sementes' | null;

const TIPO_TALHAO_OPTIONS: ChipOption<TipoTalhao>[] = [
  { label: 'Pastagem', value: 'pastagem', icon: '🌿' },
  { label: 'Lavoura', value: 'lavoura', icon: '🌾' },
  { label: 'Reserva', value: 'reserva', icon: '🌳' },
  { label: 'Outro', value: 'outro', icon: '📍' },
];

export default function MapaScreen() {
  const { talhoes, createTalhao } = useTalhoes();
  const { registerQuickAction } = useQuickAction();

  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Estado do formulário modular com validação
  const [novoNome, setNovoNome] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoTalhao>('pastagem');
  const [novaAreaHa, setNovaAreaHa] = useState('');
  const [errors, setErrors] = useState<{ nome?: string; area?: string }>({});
  const [saving, setSaving] = useState(false);

  const openModal = useCallback(() => {
    setErrors({});
    setModalVisible(true);
  }, []);

  useEffect(() => {
    const unsubIndex = registerQuickAction('index', openModal);
    const unsubMapa = registerQuickAction('mapa', openModal);
    return () => {
      unsubIndex();
      unsubMapa();
    };
  }, [registerQuickAction, openModal]);

  const pastoPrincipal = talhoes.find((t) => t.tipo === 'pastagem') ?? talhoes[0];
  const lavouraPrincipal = talhoes.find((t) => t.tipo === 'lavoura') ?? talhoes[1];

  const totalAreaHa = talhoes.reduce(
    (acc: number, t: Talhao) => acc + (t.areaHa || 0),
    0
  );
  const displayMainAreaHa = pastoPrincipal?.areaHa ?? (totalAreaHa || 15.2);

  const totalPerimeterM = talhoes.reduce(
    (acc: number, t: Talhao) =>
      acc + calculatePerimeterFromTalhao(t.areaHa, t.poligonoGeoJson),
    0
  );
  const perimeterKm =
    totalPerimeterM > 0 ? (totalPerimeterM / 1000).toFixed(1) : '1.4';
  const fenceEstimate = calculateFenceMaterials(totalPerimeterM || 1400, 2.5, 5);
  const totalSeedKg =
    totalAreaHa > 0 ? calculateSeedRequirementKg(totalAreaHa, 20) : 420;

  const handleAddTalhao = async () => {
    const nextErrors: { nome?: string; area?: string } = {};
    if (!novoNome.trim()) {
      nextErrors.nome = 'Informe o nome do talhão.';
    }
    const areaNumber = parseFloat(novaAreaHa.replace(',', '.'));
    if (!novaAreaHa.trim() || isNaN(areaNumber) || areaNumber <= 0) {
      nextErrors.area = 'Informe uma área válida em hectares (ex: 15.2).';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await createTalhao({
        nome: novoNome.trim(),
        tipo: novoTipo,
        areaHa: areaNumber,
        possuiCerca: true,
      });

      setNovoNome('');
      setNovoTipo('pastagem');
      setNovaAreaHa('');
      setErrors({});
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      header={
        <Header
          title={APP_NAME}
          showMenu
          showNotification
        />
      }>
      <SectionHeader title="Mapeamento & Áreas" size="lg" />

      {/* Mapa Satélite / Polígonos de Talhões (Fiel ao Figma) */}
      <View style={styles.mapCard}>
        {/* Fundo estilizado de terreno satélite */}
        <View style={styles.terrainBandTop} />
        <View style={styles.terrainBandBottom} />

        {/* Barra de topo sobreposta no mapa */}
        <View style={styles.mapOverlayTop}>
          <Badge
            label="Fazenda Recanto Verde"
            variant="overlayLight"
          />

          <View style={styles.mapControlsCol}>
            <Pressable
              onPress={openModal}
              style={({ pressed }) => [
                styles.mapControlBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Camadas do mapa">
              <Text style={styles.mapControlIcon}>❖</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setActiveTool((prev) => (prev === 'area' ? null : 'area'))
              }
              style={({ pressed }) => [
                styles.mapControlBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Centralizar GPS">
              <Text style={styles.mapControlIcon}>⊕</Text>
            </Pressable>
          </View>
        </View>

        {/* Área central dos polígonos */}
        <View style={styles.polygonsStage}>
          <View style={styles.polygonsTopRow}>
            <View style={[styles.polygonShape, styles.polygonPasto1]}>
              <Text style={styles.polygonText}>
                {pastoPrincipal?.nome ?? 'Pasto 1'}
              </Text>
            </View>

            <View style={[styles.polygonShape, styles.polygonLavoura2]}>
              <Text style={styles.polygonText}>
                {lavouraPrincipal?.nome ?? 'Lavoura 2'}
              </Text>
            </View>
          </View>

          <View style={[styles.polygonShape, styles.polygonPastoDashed]}>
            <Text style={styles.polygonText}>Pasto</Text>
          </View>
        </View>

        {/* Rodapé do Mapa: Google + Escala 50 m */}
        <View style={styles.mapOverlayBottom}>
          <Text style={styles.googleWatermark}>Google</Text>
          <View style={styles.scalePill}>
            <Text style={styles.scaleText}>50 m</Text>
          </View>
        </View>
      </View>

      {/* Card de Lista Resumida de Talhões (● Pasto 1: 15.2 Ha / ● Lavoura 2: 28 Ha) */}
      <Card padding="md">
        {talhoes.length === 0 ? (
          <>
            <TalhaoCard
              talhao={{ nome: 'Pasto 1', tipo: 'pastagem', areaHa: 15.2 } as Talhao}
              showDivider
            />
            <TalhaoCard
              talhao={{ nome: 'Lavoura 2', tipo: 'lavoura', areaHa: 28 } as Talhao}
            />
          </>
        ) : (
          talhoes.map((talhao: Talhao, idx: number) => (
            <TalhaoCard
              key={talhao.id}
              talhao={talhao}
              showDivider={idx < talhoes.length - 1}
            />
          ))
        )}
      </Card>

      {/* Linha de 3 Cartões de Ação / Cálculo Rápido (Calcular Área | Cercas | Kg Sementes) */}
      <View style={styles.quickCardsRow}>
        <StatActionCard
          icon={<View style={styles.areaDashedIcon} />}
          title="Calcular Área"
          subtitle={`${formatHectares(displayMainAreaHa)} Total`}
          active={activeTool === 'area'}
          onPress={() =>
            setActiveTool((prev) => (prev === 'area' ? null : 'area'))
          }
        />

        <StatActionCard
          icon={<Text style={styles.greenIconText}>#</Text>}
          title="Cercas"
          subtitle={`${perimeterKm} km estacas`}
          active={activeTool === 'cercas'}
          onPress={() =>
            setActiveTool((prev) => (prev === 'cercas' ? null : 'cercas'))
          }
        />

        <StatActionCard
          icon={<Text style={styles.greenIconText}>🌱</Text>}
          title="Kg Sementes"
          subtitle={`${totalSeedKg} kg necessário`}
          active={activeTool === 'sementes'}
          onPress={() =>
            setActiveTool((prev) => (prev === 'sementes' ? null : 'sementes'))
          }
        />
      </View>

      {/* Card expansível quando uma ferramenta é selecionada */}
      {activeTool !== null && (
        <Card variant="mint" padding="md">
          {activeTool === 'area' && (
            <View style={styles.toolDetailBox}>
              <Text style={styles.toolDetailTitle}>
                Resumo de Área Total ({talhoes.length} talhões)
              </Text>
              <Text style={styles.toolDetailSub}>
                Soma total mapeada: {formatHectares(totalAreaHa)} (
                {Math.round(totalAreaHa * 10000).toLocaleString()} m²)
              </Text>
            </View>
          )}

          {activeTool === 'cercas' && (
            <View style={styles.toolDetailBox}>
              <Text style={styles.toolDetailTitle}>
                Estimativa de Cercas ({perimeterKm} km)
              </Text>
              <Text style={styles.toolDetailSub}>
                {fenceEstimate.postsNeeded} mourões (a cada 2.5m) •{' '}
                {fenceEstimate.wireRolls500m} rolos de arame (5 fios)
              </Text>
            </View>
          )}

          {activeTool === 'sementes' && (
            <View style={styles.toolDetailBox}>
              <Text style={styles.toolDetailTitle}>
                Planejamento de Sementes (20 kg/Ha)
              </Text>
              <Text style={styles.toolDetailSub}>
                Total estimado: {totalSeedKg} kg (
                {Math.ceil(totalSeedKg / 20)} sacas de 20 kg)
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Modal de Formulário Modular para Novo Talhão */}
      <FormModal
        visible={modalVisible}
        title="Novo Talhão"
        subtitle="Cadastre uma nova área ou piquete na propriedade"
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddTalhao}
        submitLabel="Salvar Talhão"
        loading={saving}>
        <CustomInput
          label="Nome do Talhão"
          required
          value={novoNome}
          onChangeText={(text) => {
            setNovoNome(text);
            if (errors.nome) setErrors((prev) => ({ ...prev, nome: undefined }));
          }}
          placeholder="Ex: Pasto 1 ou Lavoura 2"
          error={errors.nome}
        />

        <ChipSelector
          label="Tipo de Uso da Área"
          options={TIPO_TALHAO_OPTIONS}
          value={novoTipo}
          onChange={setNovoTipo}
        />

        <CustomInput
          label="Área Mapeada"
          required
          value={novaAreaHa}
          onChangeText={(text) => {
            setNovaAreaHa(text);
            if (errors.area) setErrors((prev) => ({ ...prev, area: undefined }));
          }}
          placeholder="Ex: 15.2"
          keyboardType="numeric"
          suffix="Ha"
          error={errors.area}
          helperText="O cálculo de cercas e sementes será atualizado automaticamente."
        />
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    width: '100%',
    height: 190,
    backgroundColor: AgroColors.mapTerrainBg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    position: 'relative',
    ...Shadows.sm,
  },
  terrainBandTop: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 220,
    height: 110,
    borderRadius: 60,
    backgroundColor: 'rgba(110, 145, 85, 0.35)',
    transform: [{ rotate: '-12deg' }],
  },
  terrainBandBottom: {
    position: 'absolute',
    bottom: -35,
    left: -20,
    width: 260,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(55, 82, 46, 0.45)',
    transform: [{ rotate: '8deg' }],
  },
  mapOverlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  mapControlsCol: {
    gap: 6,
  },
  mapControlBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  mapControlIcon: {
    fontSize: 14,
    color: AgroColors.textPrimary,
    fontWeight: '700',
  },
  polygonsStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.xs,
    marginTop: -6,
  },
  polygonsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.sm,
  },
  polygonShape: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  polygonPasto1: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(59, 150, 68, 0.82)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    transform: [{ skewX: '-8deg' }],
  },
  polygonLavoura2: {
    flex: 1.05,
    height: 52,
    backgroundColor: 'rgba(168, 134, 62, 0.82)',
    borderWidth: 1.5,
    borderColor: '#FEF9C3',
    transform: [{ skewX: '6deg' }],
  },
  polygonPastoDashed: {
    width: '62%',
    height: 42,
    backgroundColor: 'rgba(59, 150, 68, 0.78)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#FFFFFF',
    transform: [{ skewX: '-6deg' }],
  },
  polygonText: {
    color: AgroColors.textInverse,
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mapOverlayBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  googleWatermark: {
    color: AgroColors.textInverse,
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.9,
  },
  scalePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scaleText: {
    fontSize: 10,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  areaDashedIcon: {
    width: 16,
    height: 16,
    borderWidth: 1.8,
    borderStyle: 'dashed',
    borderColor: AgroColors.primary,
    borderRadius: 3,
  },
  greenIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: AgroColors.primary,
  },
  toolDetailBox: {
    gap: 2,
  },
  toolDetailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AgroColors.primaryDark,
  },
  toolDetailSub: {
    fontSize: 12,
    color: AgroColors.textSecondary,
  },
});
