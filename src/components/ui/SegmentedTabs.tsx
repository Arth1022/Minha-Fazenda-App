import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { AgroColors, IconSize, Radius, Shadows, Spacing } from '@/constants/theme';
import { AppIcon } from './AppIcon';

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
  /** Exibe botão de busca (lupa) à direita, antes do filtro */
  showSearch?: boolean;
  /** Callback ao clicar no botão de busca */
  onSearchPress?: () => void;
  /** Exibe botão de filtro (funil) à direita conforme Tela 2 do Figma */
  showFilter?: boolean;
  /** Indica se há filtro ativo */
  filterActive?: boolean;
  /** Callback ao clicar no botão de filtro */
  onFilterPress?: () => void;
  /** Estilo customizado */
  style?: ViewStyle;
}

/** Área de toque dos botões da direita, sem invadir o botão vizinho. */
const ACTION_HIT_SLOP = { top: 8, bottom: 8, left: 2, right: 2 };

/**
 * Barra de abas com sublinhado verde e ícones de busca e filtro à direita,
 * idêntica à tela "Gerenciamento Rebanho" no protótipo do Figma.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  showSearch = false,
  onSearchPress,
  showFilter = false,
  filterActive = false,
  onFilterPress,
  style,
}: SegmentedTabsProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {/* Só rola na horizontal quando as abas não cabem ao lado dos botões (telas estreitas) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        alwaysBounceHorizontal={false}
        contentContainerStyle={styles.tabsRow}>
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
      </ScrollView>

      {showSearch || showFilter ? (
        <View style={styles.actions}>
          {showSearch ? (
            <Pressable
              onPress={onSearchPress}
              hitSlop={ACTION_HIT_SLOP}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Buscar">
              <AppIcon name="search" size={IconSize.md} color={AgroColors.textMuted} />
            </Pressable>
          ) : null}

          {showFilter ? (
            <Pressable
              onPress={onFilterPress}
              hitSlop={ACTION_HIT_SLOP}
              style={({ pressed }) => [
                styles.actionBtn,
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
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
