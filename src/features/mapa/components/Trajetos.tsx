import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppIcon, BottomSheet } from '@/components/ui';
import { AgroColors, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { formatarDuracao } from '@/features/maquinas';
import { ORDEM_PERIODOS, ROTULO_PERIODO, textoKm, type PeriodoTrajetos } from '../services/trajetos';
import { CoresTexto, GradeOpcoes } from './elementos';

/* Camada Trajetos (tela 26): barra com o período, filtro por máquina e a lista dos usos. */

export interface MaquinaDoFiltro {
  id: string;
  nome: string;
  cor: string;
}

/** Topo da camada: voltar, "Trajetos", o período ("Hoje ▾") e as máquinas para filtrar (RF-061). */
export function BarraTrajetos({
  topo,
  periodo,
  maquinas,
  maquinaId,
  onVoltar,
  onPeriodo,
  onMaquina,
}: {
  topo: number;
  periodo: PeriodoTrajetos;
  maquinas: readonly MaquinaDoFiltro[];
  maquinaId: string | null;
  onVoltar: () => void;
  onPeriodo: () => void;
  onMaquina: (maquinaId: string | null) => void;
}) {
  return (
    <View style={[estilos.barra, { top: topo }]} pointerEvents="box-none">
      <View style={estilos.linhaTopo}>
        <Pressable
          onPress={onVoltar}
          accessibilityRole="button"
          accessibilityLabel="Sair dos trajetos"
          style={({ pressed }) => [estilos.botaoRedondo, pressed && estilos.pressionado]}>
          <AppIcon name="arrowLeft" size={24} color={CoresTexto.escuro} />
        </Pressable>
        <View style={estilos.titulo}>
          <Text style={estilos.tituloTexto}>Trajetos</Text>
        </View>
        <Pressable
          onPress={onPeriodo}
          accessibilityRole="button"
          accessibilityLabel={`Período: ${ROTULO_PERIODO[periodo]}`}
          style={({ pressed }) => [estilos.periodo, pressed && estilos.pressionado]}>
          <Text style={estilos.periodoTexto}>{ROTULO_PERIODO[periodo]}</Text>
          <AppIcon name="chevronDown" size={18} color={CoresTexto.escuro} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        <Chip rotulo="Todas" ativo={maquinaId === null} onPress={() => onMaquina(null)} />
        {maquinas.map((maquina) => (
          <Chip
            key={maquina.id}
            rotulo={maquina.nome}
            cor={maquina.cor}
            ativo={maquinaId === maquina.id}
            onPress={() => onMaquina(maquinaId === maquina.id ? null : maquina.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({ rotulo, cor, ativo, onPress }: { rotulo: string; cor?: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      style={({ pressed }) => [estilos.chip, ativo && estilos.chipAtivo, pressed && estilos.pressionado]}>
      {cor ? <View style={[estilos.chipPonto, { backgroundColor: cor }]} /> : null}
      <Text style={[estilos.chipTexto, ativo && estilos.chipTextoAtivo]} numberOfLines={1}>
        {rotulo}
      </Text>
    </Pressable>
  );
}

export interface ItemTrajeto {
  id: string;
  maquinaNome: string;
  cor: string;
  operador: string | null;
  km: number | null;
  duracaoMs: number;
}

const VAZIO: Record<PeriodoTrajetos, string> = {
  hoje: 'Nenhuma máquina gravou trajeto hoje.',
  ontem: 'Nenhum trajeto ontem.',
  '2dias': 'Nenhum trajeto hoje nem ontem.',
  '7dias': 'Nenhum trajeto nos últimos 7 dias.',
  '30dias': 'Nenhum trajeto nos últimos 30 dias.',
};

/** Os usos do período, um por linha; tocar abre o resumo (RF-063). */
export function ListaTrajetos({
  itens,
  periodo,
  base,
  onAbrir,
}: {
  itens: readonly ItemTrajeto[];
  periodo: PeriodoTrajetos;
  base: number;
  onAbrir: (usoId: string) => void;
}) {
  const { height } = useWindowDimensions();
  return (
    <View style={[estilos.camada, { bottom: base }]} pointerEvents="box-none">
      <View style={estilos.cartao}>
        {itens.length === 0 ? (
          <Text style={estilos.vazio}>{VAZIO[periodo]}</Text>
        ) : (
          <ScrollView style={{ maxHeight: height * 0.32 }}>
            {itens.map((item, indice) => (
              <Pressable
                key={item.id}
                onPress={() => onAbrir(item.id)}
                accessibilityRole="button"
                style={({ pressed }) => [estilos.item, indice > 0 && estilos.itemDivisor, pressed && estilos.pressionado]}>
                <View style={[estilos.itemPonto, { backgroundColor: item.cor }]} />
                <View style={estilos.itemTextos}>
                  <Text style={estilos.itemNome} numberOfLines={1}>
                    {item.maquinaNome}
                  </Text>
                  <Text style={estilos.itemDetalhe} numberOfLines={1}>
                    {[item.operador, item.km !== null ? textoKm(item.km) : null, formatarDuracao(item.duracaoMs)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <AppIcon name="chevronRight" size={22} color={CoresTexto.suave} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const OPCOES_PERIODO = ORDEM_PERIODOS.map((valor) => ({ valor, rotulo: ROTULO_PERIODO[valor] }));

/** Escolha do período da camada Trajetos. */
export function PeriodoTrajetosSheet({
  visible,
  periodo,
  onEscolher,
  onClose,
}: {
  visible: boolean;
  periodo: PeriodoTrajetos;
  onEscolher: (periodo: PeriodoTrajetos) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} title="Período" subtitle="Trajetos que começaram em" onClose={onClose}>
      <View style={estilos.sheet}>
        <GradeOpcoes opcoes={OPCOES_PERIODO} selecionado={periodo} onChange={onEscolher} />
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.75 },
  barra: { position: 'absolute', left: 0, right: 0, gap: Spacing.sm },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  botaoRedondo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AgroColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  titulo: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: AgroColors.cardBg,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    ...Shadows.md,
  },
  tituloTexto: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: CoresTexto.escuro },
  periodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: AgroColors.cardBg,
    paddingHorizontal: Spacing.md,
    ...Shadows.md,
  },
  periodoTexto: { fontSize: 16, fontWeight: '700', color: CoresTexto.escuro },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 40,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.cardBg,
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  chipAtivo: { backgroundColor: AgroColors.forest },
  chipPonto: { width: 12, height: 12, borderRadius: 6 },
  chipTexto: { fontSize: 15, fontWeight: '600', color: CoresTexto.escuro },
  chipTextoAtivo: { color: AgroColors.textInverse, fontWeight: '700' },
  camada: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.md },
  cartao: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: AgroColors.cardBg,
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Shadows.md,
  },
  vazio: { paddingVertical: Spacing.md, fontSize: 15, lineHeight: 21, color: CoresTexto.suave },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64 },
  itemDivisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  itemPonto: { width: 14, height: 14, borderRadius: 7 },
  itemTextos: { flex: 1, gap: 2 },
  itemNome: { fontSize: 16.5, lineHeight: 22, fontWeight: '700', color: CoresTexto.escuro },
  itemDetalhe: { fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
  sheet: { paddingTop: 4 },
});
