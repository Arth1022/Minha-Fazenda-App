import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Href, Tabs, router, usePathname } from 'expo-router';

import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { AgroColors, MaxContentWidth, Shadows } from '@/constants/theme';

interface TabConfig {
  href: Href;
  label: string;
  icon: string;
}

const HOME_HREF: Href = '/';

const LEFT_TABS: TabConfig[] = [
  { href: '/mapa', label: 'Mapa', icon: '🗺️' },
  { href: '/rebanho', label: 'Rebanho', icon: '🐮' },
];

const RIGHT_TABS: TabConfig[] = [
  { href: '/estoque', label: 'Estoque', icon: '📦' },
  { href: '/maquinas', label: 'Máquinas', icon: '🚜' },
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
        <Text
          style={[
            styles.tabIcon,
            isFocused ? styles.tabIconActive : styles.tabIconInactive,
          ]}>
          {tab.icon}
        </Text>
        <Text
          style={[
            styles.tabLabel,
            isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}>
          {tab.label}
        </Text>
        {isFocused && <View style={styles.activeDot} />}
      </Pressable>
    );
  };

  return (
    <View style={styles.outerBarWrapper}>
      <SafeAreaView edges={['bottom']} style={styles.safeBottom}>
        <View style={styles.tabBarRow}>
          <View style={styles.tabGroup}>{LEFT_TABS.map(renderTabButton)}</View>

          {/* Posição Central: Ícone da Home com espaço reservado para futura Logo */}
          <View style={styles.fabCenterSlot}>
            <FloatingActionButton
              isActive={isHomeActive}
              onPress={() => navigateTo(HOME_HREF)}
              accessibilityLabel="Ir para o Início (Home)"
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

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <TabBar />}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="rebanho" options={{ title: 'Rebanho' }} />
      <Tabs.Screen name="estoque" options={{ title: 'Estoque' }} />
      <Tabs.Screen name="maquinas" options={{ title: 'Máquinas' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
    height: 62,
    paddingHorizontal: 8,
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
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  tabIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  tabIconActive: {
    color: AgroColors.primary,
    opacity: 1,
  },
  tabIconInactive: {
    color: AgroColors.textMuted,
    opacity: 0.7,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  tabLabelActive: {
    color: AgroColors.primary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: AgroColors.textMuted,
    fontWeight: '500',
  },
  activeDot: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: AgroColors.primaryLight,
    marginTop: 1,
  },
});
