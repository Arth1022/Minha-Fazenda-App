import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppIcon, type AppIconName } from '@/components/ui';
import { AgroColors, MaxContentWidth, Spacing } from '@/constants/theme';
import type { OrigemFoto } from '@/services/fotos';
import { OpcoesFotoSheet } from './OpcoesFotoSheet';

/**
 * Peças das telas de conta (protótipo "Conta"): fundo claro, logo com o nome
 * no topo, campos altos de cantos redondos e botões verdes de 60 de altura.
 */

export const CoresConta = {
  fundo: AgroColors.screenBg,
  titulo: '#1A1F1C',
  texto: '#5F6661',
  rotulo: '#3F4642',
  borda: '#D3D8D4',
  verde: AgroColors.forest,
  verdeClaro: AgroColors.forestTint,
} as const;

const LOGO = require('@/assets/logo_com_texto.png');
/** Proporção do arquivo do logo (1971 × 798) */
const PROPORCAO_LOGO = 1971 / 798;

export function LogoComTexto({ altura = 56 }: { altura?: number }) {
  return (
    <Image
      source={LOGO}
      style={{ height: altura, width: altura * PROPORCAO_LOGO }}
      contentFit="contain"
      accessibilityLabel="Minha Fazenda"
    />
  );
}

/** Botão branco redondo do canto (fechar ou voltar). */
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
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [estilos.redondo, pressed && estilos.pressionado]}>
      <AppIcon name={icone} size={24} color={CoresConta.rotulo} />
    </Pressable>
  );
}

export interface TelaContaProps {
  /** Botão do canto: fechar (X) ou voltar (←) */
  canto?: { icone: 'x' | 'arrowLeft'; rotulo: string; onPress: () => void };
  /** Fica no fim da tela, abaixo do conteúdo (botão principal e link) */
  rodape?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Molde das telas de entrar e criar conta: logo e botão do canto em cima,
 * conteúdo rolável e o rodapé preso embaixo, que sobe com o teclado.
 */
export function TelaConta({ canto, rodape, children }: TelaContaProps) {
  return (
    <View style={estilos.raiz}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={estilos.coluna}>
        {/* Expo edge-to-edge: o teclado não encolhe a janela, então o behavior vale nos dois sistemas */}
        <KeyboardAvoidingView behavior="padding" style={estilos.flex}>
          <ScrollView
            style={estilos.flex}
            contentContainerStyle={estilos.rolagem}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={estilos.topo}>
              <LogoComTexto />
              {canto ? <BotaoRedondo icone={canto.icone} rotulo={canto.rotulo} onPress={canto.onPress} /> : null}
            </View>
            {children}
          </ScrollView>
          {rodape ? <View style={estilos.rodape}>{rodape}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function TituloConta({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <View style={estilos.titulos}>
      <Text style={estilos.titulo} accessibilityRole="header">
        {titulo}
      </Text>
      {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
    </View>
  );
}

/** "Passo 1 de 2" com a barra dividida em partes. */
export function PassosConta({ atual, total }: { atual: number; total: number }) {
  return (
    <View style={estilos.passos}>
      <Text style={estilos.passosTexto}>
        Passo {atual} de {total}
      </Text>
      <View style={estilos.passosBarra}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[estilos.passo, i < atual && estilos.passoFeito]} />
        ))}
      </View>
    </View>
  );
}

export interface CampoContaProps extends Omit<TextInputProps, 'style'> {
  rotulo?: string;
  icone?: AppIconName;
  erro?: string | null;
  ajuda?: string;
  senha?: boolean;
  /** Estilo do texto digitado (ex.: o código grande e espaçado) */
  estiloTexto?: TextInputProps['style'];
}

/** Campo alto de cantos redondos; senha com "Mostrar"/"Ocultar" em verde. */
export function CampoConta({ rotulo, icone, erro, ajuda, senha = false, estiloTexto, ...resto }: CampoContaProps) {
  const [focado, setFocado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  return (
    <View style={estilos.campo}>
      {rotulo ? <Text style={[estilos.rotulo, erro && estilos.textoErro]}>{rotulo}</Text> : null}
      <View style={[estilos.caixa, focado && estilos.caixaFocada, erro && estilos.caixaErro]}>
        {icone ? <AppIcon name={icone} size={24} color={CoresConta.texto} /> : null}
        <TextInput
          {...resto}
          accessibilityLabel={resto.accessibilityLabel ?? rotulo}
          secureTextEntry={senha && !visivel}
          placeholderTextColor="#8A918C"
          onFocus={(e) => {
            setFocado(true);
            resto.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            resto.onBlur?.(e);
          }}
          style={[estilos.entrada, estiloTexto]}
        />
        {senha ? (
          <Pressable
            onPress={() => setVisivel((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visivel ? 'Ocultar senha' : 'Mostrar senha'}>
            <Text style={estilos.mostrar}>{visivel ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <Text style={[estilos.ajuda, estilos.textoErro]}>{erro}</Text>
      ) : ajuda ? (
        <Text style={estilos.ajuda}>{ajuda}</Text>
      ) : null}
    </View>
  );
}

export function BotaoConta({
  rotulo,
  onPress,
  variante = 'cheio',
  carregando = false,
  desabilitado = false,
  style,
}: {
  rotulo: string;
  onPress: () => void;
  variante?: 'cheio' | 'contorno';
  carregando?: boolean;
  desabilitado?: boolean;
  style?: ViewStyle;
}) {
  const cheio = variante === 'cheio';
  return (
    <Pressable
      onPress={onPress}
      disabled={carregando || desabilitado}
      accessibilityRole="button"
      accessibilityState={{ disabled: carregando || desabilitado, busy: carregando }}
      style={({ pressed }) => [
        estilos.botao,
        cheio ? estilos.botaoCheio : estilos.botaoContorno,
        (pressed || desabilitado) && estilos.pressionado,
        style,
      ]}>
      {carregando ? (
        <ActivityIndicator color={cheio ? '#FFFFFF' : CoresConta.verde} />
      ) : (
        <Text style={[estilos.botaoTexto, !cheio && estilos.botaoTextoContorno]}>{rotulo}</Text>
      )}
    </Pressable>
  );
}

/** Texto verde tocável ("Esqueci a senha", "Criar conta"). */
export function LinkConta({ texto, onPress, style }: { texto: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="link" style={style}>
      <Text style={estilos.link}>{texto}</Text>
    </Pressable>
  );
}

/** "Não tem conta? Criar conta" */
export function PerguntaComLink({ pergunta, link, onPress }: { pergunta: string; link: string; onPress: () => void }) {
  return (
    <View style={estilos.pergunta}>
      <Text style={estilos.perguntaTexto}>{pergunta}</Text>
      <LinkConta texto={link} onPress={onPress} />
    </View>
  );
}

export function ErroConta({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return <Text style={[estilos.ajuda, estilos.textoErro, estilos.erroGeral]}>{mensagem}</Text>;
}

/** "Adicionar foto · Opcional": tocar abre a folha (câmera, galeria ou remover). */
export function FotoConta({
  fotoUri,
  onEscolher,
  onRemover,
}: {
  fotoUri: string | null;
  onEscolher: (origem: OrigemFoto) => void;
  onRemover: () => void;
}) {
  const [opcoesAbertas, setOpcoesAbertas] = useState(false);
  const abrir = () => setOpcoesAbertas(true);
  return (
    <View style={estilos.foto}>
      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={fotoUri ? 'Trocar a foto' : 'Adicionar foto (opcional)'}
        style={({ pressed }) => [estilos.fotoCirculo, pressed && estilos.pressionado]}>
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={estilos.fotoImagem} contentFit="cover" />
        ) : (
          <AppIcon name="camera" size={30} color={CoresConta.verde} />
        )}
      </Pressable>
      <Pressable onPress={abrir} hitSlop={6} accessibilityElementsHidden importantForAccessibility="no" style={estilos.fotoTextos}>
        <Text style={estilos.fotoTitulo}>{fotoUri ? 'Trocar foto' : 'Adicionar foto'}</Text>
        <Text style={estilos.fotoOpcional}>{fotoUri ? 'Câmera ou galeria' : 'Opcional'}</Text>
      </Pressable>
      <OpcoesFotoSheet
        visivel={opcoesAbertas}
        comFoto={Boolean(fotoUri)}
        titulo="Sua foto"
        onEscolher={onEscolher}
        onRemover={onRemover}
        onFechar={() => setOpcoesAbertas(false)}
      />
    </View>
  );
}

/** Cartão de escolha com ícone e bolinha (radio), como "Criar minha fazenda". */
export function OpcaoConta({
  icone,
  titulo,
  descricao,
  selecionada,
  onPress,
}: {
  icone: AppIconName;
  titulo: string;
  descricao: string;
  selecionada: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionada }}
      style={({ pressed }) => [estilos.opcao, selecionada && estilos.opcaoAtiva, pressed && estilos.pressionado]}>
      <View style={estilos.opcaoIcone}>
        <AppIcon name={icone} size={24} color={CoresConta.verde} />
      </View>
      <View style={estilos.opcaoTextos}>
        <Text style={estilos.opcaoTitulo}>{titulo}</Text>
        <Text style={estilos.opcaoDescricao}>{descricao}</Text>
      </View>
      <View style={[estilos.radio, selecionada && estilos.radioAtivo]}>
        {selecionada ? <View style={estilos.radioPonto} /> : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  pressionado: { opacity: 0.8 },
  raiz: { flex: 1, backgroundColor: CoresConta.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  rolagem: { flexGrow: 1, paddingHorizontal: 22, paddingTop: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.lg },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  rodape: { paddingHorizontal: 22, paddingTop: Spacing.sm, paddingBottom: Spacing.three, gap: Spacing.lg },
  redondo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AgroColors.cardBg,
    borderWidth: 1,
    borderColor: '#E1E4E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulos: { gap: Spacing.sm, marginBottom: Spacing.xs },
  titulo: { fontSize: 32, lineHeight: 40, fontWeight: '800', color: CoresConta.titulo, letterSpacing: -0.4 },
  subtitulo: { fontSize: 17, lineHeight: 23, color: CoresConta.texto },
  passos: { gap: Spacing.sm },
  passosTexto: { fontSize: 14, fontWeight: '700', color: CoresConta.texto },
  passosBarra: { flexDirection: 'row', gap: Spacing.two },
  passo: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#DDE2DE' },
  passoFeito: { backgroundColor: CoresConta.verde },
  campo: { gap: Spacing.two },
  rotulo: { fontSize: 15, fontWeight: '700', color: CoresConta.rotulo },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 60,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: CoresConta.borda,
    backgroundColor: AgroColors.cardBg,
  },
  caixaFocada: { borderColor: CoresConta.verde },
  caixaErro: { borderColor: AgroColors.danger },
  entrada: { flex: 1, fontSize: 17, color: CoresConta.titulo, paddingVertical: Spacing.sm },
  mostrar: { fontSize: 16, fontWeight: '700', color: CoresConta.verde },
  ajuda: { fontSize: 14, lineHeight: 19, color: CoresConta.texto },
  textoErro: { color: AgroColors.danger },
  erroGeral: { fontSize: 15, lineHeight: 21 },
  botao: { height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  botaoCheio: { backgroundColor: CoresConta.verde },
  botaoContorno: { backgroundColor: AgroColors.cardBg, borderWidth: 1.5, borderColor: CoresConta.verde },
  botaoTexto: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  botaoTextoContorno: { color: CoresConta.verde },
  link: { fontSize: 16, fontWeight: '700', color: CoresConta.verde },
  pergunta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  perguntaTexto: { fontSize: 16, color: CoresConta.texto },
  foto: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  fotoCirculo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: CoresConta.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fotoImagem: { width: 84, height: 84 },
  fotoTextos: { gap: 2, alignItems: 'flex-start' },
  fotoTitulo: { fontSize: 17, fontWeight: '700', color: CoresConta.titulo },
  fotoOpcional: { fontSize: 15, color: CoresConta.texto },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E1E4E2',
    backgroundColor: AgroColors.cardBg,
  },
  opcaoAtiva: { borderColor: CoresConta.verde, backgroundColor: '#F1F6F2' },
  opcaoIcone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: CoresConta.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoTextos: { flex: 1, gap: 2 },
  opcaoTitulo: { fontSize: 17, fontWeight: '700', color: CoresConta.titulo },
  opcaoDescricao: { fontSize: 14.5, color: CoresConta.texto },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#8A918C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioAtivo: { borderColor: CoresConta.verde, backgroundColor: CoresConta.verde },
  radioPonto: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
});
