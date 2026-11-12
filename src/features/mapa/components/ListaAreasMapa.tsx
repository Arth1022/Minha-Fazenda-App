import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import type { Talhao } from '@/database';
import { detalheDaArea } from '../services/areas';
import { formatarHectares } from '../services/calculos';
import type { OcupacaoArea } from '../services/ocupacao';
import { CoresTexto } from './elementos';

/** Pílula do canto do mapa ("2 áreas ⌃"): abre a lista de áreas. */
export function BotaoListaAreas({ quantidade, onPress }: { quantidade: number; onPress: () => void }) {
  const rotulo = quantidade === 0 ? 'Áreas' : `${quantidade} ${quantidade === 1 ? 'área' : 'áreas'}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir a lista de áreas (${rotulo})`}
      style={({ pressed }) => [estilos.pilula, pressed && estilos.pressionado]}>
      <AppIcon name="list" size={20} color={CoresTexto.escuro} />
      <Text style={estilos.pilulaTexto}>{rotulo}</Text>
      <AppIcon name="chevronUp" size={18} color={CoresTexto.escuro} />
    </Pressable>
  );
}

export interface ListaAreasMapaProps {
  areas: Talhao[];
  ocupacoes: ReadonlyMap<string, OcupacaoArea>;
  /** Tamanho da fazenda (a divisa), ao lado do título */
  hectaresFazenda: number | null;
  /** Altura máxima da lista rolável (o resto do mapa fica visível acima) */
  alturaMaximaLista: number;
  /** Só o admin desenha área nova */
  onNovaArea?: () => void;
  onEscolher: (area: Talhao) => void;
  onFechar: () => void;
  /** Altura da folha, para subir os botões flutuantes acima dela */
  onAltura?: (altura: number) => void;
}

/** Lista de áreas que sobe por cima do mapa só quando pedida; tocar numa abre o painel dela. */
export function ListaAreasMapa({
  areas,
  ocupacoes,
  hectaresFazenda,
  alturaMaximaLista,
  onNovaArea,
  onEscolher,
  onFechar,
  onAltura,
}: ListaAreasMapaProps) {
  return (
    <View style={estilos.camada} pointerEvents="box-none">
      <View style={estilos.folha} onLayout={(e) => onAltura?.(e.nativeEvent.layout.height)}>
        <View style={estilos.alca} />
        <View style={estilos.cabecalho}>
          <View style={estilos.titulos}>
            <Text style={estilos.titulo}>Áreas</Text>
            {hectaresFazenda !== null ? (
              <Text style={estilos.hectares}>{formatarHectares(hectaresFazenda)}</Text>
            ) : null}
          </View>
          {onNovaArea ? (
            <Pressable
              onPress={onNovaArea}
              accessibilityRole="button"
              accessibilityLabel="Desenhar nova área"
              style={({ pressed }) => [estilos.novaArea, pressed && estilos.pressionado]}>
              <AppIcon name="plus" size={18} color={AgroColors.forest} />
              <Text style={estilos.novaAreaTexto}>Nova área</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onFechar}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fechar a lista de áreas"
            style={({ pressed }) => [estilos.fechar, pressed && estilos.pressionado]}>
            <AppIcon name="chevronDown" size={22} color={CoresTexto.escuro} />
          </Pressable>
        </View>

        {areas.length === 0 ? (
          <Text style={estilos.vazio}>
            {onNovaArea
              ? 'Nenhuma área ainda. Toque em Nova área e marque os cantos no mapa: um pasto, uma lavoura, uma reserva.'
              : 'Nenhuma área ainda. Peça ao dono da fazenda para separar as áreas no mapa.'}
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: alturaMaximaLista }} bounces={false}>
            {areas.map((area, indice) => (
              <Pressable
                key={area.id}
                onPress={() => onEscolher(area)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${area.nome} no mapa`}
                style={({ pressed }) => [
                  estilos.linha,
                  indice > 0 && estilos.divisor,
                  pressed && estilos.pressionado,
                ]}>
                <View style={[estilos.cor, { backgroundColor: COR_POR_TIPO_AREA[area.tipo] }]} />
                <View style={estilos.textos}>
                  <Text style={estilos.nome} numberOfLines={1}>
                    {area.nome}
                  </Text>
                  <Text style={estilos.detalhe} numberOfLines={1}>
                    {detalheDaArea(area, ocupacoes.get(area.id))}
                  </Text>
                </View>
                <Text style={estilos.area}>{formatarHectares(area.areaHectares)}</Text>
                <AppIcon name="chevronRight" size={18} color={CoresTexto.suave} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.8 },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 46,
    paddingHorizontal: Spacing.three,
    borderRadius: 23,
    backgroundColor: AgroColors.cardBg,
    ...Shadows.md,
  },
  pilulaTexto: { fontSize: 16, fontWeight: '600', color: CoresTexto.escuro },

  camada: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  folha: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: AgroColors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.two,
    ...Shadows.md,
  },
  alca: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AgroColors.border,
    marginBottom: Spacing.md,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  titulos: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  titulo: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: CoresTexto.escuro },
  hectares: { fontSize: 14, color: CoresTexto.suave },
  novaArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: AgroColors.forest,
  },
  novaAreaTexto: { fontSize: 14.5, fontWeight: '700', color: AgroColors.forest },
  fechar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: AgroColors.subtleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazio: { fontSize: 15, lineHeight: 21, color: CoresTexto.suave, paddingVertical: Spacing.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  cor: { width: 12, height: 12, borderRadius: 3 },
  textos: { flex: 1, gap: 1 },
  nome: { fontSize: 16, fontWeight: '600', color: CoresTexto.escuro },
  detalhe: { fontSize: 13.5, color: CoresTexto.suave },
  area: { fontSize: 15, fontWeight: '700', color: CoresTexto.escuro },
});
