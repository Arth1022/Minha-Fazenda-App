import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing } from '@/constants/theme';
import { CoresTexto } from '../elementos';

/* Peças do painel inferior do mapa (protótipo, telas 14, 17 e 18). */

/** Título de uma tela do painel ("Mover lote Novilhas") com o X que volta ao resumo da área. */
export function CabecalhoPainel({
  titulo,
  subtitulo,
  onFechar,
}: {
  titulo: string;
  subtitulo?: string | null;
  onFechar: () => void;
}) {
  return (
    <View style={estilos.cabecalho}>
      <View style={estilos.cabecalhoTextos}>
        <Text style={estilos.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
      </View>
      <BotaoRedondo icone="x" rotulo="Voltar ao resumo da área" onPress={onFechar} />
    </View>
  );
}

/** Botão cinza redondo do cabeçalho ("⋮", X). */
export function BotaoRedondo({
  icone,
  rotulo,
  onPress,
}: {
  icone: AppIconName;
  rotulo: string;
  onPress: () => void;
}) {
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

/** Duas opções num trilho cinza; a escolhida fica branca ("Animais | Lotes"). */
export function SeletorSegmentado<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (valor: T) => void;
}) {
  return (
    <View style={estilos.trilho} accessibilityRole="tablist">
      {opcoes.map((opcao) => {
        const ativa = opcao.valor === valor;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => onChange(opcao.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            style={[estilos.segmento, ativa && estilos.segmentoAtivo]}>
            <Text style={[estilos.segmentoTexto, ativa && estilos.segmentoTextoAtivo]}>{opcao.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Quadradinho de marcar (verde com check quando marcado). */
export function CaixaMarcar({ marcada }: { marcada: boolean }) {
  return (
    <View style={[estilos.caixa, marcada && estilos.caixaMarcada]}>
      {marcada ? <AppIcon name="check" size={16} color={AgroColors.textInverse} /> : null}
    </View>
  );
}

/** Bolinha de escolha única (verde cheia quando escolhida). */
export function BolinhaEscolha({ escolhida }: { escolhida: boolean }) {
  return (
    <View style={[estilos.bolinha, escolhida && estilos.bolinhaEscolhida]}>
      {escolhida ? <View style={estilos.bolinhaMiolo} /> : null}
    </View>
  );
}

/** Linha de lista com ícone, rótulo, valor à direita e seta ("Histórico de ocupação  >"). */
export function LinhaNavegacao({
  icone,
  rotulo,
  valor,
  onPress,
  divisor = true,
}: {
  icone?: AppIconName;
  rotulo: string;
  valor?: string | number | null;
  onPress: () => void;
  divisor?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.linha, divisor && estilos.linhaDivisor, pressed && estilos.pressionado]}>
      {icone ? <AppIcon name={icone} size={22} color={AgroColors.forest} /> : null}
      <Text style={estilos.linhaRotulo} numberOfLines={1}>
        {rotulo}
      </Text>
      {valor !== undefined && valor !== null ? <Text style={estilos.linhaValor}>{valor}</Text> : null}
      <AppIcon name="chevronRight" size={IconSize.lg} color={CoresTexto.suave} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.7 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cabecalhoTextos: { flex: 1, gap: 2 },
  titulo: { fontSize: 21, lineHeight: 27, fontWeight: '800', color: CoresTexto.escuro },
  subtitulo: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
  botaoRedondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.surfaceMuted,
  },
  trilho: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.surfaceMuted,
  },
  segmento: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  segmentoAtivo: {
    backgroundColor: AgroColors.cardBg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentoTexto: { fontSize: 15, fontWeight: '600', color: CoresTexto.suave },
  segmentoTextoAtivo: { fontWeight: '700', color: CoresTexto.escuro },
  caixa: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AgroColors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: { backgroundColor: AgroColors.forest, borderColor: AgroColors.forest },
  bolinha: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AgroColors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolinhaEscolhida: { borderColor: AgroColors.forest },
  bolinhaMiolo: { width: 12, height: 12, borderRadius: 6, backgroundColor: AgroColors.forest },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
  },
  linhaDivisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  linhaRotulo: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '600', color: CoresTexto.escuro },
  linhaValor: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: CoresTexto.suave },
});
