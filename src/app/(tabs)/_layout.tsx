import { Image } from 'expo-image';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Href, Tabs, router, usePathname } from 'expo-router';

import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { AgroColors, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import { AcoesMaquinaModal, useQrCodeMaquina } from '@/features/maquinas';
import { LeituraBrincoModais, useLeituraBrinco, useQrCodeAnimal } from '@/features/rebanho';
import { BotaoLerQrCode } from '@/services/qrcode';

/**
 * Ícone desenhado para a aba (PNG com fundo transparente, pintado pelo
 * `tintColor`). Os arquivos têm respiros diferentes em volta do desenho; com a
 * fração da altura que o desenho ocupa, todos aparecem com a mesma altura.
 */
interface IconeAba {
  fonte: number;
  /** Largura ÷ altura do arquivo */
  proporcao: number;
  /** Fração da altura do arquivo ocupada pelo desenho */
  ocupacao: number;
}

interface TabConfig {
  href: Href;
  label: string;
  icone: IconeAba;
}

/** Altura visível do desenho de cada ícone, em pt */
const ALTURA_DESENHO = 21;

const HOME_HREF: Href = '/';

const LEFT_TABS: TabConfig[] = [
  {
    href: '/mapa',
    label: 'Mapa',
    icone: { fonte: require('@/assets/images/tabIcons/mapa_icon.png'), proporcao: 1.5, ocupacao: 0.63 },
  },
  {
    href: '/rebanho',
    label: 'Rebanho',
    icone: { fonte: require('@/assets/images/tabIcons/vaca_icon.png'), proporcao: 1.09, ocupacao: 0.71 },
  },
];

const RIGHT_TABS: TabConfig[] = [
  {
    href: '/estoque',
    label: 'Estoque',
    icone: { fonte: require('@/assets/images/tabIcons/tasks_icon.png'), proporcao: 1, ocupacao: 0.55 },
  },
  {
    href: '/maquinas',
    label: 'Máquinas',
    icone: { fonte: require('@/assets/images/tabIcons/trator_icon.png'), proporcao: 1.094, ocupacao: 0.71 },
  },
];

/** Caixa da imagem para o desenho ficar com ALTURA_DESENHO (o respiro transparente sobra em volta). */
function tamanhoDoIcone({ proporcao, ocupacao }: IconeAba) {
  const altura = ALTURA_DESENHO / ocupacao;
  return { width: altura * proporcao, height: altura };
}

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
          <Image
            source={tab.icone.fonte}
            style={tamanhoDoIcone(tab.icone)}
            contentFit="contain"
            tintColor={isFocused ? AgroColors.forest : AgroColors.textMuted}
            accessible={false}
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

  return (
    <View style={styles.root}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={() => <TabBar />}>
        <Tabs.Screen name="index" options={{ title: 'Início' }} />
        <Tabs.Screen name="mapa" options={{ title: 'Mapa' }} />
        <Tabs.Screen name="rebanho" options={{ title: 'Rebanho' }} />
        <Tabs.Screen name="estoque" options={{ title: 'Estoque' }} />
        <Tabs.Screen name="maquinas" options={{ title: 'Máquinas' }} />
      </Tabs>

      {/* Leitor de QR Code: canto inferior direito, logo acima da barra de abas */}
      <BotaoLerQrCode
        onLido={aoLerQrCode}
        onTextoLido={leituraBrinco.tratarTextos}
        opcoes={{ titulo: 'Ler QR Code ou brinco', modoTexto: 'Número do brinco' }}
        style={{
          ...styles.qrButton,
          right: margemLateral,
          bottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.three,
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
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  qrButton: {
    position: 'absolute',
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
