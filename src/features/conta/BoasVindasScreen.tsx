import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppIcon, type AppIconName } from '@/components/ui';
import { AgroColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { BotaoConta, CoresConta, LinkConta, LogoComTexto } from './componentes';
import { avisarDificuldadeDeAcesso } from './semEndpoint';

const CAVALO = require('@/assets/images/cavalo_logo.png');

const AVISOS_SEM_CONTA: { icone: AppIconName; texto: string }[] = [
  { icone: 'cloudOff', texto: 'Nada vai para a nuvem' },
  { icone: 'alert', texto: 'Se perder ou trocar de celular, os dados se perdem' },
  { icone: 'users', texto: 'Sem equipe: ninguém mais acessa a fazenda' },
];

/** Boas-vindas: Criar conta, Entrar ou Entrar sem conta (com o aviso antes). */
export default function BoasVindasScreen() {
  const router = useRouter();
  const [avisoAberto, setAvisoAberto] = useState(false);

  return (
    <View style={estilos.raiz}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={estilos.coluna}>
        <View style={estilos.topo}>
          <Text style={estilos.bemVindo}>Bem-vindo(a) ao</Text>
          <LogoComTexto altura={60} />
        </View>

        <Image source={CAVALO} style={estilos.cavalo} contentFit="contain" accessibilityIgnoresInvertColors />

        <View style={estilos.acoes}>
          <BotaoConta rotulo="Criar conta" onPress={() => router.push('/cadastro')} />
          <BotaoConta rotulo="Entrar" variante="contorno" onPress={() => router.push('/entrar')} />
          <Pressable
            onPress={() => setAvisoAberto(true)}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.semConta, pressed && estilos.pressionado]}>
            <Text style={estilos.semContaTexto}>Entrar sem conta</Text>
          </Pressable>
          <View style={estilos.ajuda}>
            <Text style={estilos.ajudaTexto}>Dificuldade ao acessar?</Text>
            <LinkConta texto="Clique aqui" onPress={avisarDificuldadeDeAcesso} />
          </View>
        </View>
      </SafeAreaView>

      <AvisoSemConta
        visivel={avisoAberto}
        onContinuar={() => {
          setAvisoAberto(false);
          router.push('/sem-conta');
        }}
        onCriarConta={() => {
          setAvisoAberto(false);
          router.push('/cadastro');
        }}
        onFechar={() => setAvisoAberto(false)}
      />
    </View>
  );
}

/** "Usar só neste celular?": o que se perde sem conta, antes de seguir. */
function AvisoSemConta({
  visivel,
  onContinuar,
  onCriarConta,
  onFechar,
}: {
  visivel: boolean;
  onContinuar: () => void;
  onCriarConta: () => void;
  onFechar: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onFechar}>
      <View style={estilos.sobreposicao}>
        <Pressable style={estilos.fundoEscuro} onPress={onFechar} accessibilityRole="button" accessibilityLabel="Fechar" />
        <View style={[estilos.folha, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={estilos.alca} />
          <View style={estilos.iconeCelular}>
            <AppIcon name="smartphone" size={30} color={AgroColors.reportOrange} />
          </View>
          <Text style={estilos.folhaTitulo}>Usar só neste celular?</Text>
          <View style={estilos.avisos}>
            {AVISOS_SEM_CONTA.map((aviso) => (
              <View key={aviso.texto} style={estilos.aviso}>
                <AppIcon name={aviso.icone} size={24} color={CoresConta.texto} />
                <Text style={estilos.avisoTexto}>{aviso.texto}</Text>
              </View>
            ))}
          </View>
          <BotaoConta rotulo="Continuar sem conta" onPress={onContinuar} />
          <LinkConta texto="Voltar e criar conta" onPress={onCriarConta} style={estilos.voltar} />
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.7 },
  raiz: { flex: 1, backgroundColor: CoresConta.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: 22 },
  topo: { paddingTop: Spacing.three, gap: Spacing.sm },
  bemVindo: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: CoresConta.verde },
  cavalo: { flex: 1, width: '100%', marginVertical: Spacing.lg },
  acoes: { gap: Spacing.three, paddingBottom: Spacing.three },
  semConta: { alignSelf: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  semContaTexto: { fontSize: 17, fontWeight: '700', color: CoresConta.rotulo },
  ajuda: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  ajudaTexto: { fontSize: 15, color: CoresConta.texto },

  sobreposicao: { flex: 1, justifyContent: 'flex-end' },
  fundoEscuro: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17, 24, 39, 0.45)' },
  folha: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: AgroColors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },
  alca: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: AgroColors.borderStrong },
  iconeCelular: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDEEE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  folhaTitulo: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: CoresConta.titulo },
  avisos: { gap: Spacing.lg, marginBottom: Spacing.xs },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
  avisoTexto: { flex: 1, fontSize: 17, lineHeight: 24, color: CoresConta.titulo },
  voltar: { alignSelf: 'center', paddingVertical: Spacing.xs },
});
