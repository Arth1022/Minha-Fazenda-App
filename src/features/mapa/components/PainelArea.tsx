import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/ui';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import type { Talhao } from '@/database';
import {
  resumoDaArea,
  resumoDaSafra,
  ROTULO_ESTADO_AREA,
  situacaoDaArea,
  type EstadoArea,
} from '../services/areas';
import { BotaoMapa, CoresTexto } from './elementos';

const TOM_ESTADO: Record<EstadoArea, { fundo: string; texto: string }> = {
  ocupado: { fundo: AgroColors.forestTint, texto: AgroColors.forest },
  plantada: { fundo: AgroColors.forestTint, texto: AgroColors.forest },
  descanso: { fundo: AgroColors.divider, texto: AgroColors.textSecondary },
  vazia: { fundo: AgroColors.divider, texto: AgroColors.textSecondary },
  colhida: { fundo: AgroColors.healthBg, texto: AgroColors.health },
};

export interface PainelAreaProps {
  area: Talhao;
  /** "⋮": renomear, redesenhar, ponto de atenção, excluir */
  onOpcoes: () => void;
  onFechar: () => void;
  /** Lavoura: registrar ou atualizar a safra */
  onSafra: () => void;
  /** Altura do painel, para a câmera enquadrar a área acima dele */
  onAltura?: (altura: number) => void;
}

/**
 * Painel inferior da área tocada (RF-004): cor do tipo, nome, selo da situação,
 * "Tipo · área · perímetro" e o conteúdo do tipo. Fica sobre o mapa sem
 * escurecer nem bloquear: dá para tocar em outra área com ele aberto.
 */
export function PainelArea({ area, onOpcoes, onFechar, onSafra, onAltura }: PainelAreaProps) {
  const insets = useSafeAreaInsets();
  const { estado } = situacaoDaArea(area);
  const safra = resumoDaSafra(area);

  return (
    <View style={estilos.camada} pointerEvents="box-none">
      <View
        style={[estilos.painel, { paddingBottom: insets.bottom + Spacing.three }]}
        onLayout={(e) => onAltura?.(e.nativeEvent.layout.height)}>
        <View style={estilos.alca} />

        <View style={estilos.cabecalho}>
          <View style={estilos.titulos}>
            <View style={estilos.linhaNome}>
              <View style={[estilos.cor, { backgroundColor: COR_POR_TIPO_AREA[area.tipo] }]} />
              <Text style={estilos.nome} numberOfLines={1}>
                {area.nome}
              </Text>
              {estado ? (
                <View style={[estilos.selo, { backgroundColor: TOM_ESTADO[estado].fundo }]}>
                  <Text style={[estilos.seloTexto, { color: TOM_ESTADO[estado].texto }]}>
                    {ROTULO_ESTADO_AREA[estado]}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={estilos.resumo}>{resumoDaArea(area)}</Text>
          </View>
          <BotaoRedondo icone="moreVertical" rotulo="Mais opções da área" onPress={onOpcoes} />
          <BotaoRedondo icone="x" rotulo="Fechar painel da área" onPress={onFechar} />
        </View>

        {area.tipo === 'lavoura' ? (
          <>
            {safra ? (
              <View style={estilos.cartao}>
                <View style={estilos.cartaoLinha}>
                  <AppIcon name="sprout" size={20} color={AgroColors.forest} />
                  <Text style={estilos.cartaoTitulo} numberOfLines={1}>
                    {safra.cultura}
                  </Text>
                  {safra.dias !== null ? <Text style={estilos.cartaoDetalhe}>dia {safra.dias}</Text> : null}
                </View>
                {safra.fase ? <Text style={estilos.cartaoDetalhe}>{safra.fase}</Text> : null}
              </View>
            ) : null}
            <BotaoMapa
              rotulo={safra ? 'Atualizar safra' : 'Registrar safra'}
              icone="sprout"
              variante={safra ? 'contorno' : 'primario'}
              onPress={onSafra}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

function BotaoRedondo({ icone, rotulo, onPress }: { icone: AppIconName; rotulo: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [estilos.botaoRedondo, pressed && estilos.pressionado]}>
      <AppIcon name={icone} size={22} color={CoresTexto.escuro} />
    </Pressable>
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
    gap: Spacing.three,
    ...Shadows.md,
  },
  alca: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.borderStrong,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titulos: { flex: 1, gap: 2 },
  linhaNome: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cor: { width: 14, height: 14, borderRadius: 3 },
  nome: { flexShrink: 1, fontSize: 22, lineHeight: 28, fontWeight: '800', color: CoresTexto.escuro },
  selo: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.xs },
  seloTexto: { fontSize: 12.5, lineHeight: 16, fontWeight: '700' },
  resumo: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
  botaoRedondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.surfaceMuted,
  },
  pressionado: { opacity: 0.7 },
  cartao: {
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.xs,
  },
  cartaoLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cartaoTitulo: { flex: 1, fontSize: 16.5, lineHeight: 22, fontWeight: '700', color: CoresTexto.escuro },
  cartaoDetalhe: { fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
});
