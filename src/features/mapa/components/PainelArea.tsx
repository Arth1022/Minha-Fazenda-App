import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, Chip, type AppIconName, type TomFicha } from '@/components/ui';
import { COR_POR_TIPO_AREA, ROTULO_TIPO_AREA } from '@/constants/areas';
import { AgroColors, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import type { Talhao } from '@/database';
import {
  acoesDaArea,
  medidasDaArea,
  situacaoDaArea,
  type AcaoArea,
  type EstadoArea,
} from '../services/areas';
import { CoresTexto } from './elementos';

const VISUAL_ACAO: Record<AcaoArea, { rotulo: string; icone: AppIconName; perigo?: boolean }> = {
  safra: { rotulo: 'Safra', icone: 'sprout' },
  pontoAtencao: { rotulo: 'Ponto de atenção', icone: 'mapPin' },
  editar: { rotulo: 'Nome e tipo', icone: 'edit' },
  redesenhar: { rotulo: 'Redesenhar', icone: 'pentagon' },
  excluir: { rotulo: 'Excluir', icone: 'trash', perigo: true },
};

const TOM_ESTADO: Record<EstadoArea, TomFicha> = {
  ocupado: 'sucesso',
  plantada: 'sucesso',
  descanso: 'neutro',
  vazia: 'neutro',
  colhida: 'saude',
};

export interface PainelAreaProps {
  area: Talhao;
  /** Pontos de atenção ainda abertos dentro da área */
  pontos: number;
  podeEditarGeometria: boolean;
  onAcao: (acao: AcaoArea) => void;
  onFechar: () => void;
  /** Altura do painel, para a câmera enquadrar a área acima dele */
  onAltura?: (altura: number) => void;
}

/**
 * Painel inferior da área tocada (RF-004): resumo (tipo, área, perímetro,
 * situação) e as ações do tipo dela. Fica sobre o mapa sem escurecer nem
 * bloquear: dá para tocar em outra área com ele aberto.
 */
export function PainelArea({
  area,
  pontos,
  podeEditarGeometria,
  onAcao,
  onFechar,
  onAltura,
}: PainelAreaProps) {
  const insets = useSafeAreaInsets();
  const { estado, selo } = situacaoDaArea(area);
  const medidas = medidasDaArea(area);
  const acoes = acoesDaArea(area.tipo, podeEditarGeometria);

  return (
    <View style={estilos.camada} pointerEvents="box-none">
      <View
        style={[estilos.painel, { paddingBottom: insets.bottom + Spacing.three }]}
        onLayout={(e) => onAltura?.(e.nativeEvent.layout.height)}>
        <View style={estilos.alca} />

        <View style={estilos.cabecalho}>
          <View style={[estilos.cor, { backgroundColor: COR_POR_TIPO_AREA[area.tipo] }]} />
          <View style={estilos.titulos}>
            <Text style={estilos.nome} numberOfLines={1}>
              {area.nome}
            </Text>
            <Text style={estilos.tipo}>{ROTULO_TIPO_AREA[area.tipo]}</Text>
          </View>
          <Pressable
            onPress={onFechar}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fechar painel da área"
            style={({ pressed }) => [estilos.fechar, pressed && estilos.pressionado]}>
            <AppIcon name="x" size={22} color={AgroColors.textSecondary} />
          </Pressable>
        </View>

        <View style={estilos.medidas}>
          <View style={estilos.medida}>
            <Text style={estilos.medidaRotulo}>Área</Text>
            <Text style={estilos.medidaValor}>{medidas.area}</Text>
          </View>
          <View style={estilos.medida}>
            <Text style={estilos.medidaRotulo}>Perímetro</Text>
            <Text style={estilos.medidaValor}>{medidas.perimetro}</Text>
          </View>
        </View>

        {(selo && estado) || pontos > 0 ? (
          <View style={estilos.selos}>
            {selo && estado ? <Chip label={selo} tom={TOM_ESTADO[estado]} /> : null}
            {pontos > 0 ? (
              <Chip
                label={pontos === 1 ? '1 ponto de atenção' : `${pontos} pontos de atenção`}
                tom="saude"
              />
            ) : null}
          </View>
        ) : null}

        <View style={estilos.acoes}>
          {acoes.map((acao) => {
            const { rotulo, icone, perigo } = VISUAL_ACAO[acao];
            const cor = perigo ? AgroColors.danger : AgroColors.forest;
            return (
              <Pressable
                key={acao}
                onPress={() => onAcao(acao)}
                accessibilityRole="button"
                accessibilityLabel={rotulo}
                style={({ pressed }) => [estilos.acao, pressed && estilos.pressionado]}>
                <View style={[estilos.acaoIcone, perigo && estilos.acaoIconePerigo]}>
                  <AppIcon name={icone} size={22} color={cor} />
                </View>
                <Text style={[estilos.acaoRotulo, perigo && { color: cor }]} numberOfLines={2}>
                  {rotulo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  camada: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  painel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: AgroColors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.md,
  },
  alca: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.borderStrong,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cor: { width: 16, height: 16, borderRadius: 8 },
  titulos: { flex: 1, gap: 1 },
  nome: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: CoresTexto.escuro },
  tipo: { fontSize: 14, lineHeight: 19, fontWeight: '600', color: CoresTexto.suave },
  fechar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.divider,
  },
  pressionado: { opacity: 0.7 },
  medidas: {
    flexDirection: 'row',
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
  },
  medida: { flex: 1, gap: 2 },
  medidaRotulo: { fontSize: 13, fontWeight: '600', color: CoresTexto.suave },
  medidaValor: { fontSize: 19, lineHeight: 25, fontWeight: '800', color: CoresTexto.escuro },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // Quatro por linha: alvos grandes, e as ações das próximas fases cabem numa segunda linha
  acao: {
    flexBasis: '23%',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.two,
  },
  acaoIcone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.surfaceMuted,
  },
  acaoIconePerigo: { backgroundColor: AgroColors.dangerBg },
  acaoRotulo: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: CoresTexto.escuro,
  },
});
