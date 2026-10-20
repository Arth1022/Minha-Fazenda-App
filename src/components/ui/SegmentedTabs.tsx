import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';

export interface SegmentedTabItem<T extends string> {
  key: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string> {
  /** Lista de abas (ex.: Rebanho / Pasto) */
  tabs: SegmentedTabItem<T>[];
  /** Aba atualmente ativa */
  activeTab: T;
  /** Callback ao selecionar uma aba */
  onTabChange: (tab: T) => void;
  /** Exibe botão de filtro (funil) à direita conforme Tela 2 do Figma */
  showFilter?: boolean;
  /** Indica se há filtro ativo */
  filterActive?: boolean;
  /** Callback ao clicar no botão de filtro */
  onFilterPress?: () => void;
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Barra de abas com sublinhado verde e ícone de filtro à direita,
 * idêntica à tela "Gerenciamento Rebanho" no protótipo do Figma.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  showFilter = false,
  filterActive = false,
  onFilterPress,
  style,
}: SegmentedTabsProps<T>) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={styles.tabButton}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}>
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}>
                {tab.label}
              </Text>
              <View
                style={[
                  styles.indicator,
                  isActive && styles.indicatorActive,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {showFilter ? (
        <Pressable
          onPress={onFilterPress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.filterBtn,
            filterActive && styles.filterBtnActive,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Filtrar lista">
          <View style={styles.funnelIcon}>
            <View
              style={[
                styles.funnelBarTop,
                filterActive && styles.funnelBarActive,
              ]}
            />
            <View
              style={[
                styles.funnelBarMid,
                filterActive && styles.funnelBarActive,
              ]}
            />
            <View
              style={[
                styles.funnelBarBot,
                filterActive && styles.funnelBarActive,
              ]}
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: AgroColors.border,
    ...Shadows.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: AgroColors.textMuted,
    paddingBottom: 8,
  },
  tabTextActive: {
    color: AgroColors.primary,
    fontWeight: '700',
  },
  indicator: {
    height: 2.5,
    width: '100%',
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: AgroColors.primary,
  },
  filterBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  filterBtnActive: {
    backgroundColor: AgroColors.mintBg,
  },
  pressed: {
    opacity: 0.7,
  },
  funnelIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
  },
  funnelBarTop: {
    width: 14,
    height: 2,
    backgroundColor: AgroColors.textMuted,
    borderRadius: 1,
  },
  funnelBarMid: {
    width: 9,
    height: 2,
    backgroundColor: AgroColors.textMuted,
    borderRadius: 1,
  },
  funnelBarBot: {
    width: 4,
    height: 2,
    backgroundColor: AgroColors.textMuted,
    borderRadius: 1,
  },
  funnelBarActive: {
    backgroundColor: AgroColors.primary,
  },
});
