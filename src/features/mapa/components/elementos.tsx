import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { Talhao } from '@/database';

/* Peças visuais da tela de Mapa, no padrão do protótipo (PDF "Minha Fazenda"). */

const BORDA_CAMPO = '#D5DAD6';
const TEXTO_ESCURO = '#1A1F1C';
const TEXTO_SUAVE = '#5C6560';

type VarianteBotao = 'primario' | 'contorno';

export interface BotaoMapaProps {
  rotulo: string;
  onPress: () => void;
  icone?: AppIconName;
  variante?: VarianteBotao;
  desabilitado?: boolean;
  carregando?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BotaoMapa({
  rotulo,
  onPress,
  icone,
  variante = 'primario',
  desabilitado = false,
  carregando = false,
  style,
}: BotaoMapaProps) {
  const primario = variante === 'primario';
  const inativo = desabilitado || carregando;
  const corConteudo = desabilitado
    ? AgroColors.textMuted
    : primario
      ? AgroColors.textInverse
      : TEXTO_ESCURO;

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo }}
      style={({ pressed }) => [
        estilos.botao,
        primario ? estilos.botaoPrimario : estilos.botaoContorno,
        desabilitado && estilos.botaoDesabilitado,
        pressed && estilos.pressionado,
        style,
      ]}>
      {carregando ? (
        <ActivityIndicator color={corConteudo} />
      ) : (
        <>
          {icone ? <AppIcon name={icone} size={20} color={corConteudo} /> : null}
          <Text style={[estilos.botaoTexto, { color: corConteudo }]}>{rotulo}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Link verde com ícone (ex.: "Usar um talhão", "Salvar este ponto..."). */
export function LinkMapa({
  rotulo,
  icone,
  onPress,
  cor = AgroColors.forest,
}: {
  rotulo: string;
  icone?: AppIconName;
  onPress: () => void;
  cor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.link, pressed && estilos.pressionado]}>
      {icone ? <AppIcon name={icone} size={18} color={cor} /> : null}
      <Text style={[estilos.linkTexto, { color: cor }]}>{rotulo}</Text>
    </Pressable>
  );
}

/** Rótulo do campo com uma ação opcional à direita. */
export function RotuloCampo({ titulo, acao }: { titulo: string; acao?: React.ReactNode }) {
  return (
    <View style={estilos.rotuloLinha}>
      <Text style={estilos.rotulo}>{titulo}</Text>
      {acao}
    </View>
  );
}

export interface CampoMapaProps {
  valor: string;
  onChange: (texto: string) => void;
  unidade?: string;
  placeholder?: string;
  numerico?: boolean;
  autoFocus?: boolean;
  acessibilidade: string;
}

export function CampoMapa({
  valor,
  onChange,
  unidade,
  placeholder,
  numerico = true,
  autoFocus,
  acessibilidade,
}: CampoMapaProps) {
  return (
    <View style={estilos.campo}>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={AgroColors.textPlaceholder}
        keyboardType={numerico ? 'decimal-pad' : 'default'}
        autoFocus={autoFocus}
        accessibilityLabel={acessibilidade}
        style={estilos.campoTexto}
      />
      {unidade ? <Text style={estilos.campoUnidade}>{unidade}</Text> : null}
    </View>
  );
}

export interface OpcaoGrade<T extends string> {
  valor: T;
  rotulo: string;
}

/** Opções em grade (2 ou 3 colunas); a escolhida fica verde cheia. */
export function GradeOpcoes<T extends string>({
  opcoes,
  selecionado,
  onChange,
  colunas = 2,
}: {
  opcoes: OpcaoGrade<T>[];
  selecionado: T;
  onChange: (valor: T) => void;
  colunas?: 2 | 3;
}) {
  return (
    <View style={estilos.grade}>
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === selecionado;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => onChange(opcao.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: ativo }}
            style={({ pressed }) => [
              estilos.opcao,
              colunas === 3 ? estilos.opcaoTerco : estilos.opcaoMetade,
              ativo && estilos.opcaoAtiva,
              pressed && estilos.pressionado,
            ]}>
            <Text style={[estilos.opcaoTexto, ativo && estilos.opcaoTextoAtivo]} numberOfLines={1}>
              {opcao.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Caixa cinza "Você precisa comprar" do fim das calculadoras. */
export function CaixaResultado({ children }: { children: React.ReactNode }) {
  return (
    <View style={estilos.resultado}>
      <Text style={estilos.resultadoTitulo}>Você precisa comprar</Text>
      {children}
    </View>
  );
}

/**
 * Lista dos talhões para preencher a calculadora (aberta pelo "Usar um talhão").
 * `medida` diz o que mostrar de cada um (área ou perímetro).
 */
export function SeletorTalhao({
  talhoes,
  medida,
  onEscolher,
}: {
  talhoes: Talhao[];
  medida: (talhao: Talhao) => string;
  onEscolher: (talhao: Talhao) => void;
}) {
  if (talhoes.length === 0) {
    return (
      <View style={estilos.seletorVazio}>
        <Text style={estilos.seletorVazioTexto}>
          Nenhuma área desenhada ainda. Desenhe no mapa para usar a medida dela aqui.
        </Text>
      </View>
    );
  }

  return (
    <View style={estilos.seletor}>
      {talhoes.map((talhao, indice) => (
        <Pressable
          key={talhao.id}
          onPress={() => onEscolher(talhao)}
          accessibilityRole="button"
          style={({ pressed }) => [
            estilos.seletorLinha,
            indice > 0 && estilos.seletorDivisor,
            pressed && estilos.pressionado,
          ]}>
          <View style={[estilos.pontoCor, { backgroundColor: COR_POR_TIPO_AREA[talhao.tipo] }]} />
          <Text style={estilos.seletorNome} numberOfLines={1}>
            {talhao.nome}
          </Text>
          <Text style={estilos.seletorMedida}>{medida(talhao)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const CoresTexto = { escuro: TEXTO_ESCURO, suave: TEXTO_SUAVE } as const;

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.8 },
  botao: {
    minHeight: 50,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  botaoPrimario: { backgroundColor: AgroColors.forest },
  botaoContorno: {
    backgroundColor: AgroColors.cardBg,
    borderWidth: 1.5,
    borderColor: BORDA_CAMPO,
  },
  botaoDesabilitado: { backgroundColor: '#E1E6E2', borderColor: '#E1E6E2' },
  botaoTexto: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 40,
  },
  linkTexto: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  rotuloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  rotulo: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: '#3A403C' },
  campo: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: BORDA_CAMPO,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  campoTexto: { flex: 1, fontSize: 17, color: TEXTO_ESCURO, paddingVertical: 12 },
  campoUnidade: { fontSize: 16, fontWeight: '500', color: TEXTO_SUAVE },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  opcao: {
    minHeight: 46,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: BORDA_CAMPO,
    backgroundColor: AgroColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  opcaoMetade: { flexBasis: '47%', flexGrow: 1 },
  opcaoTerco: { flexBasis: '30%', flexGrow: 1 },
  opcaoAtiva: { backgroundColor: AgroColors.forest, borderColor: AgroColors.forest },
  opcaoTexto: { fontSize: 16, fontWeight: '500', color: TEXTO_ESCURO },
  opcaoTextoAtivo: { color: AgroColors.textInverse, fontWeight: '700' },
  resultado: {
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  resultadoTitulo: { fontSize: 14, lineHeight: 19, fontWeight: '600', color: '#3A403C' },
  seletor: {
    borderWidth: 1,
    borderColor: AgroColors.border,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  seletorLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: AgroColors.cardBg,
  },
  seletorDivisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  pontoCor: { width: 12, height: 12, borderRadius: Radius.full },
  seletorNome: { flex: 1, fontSize: 15, fontWeight: '600', color: TEXTO_ESCURO },
  seletorMedida: { fontSize: 14, fontWeight: '600', color: TEXTO_SUAVE },
  seletorVazio: {
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  seletorVazioTexto: { fontSize: 14, lineHeight: 20, color: TEXTO_SUAVE },
});
