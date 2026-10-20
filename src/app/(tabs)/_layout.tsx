import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';

import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { AgroColors, MaxContentWidth, Shadows } from '@/constants/theme';
import { useQuickAction } from '@/providers/QuickActionContext';

interface TabConfig {
  name: string;
  label: string;
  icon: string;
}

const LEFT_TABS: TabConfig[] = [
  { name: 'index', label: 'Início', icon: '⌂' },
  { name: 'rebanho', label: 'Rebanho', icon: '🐮' },
];

const RIGHT_TABS: TabConfig[] = [
  { name: 'estoque', label: 'Estoque', icon: '📦' },
  { name: 'maquinas', label: 'Máquinas', icon: '🚜' },
];

export default function TabsLayout() {
  const { triggerQuickAction } = useQuickAction();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={({ state, navigation }) => {
        const currentRouteName = state.routes[state.index]?.name ?? 'index';
        const activeNormalized =
          currentRouteName === 'mapa' ? 'index' : currentRouteName;

        const renderTabButton = (tab: TabConfig) => {
          const isFocused = activeNormalized === tab.name;

          const onPress = () => {
            const targetRoute = state.routes.find((r) => r.name === tab.name);
            if (!targetRoute) return;

            const event = navigation.emit({
              type: 'tabPress',
              target: targetRoute.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(tab.name);
            }
          };

          return (
            <Pressable
              key={tab.name}
              onPress={onPress}
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
                <View style={styles.tabGroup}>
                  {LEFT_TABS.map(renderTabButton)}
                </View>

                <View style={styles.fabCenterSlot}>
                  <FloatingActionButton
                    onPress={() => triggerQuickAction(activeNormalized)}
                    accessibilityLabel="Adicionar novo registro"
                  />
                </View>

                <View style={styles.tabGroup}>
                  {RIGHT_TABS.map(renderTabButton)}
                </View>
              </View>
            </SafeAreaView>
          </View>
        );
      }}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa', href: null }} />
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
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
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
