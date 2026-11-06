import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import Mapbox from '@rnmapbox/maps';

import { ChipSelector, CustomInput, FormModal, type ChipOption } from '@/components/forms';
import {
  AppIcon,
  EmptyState,
  Header,
  ScreenContainer,
  SectionHeader,
  StatActionCard,
} from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { AgroColors, IconSize, Radius, Shadows, Spacing } from '@/constants/theme';
import { useLiveQuery, type Talhao, type TipoTalhao } from '@/database';
import { criarTalhao, deletarTalhao, listarTalhoesAtivos } from '@/services/talhaoService';
import { calcularPerimetroKm, type Coordenada } from '@/utils/geoMath';
import { BarraControlesDesenho, CamadaDesenho } from '../components/CamadaDesenho';
import { MapaBase } from '../components/MapaBase';
import { ModalCalculadoraCercas } from '../components/ModalCalculadoraCercas';
import { ModalCalculadoraSementes } from '../components/ModalCalculadoraSementes';
import { useDesenhoTalhao, type ResultadoDesenhoTalhao } from '../hooks/useDesenhoTalhao';

const OPCOES_TIPO_TALHAO: ChipOption<TipoTalhao>[] = [
  { label: 'Pasto', value: 'pasto' },
  { label: 'Lavoura', value: 'lavoura' },
  { label: 'Reserva', value: 'reserva' },
  { label: 'Outro', value: 'outro' },
];

const COR_PADRAO_POR_TIPO: Record<TipoTalhao, string> = {
  pasto: '#22C55E',
  lavoura: '#EAB308',
  reserva: '#166534',
  outro: '#0EA5E9',
};

const PALETA_CORES = ['#22C55E', '#EAB308', '#166534', '#0EA5E9', '#F97316', '#A16207'];

const CalcularAreaIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="14" rx="2" stroke={AgroColors.primary} strokeWidth={2} strokeDasharray="3 3" />
    <Path d="M8 14L12 10L16 14" stroke={AgroColors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CercasIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Line x1="8" y1="3" x2="8" y2="21" stroke={AgroColors.primary} strokeWidth={2} strokeLinecap="round" />
    <Line x1="16" y1="3" x2="16" y2="21" stroke={AgroColors.primary} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="8" x2="21" y2="8" stroke={AgroColors.primary} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="16" x2="21" y2="16" stroke={AgroColors.primary} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SementesIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M7 7C7 5.34315 8.34315 4 10 4H14C15.6569 4 17 5.34315 17 7L19 18C19 19.6569 17.6569 21 16 21H8C6.34315 21 5 19.6569 5 18L7 7Z" stroke={AgroColors.primary} strokeWidth={2} strokeLinejoin="round" />
    <Circle cx="12" cy="14" r="2" fill={AgroColors.primary} />
  </Svg>
);

const CamadaTalhoesSalvos = memo(function CamadaTalhoesSalvos({
  talhoes,
  selecionadoId,
  onPressTalhao,
}: {
  talhoes: Talhao[];
  selecionadoId: string | null;
  onPressTalhao?: (talhaoId: string) => void;
}) {
  const shapeCollection = useMemo(
    (): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: talhoes.flatMap((t): GeoJSON.Feature[] => [
        {
          type: 'Feature',
          id: `poly-${t.id}`,
          properties: { camada: 'poligono', talhaoId: t.id, cor: t.cor, nome: t.nome },
          geometry: t.geometriaJson,
        },
        {
          type: 'Feature',
          id: `label-${t.id}`,
          properties: { camada: 'label', talhaoId: t.id, nome: t.nome },
          geometry: { type: 'Point', coordinates: [t.centroLng, t.centroLat] },
        },
      ]),
    }),
    [talhoes],
  );

  const idAtivo = selecionadoId ?? '';

  return (
    <Mapbox.ShapeSource
      id="talhoes-salvos-source"
      shape={shapeCollection}
      onPress={(e) => {
        const idClicado = e.features?.[0]?.properties?.talhaoId;
        if (typeof idClicado === 'string') onPressTalhao?.(idClicado);
      }}>
      <Mapbox.FillLayer
        id="talhoes-salvos-fill-layer"
        filter={['==', ['get', 'camada'], 'poligono']}
        style={{
          fillColor: ['get', 'cor'],
          fillOpacity: ['case', ['==', ['get', 'talhaoId'], idAtivo], 0.72, 0.48],
        }}
      />
      <Mapbox.LineLayer
        id="talhoes-salvos-border-layer"
        filter={['==', ['get', 'camada'], 'poligono']}
        style={{
          lineColor: '#FFFFFF',
          lineWidth: ['case', ['==', ['get', 'talhaoId'], idAtivo], 3.5, 2],
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <Mapbox.SymbolLayer
        id="talhoes-salvos-label-layer"
        filter={['==', ['get', 'camada'], 'label']}
        style={{
          textField: ['get', 'nome'],
          textSize: 12,
          textColor: '#FFFFFF',
          textHaloColor: 'rgba(17, 24, 39, 0.85)',
          textHaloWidth: 1.5,
          textAllowOverlap: true,
        }}
      />
    </Mapbox.ShapeSource>
  );
});

export default function MapeamentoScreen() {
  const { data: talhoesSalvos } = useLiveQuery(listarTalhoesAtivos());

  const [talhaoSelecionadoId, setTalhaoSelecionadoId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<ResultadoDesenhoTalhao | null>(null);
  const [modalCalculadora, setModalCalculadora] = useState<'cercas' | 'sementes' | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoTalhao>('pasto');
  const [cor, setCor] = useState<string>(COR_PADRAO_POR_TIPO.pasto);
  const [erroNome, setErroNome] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);
  const [coordenadaFoco, setCoordenadaFoco] = useState<Coordenada | null>(null);

  const abrirModalCadastro = useCallback((resultado: ResultadoDesenhoTalhao) => {
    setRascunho(resultado);
    setNome('');
    setTipo('pasto');
    setCor(COR_PADRAO_POR_TIPO.pasto);
    setErroNome(undefined);
  }, []);

  const {
    pontos,
    modoDesenho,
    areaAtualHa,
    erroTopologico,
    podeConcluir,
    alternarModo,
    adicionarPonto,
    desfazerPonto,
    limpar,
    concluir,
  } = useDesenhoTalhao({ onConcluir: abrirModalCadastro });

  const talhaoSelecionado = useMemo(
    () => (modoDesenho ? null : (talhoesSalvos.find((t) => t.id === talhaoSelecionadoId) ?? null)),
    [modoDesenho, talhoesSalvos, talhaoSelecionadoId],
  );

  const handleSelecionarTalhao = useCallback(
    (id: string) => {
      if (modoDesenho) return;
      const alvo = talhoesSalvos.find((t) => t.id === id);
      if (!alvo) return;
      setTalhaoSelecionadoId((atual) => (atual === id ? null : id));
      setCoordenadaFoco([alvo.centroLng, alvo.centroLat]);
    },
    [modoDesenho, talhoesSalvos],
  );

  const { totalExibidoHa, perimetroAtivoKm, areaParaSementesHa, sufixoContexto } = useMemo(() => {
    if (modoDesenho && pontos.length >= 2) {
      return {
        totalExibidoHa: areaAtualHa,
        perimetroAtivoKm: calcularPerimetroKm(pontos),
        areaParaSementesHa: areaAtualHa,
        sufixoContexto: null,
      };
    }

    if (talhaoSelecionado) {
      const anel = (talhaoSelecionado.geometriaJson?.coordinates?.[0] ?? []) as Coordenada[];
      return {
        totalExibidoHa: talhaoSelecionado.areaHectares,
        perimetroAtivoKm: calcularPerimetroKm(anel),
        areaParaSementesHa: talhaoSelecionado.areaHectares,
        sufixoContexto: talhaoSelecionado.nome,
      };
    }

    let areaTotal = 0;
    let perimetroTotal = 0;
    let areaPlantio = 0;

    for (const item of talhoesSalvos) {
      areaTotal += item.areaHectares;
      if (item.tipo === 'pasto' || item.tipo === 'lavoura') {
        areaPlantio += item.areaHectares;
      }
      const anel = (item.geometriaJson?.coordinates?.[0] ?? []) as Coordenada[];
      perimetroTotal += calcularPerimetroKm(anel);
    }

    return {
      totalExibidoHa: Number(areaTotal.toFixed(2)),
      perimetroAtivoKm: Number(perimetroTotal.toFixed(2)),
      areaParaSementesHa: Number(areaPlantio.toFixed(2)),
      sufixoContexto: null,
    };
  }, [modoDesenho, pontos, areaAtualHa, talhaoSelecionado, talhoesSalvos]);

  const sementesEstimadasKg = Math.round(areaParaSementesHa * 12);

  const handleSalvarTalhao = async () => {
    if (!rascunho) return;
    if (!nome.trim()) {
      setErroNome('Informe o nome do talhão (ex.: Pasto 1).');
      return;
    }

    try {
      setSalvando(true);
      const novo = await criarTalhao({
        nome,
        tipo,
        cor,
        coordenadas: rascunho.pontos,
      });
      limpar();
      setRascunho(null);
      setTalhaoSelecionadoId(novo.id);
      setCoordenadaFoco([novo.centroLng, novo.centroLat]);
    } catch (err) {
      setErroNome(err instanceof Error ? err.message : 'Não foi possível salvar o talhão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScreenContainer header={<Header title={APP_NAME} showMenu showNotification />}>
      <SectionHeader title="Mapeamento & Áreas" size="lg" />

      <MapaBase
        nomeFazenda={sufixoContexto ? `Talhão: ${sufixoContexto}` : 'Fazenda Recanto Verde'}
        totalHectares={totalExibidoHa}
        coordenadaFoco={coordenadaFoco}
        onMapPress={adicionarPonto}
        style={modoDesenho ? styles.mapaDesenhando : undefined}>
        <CamadaTalhoesSalvos
          talhoes={talhoesSalvos}
          selecionadoId={talhaoSelecionado?.id ?? null}
          onPressTalhao={handleSelecionarTalhao}
        />
        <CamadaDesenho pontos={pontos} erroTopologico={erroTopologico} />
      </MapaBase>

      <BarraControlesDesenho
        modoDesenho={modoDesenho}
        quantidadePontos={pontos.length}
        areaAtualHa={areaAtualHa}
        erroTopologico={erroTopologico}
        podeConcluir={podeConcluir}
        onAlternarModo={alternarModo}
        onDesfazer={desfazerPonto}
        onLimpar={limpar}
        onConcluir={concluir}
      />

      {talhoesSalvos.length === 0 ? (
        <EmptyState message="Nenhum talhão cadastrado." />
      ) : (
        <View style={styles.listCard}>
          {talhoesSalvos.map((item, idx) => {
            const selecionado = talhaoSelecionado?.id === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleSelecionarTalhao(item.id)}
                style={({ pressed }) => [
                  styles.listRow,
                  idx > 0 && styles.listRowBorder,
                  selecionado && styles.listRowSelected,
                  pressed && styles.rowPressed,
                ]}>
                <View style={styles.listLeft}>
                  <View style={[styles.colorDot, { backgroundColor: item.cor }]} />
                  <Text
                    style={[styles.talhaoNome, selecionado && styles.talhaoNomeSelected]}
                    numberOfLines={1}>
                    {item.nome}
                  </Text>
                </View>

                <View style={styles.listRight}>
                  <Text style={[styles.talhaoHa, selecionado && styles.talhaoHaSelected]}>
                    {Number(item.areaHectares.toFixed(1))} Ha
                  </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => deletarTalhao(item.id)}
                    style={styles.deleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${item.nome}`}>
                    <AppIcon name="x" size={IconSize.sm} color={AgroColors.textMuted} />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.quickCardsRow}>
        <StatActionCard
          icon={<CalcularAreaIcon />}
          title="Calcular Área"
          subtitle={areaAtualHa > 0 ? `${areaAtualHa.toFixed(2)} Ha` : 'Medir talhão'}
          active={modoDesenho}
          onPress={alternarModo}
        />
        <StatActionCard
          icon={<CercasIcon />}
          title="Cercas"
          active={Boolean(talhaoSelecionado)}
          subtitle={
            perimetroAtivoKm > 0
              ? `${perimetroAtivoKm.toFixed(2).replace('.', ',')} km${sufixoContexto ? ` • ${sufixoContexto}` : ' planejados'}`
              : 'Calcular cerca'
          }
          onPress={() => setModalCalculadora('cercas')}
        />
        <StatActionCard
          icon={<SementesIcon />}
          title="Kg Sementes"
          active={Boolean(talhaoSelecionado)}
          subtitle={
            sementesEstimadasKg > 0
              ? `${sementesEstimadasKg} kg${sufixoContexto ? ` • ${sufixoContexto}` : ' necessários'}`
              : 'Calcular plantio'
          }
          onPress={() => setModalCalculadora('sementes')}
        />
      </View>

      <ModalCalculadoraCercas
        visible={modalCalculadora === 'cercas'}
        perimetroInicialKm={perimetroAtivoKm}
        nomeTalhao={sufixoContexto}
        onClose={() => setModalCalculadora(null)}
      />

      <ModalCalculadoraSementes
        visible={modalCalculadora === 'sementes'}
        areaInicialHa={areaParaSementesHa}
        nomeTalhao={sufixoContexto}
        onClose={() => setModalCalculadora(null)}
      />

      <FormModal
        visible={rascunho !== null}
        title="Salvar Talhão"
        subtitle={rascunho ? `Área medida: ${rascunho.areaHectares.toFixed(2)} Ha` : undefined}
        onClose={() => {
          if (!salvando) {
            setRascunho(null);
            setErroNome(undefined);
          }
        }}
        onSubmit={handleSalvarTalhao}
        submitLabel="Salvar Talhão"
        loading={salvando}>
        <CustomInput
          label="Nome do Talhão"
          placeholder="Ex.: Pasto 1, Lavoura 2..."
          value={nome}
          onChangeText={(texto) => {
            setNome(texto);
            if (erroNome) setErroNome(undefined);
          }}
          error={erroNome}
          required
          autoFocus
        />

        <ChipSelector
          label="Tipo de Área"
          options={OPCOES_TIPO_TALHAO}
          value={tipo}
          onChange={(novoTipo) => {
            setTipo(novoTipo);
            setCor(COR_PADRAO_POR_TIPO[novoTipo]);
          }}
        />

        <View style={styles.colorField}>
          <Text style={styles.colorLabel}>Cor no Mapa</Text>
          <View style={styles.colorRow}>
            {PALETA_CORES.map((hex) => (
              <Pressable
                key={hex}
                onPress={() => setCor(hex)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: hex },
                  cor === hex && styles.colorSwatchSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Cor ${hex}`}
              />
            ))}
          </View>
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mapaDesenhando: { height: 300 },
  listCard: {
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  listRowBorder: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  listRowSelected: { backgroundColor: AgroColors.mintBg },
  rowPressed: { opacity: 0.75 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  colorDot: { width: 10, height: 10, borderRadius: Radius.full },
  talhaoNome: { fontSize: 14, fontWeight: '500', color: AgroColors.textSecondary, flex: 1 },
  talhaoNomeSelected: { fontWeight: '700', color: AgroColors.headerGreen },
  listRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  talhaoHa: { fontSize: 14, fontWeight: '700', color: AgroColors.textPrimary },
  talhaoHaSelected: { color: AgroColors.primaryDark },
  deleteBtn: { padding: 4, borderRadius: Radius.full },
  quickCardsRow: { flexDirection: 'row', gap: Spacing.sm },
  colorField: { gap: 6 },
  colorLabel: { fontSize: 12, fontWeight: '600', color: AgroColors.textSecondary },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 2 },
  colorSwatch: { width: 30, height: 30, borderRadius: Radius.full, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: AgroColors.textPrimary, transform: [{ scale: 1.12 }] },
});
