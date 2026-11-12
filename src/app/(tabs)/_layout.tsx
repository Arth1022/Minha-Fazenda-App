import { Image } from 'expo-image';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Href, Tabs, router, usePathname } from 'expo-router';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { useBotoesFlutuantes } from '@/components/ui/botoesFlutuantes';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { AgroColors, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import { useFazendaDoContexto } from '@/database';
import { AcoesMaquinaModal, useQrCodeMaquina } from '@/features/maquinas';
import { LeituraBrincoModais, useLeituraBrinco, useQrCodeAnimal } from '@/features/rebanho';
import { BannerAppDesatualizado } from '@/features/sync';
import { BotaoRelatarProblema, RelatarProblemaProvider } from '@/features/tarefas';
import { BotaoLerQrCode } from '@/services/qrcode';

interface TabConfig {
  href: Href;
  label: string;
  icon: AppIconName;
}

const HOME_HREF: Href = '/';

const LEFT_TABS: TabConfig[] = [
  { href: '/mapa', label: 'Mapa', icon: 'map' },
  { href: '/rebanho', label: 'Rebanho', icon: 'cow' },
];

const RIGHT_TABS: TabConfig[] = [
  { href: '/estoque', label: 'Tarefas', icon: 'check' },
  { href: '/maquinas', label: 'Máquinas', icon: 'tractor' },
];

/**
 * Barra inferior customizada: abas laterais e Início no botão central.
 * A aba ativa vem da rota atual (usePathname) e a troca usa o router do Expo Router.
 */
function TabBar() {
  const pathname = usePathname();
  const isHomeActive = pathname === HOME_HREF;

  const navigateTo = (href: Href) => {
    if (pathname !== href) {
      router.navigate(href);
    }
  };

  const renderTabButton = (tab: TabConfig) => {
    const isFocused = pathname === tab.href;

    return (
      <Pressable
        key={tab.label}
        onPress={() => navigateTo(tab.href)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        style={styles.tabItem}>
        {/* Aba ativa: ícone dentro de uma pílula verde-clara (protótipo). O fundo é uma
            view própria, montada já arredondada: ligar o backgroundColor numa view que já
            existe faz o Android (Fabric) perder o borderRadius e a pílula fica quadrada. */}
        <View style={styles.iconPill}>
          {isFocused ? <View style={styles.iconPillFundo} /> : null}
          <AppIcon
            name={tab.icon}
            size={22}
            color={isFocused ? AgroColors.forest : AgroColors.textMuted}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.outerBarWrapper}>
      <SafeAreaView edges={['bottom']} style={styles.safeBottom}>
        <View style={styles.tabBarRow}>
          <View style={styles.tabGroup}>{LEFT_TABS.map(renderTabButton)}</View>

          {/* Posição Central: logo do app, leva ao Início */}
          <View style={styles.fabCenterSlot}>
            <FloatingActionButton
              isActive={isHomeActive}
              onPress={() => navigateTo(HOME_HREF)}
              accessibilityLabel="Ir para o Início (Home)"
              logo={
                <Image
                  source={require('@/assets/images/minha-fazenda-logo.png')}
                  style={styles.fabLogo}
                  contentFit="contain"
                />
              }
            />
            <Text
              style={[
                styles.tabLabel,
                styles.centerHomeLabel,
                isHomeActive ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}>
              Início
            </Text>
          </View>

          <View style={styles.tabGroup}>{RIGHT_TABS.map(renderTabButton)}</View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Altura da linha de abas (tabBarRow), sem a área segura de baixo */
const TAB_BAR_HEIGHT = 66;

/** Lado dos botões flutuantes redondos (QR Code e Relatar problema) */
const BOTAO_FLUTUANTE = 52;

/** QR Code que nenhum fluxo reconheceu: só mostra o que foi lido. */
function mostrarQrCodeLido(valor: string) {
  Alert.alert('QR Code lido', valor);
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Alinha com a coluna central (MaxContentWidth) em telas largas
  const margemLateral = Math.max(0, (width - MaxContentWidth) / 2) + Spacing.three;
  const qrMaquina = useQrCodeMaquina();
  const qrAnimal = useQrCodeAnimal();
  const leituraBrinco = useLeituraBrinco();

  // Cada fluxo tenta reconhecer o QR Code; o que sobrar só é mostrado
  const aoLerQrCode = async (valor: string) => {
    if (await qrMaquina.tratar(valor)) return;
    if (await qrAnimal.tratar(valor)) return;
    mostrarQrCodeLido(valor);
  };

  // Uma árvore de abas por fazenda: trocar de fazenda remonta as telas do zero
  // (sem seleção, filtros ou leituras da fazenda anterior) e volta para o Início
  const fazendaId = useFazendaDoContexto();

  // Botões flutuantes empilhados no canto inferior direito, logo acima da barra de abas
  // (ou acima do painel que a tela abriu no rodapé, como a lista de áreas do mapa)
  const posicaoBotoes = useBotoesFlutuantes();
  const baseBotoes = insets.bottom + TAB_BAR_HEIGHT + Spacing.three + posicaoBotoes.elevacao;
  // Escondidos ficam montados: o leitor de QR aberto não pode sumir no meio
  const visibilidadeBotoes = posicaoBotoes.ocultos ? styles.oculto : null;

  return (
    <RelatarProblemaProvider>
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.banner}>
          <BannerAppDesatualizado />
        </SafeAreaView>
        <Tabs key={fazendaId ?? 'sem-fazenda'} screenOptions={{ headerShown: false }} tabBar={() => <TabBar />}>
          <Tabs.Screen name="index" options={{ title: 'Início' }} />
          <Tabs.Screen name="mapa" options={{ title: 'Mapa' }} />
          <Tabs.Screen name="rebanho" options={{ title: 'Rebanho' }} />
          <Tabs.Screen name="estoque" options={{ title: 'Tarefas' }} />
          <Tabs.Screen name="maquinas" options={{ title: 'Máquinas' }} />
        </Tabs>

        {/* Relatar problema: sempre à mão, logo acima do leitor de QR Code */}
        <BotaoRelatarProblema
          style={{
            ...styles.botaoFlutuante,
            ...visibilidadeBotoes,
            right: margemLateral,
            bottom: baseBotoes + BOTAO_FLUTUANTE + Spacing.two,
          }}
        />

        {/* Leitor de QR Code: canto inferior direito, logo acima da barra de abas */}
        <BotaoLerQrCode
          onLido={aoLerQrCode}
          onTextoLido={leituraBrinco.tratarTextos}
          opcoes={{ titulo: 'Ler QR Code ou brinco', modoTexto: 'Número do brinco' }}
          style={{
            ...styles.botaoFlutuante,
            ...visibilidadeBotoes,
            right: margemLateral,
            bottom: baseBotoes,
          }}
        />

        <AcoesMaquinaModal maquinaId={qrMaquina.maquinaId} onClose={qrMaquina.fechar} />

        <LeituraBrincoModais
          estado={leituraBrinco.estado}
          onAbrir={leituraBrinco.abrirFicha}
          onDigitar={leituraBrinco.digitar}
          onBuscar={leituraBrinco.buscarDigitado}
          onFechar={leituraBrinco.fechar}
        />
      </View>
    </RelatarProblemaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  botaoFlutuante: {
    position: 'absolute',
  },
  oculto: {
    display: 'none',
  },
  outerBarWrapper: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  safeBottom: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: AgroColors.cardBg,
    borderTopWidth: 1,
    borderTopColor: AgroColors.border,
    ...Shadows.sm,
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 4,
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  fabCenterSlot: {
    width: 74,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    gap: 2,
  },
  centerHomeLabel: {
    marginTop: 1,
  },
  fabLogo: {
    width: '100%',
    height: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  iconPill: {
    width: 52,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillFundo: {
    ...StyleSheet.absoluteFill,
    borderRadius: 15,
    backgroundColor: AgroColors.forestTint,
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 15,
  },
  tabLabelActive: {
    color: AgroColors.forest,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: AgroColors.textMuted,
    fontWeight: '500',
  },
});
