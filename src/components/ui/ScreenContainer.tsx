import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  AgroColors,
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';

export interface ScreenContainerProps {
  /** Cabeçalho renderizado no topo (fora do padding horizontal para ocupar 100% da largura) */
  header?: React.ReactNode;
  /** Rodapé fixo opcional (ex.: botão "Novo Tratamento" na Tela 3) */
  footer?: React.ReactNode;
  /** Conteúdo da tela */
  children: React.ReactNode;
  /** Desativa ScrollView quando a tela possui lista virtualizada própria */
  scrollable?: boolean;
  /** Indica se a tela está dentro das abas inferiores (adiciona espaçamento para o FAB/TabBar) */
  withTabInset?: boolean;
  /** Estilo adicional do container de conteúdo */
  contentContainerStyle?: ViewStyle;
}

/**
 * Container responsivo padrão para todas as telas do app.
 * Garante barra de status verde escura (#14532D), SafeAreaView no topo,
 * cabeçalho full-width e área centralizada com MaxContentWidth.
 */
export function ScreenContainer({
  header,
  footer,
  children,
  scrollable = true,
  withTabInset = true,
  contentContainerStyle,
}: ScreenContainerProps) {
  return (
    <View style={styles.outerRoot}>
      <StatusBar style="light" />
      <View style={styles.responsiveColumn}>
        <SafeAreaView edges={['top']} style={styles.topSafeHeader}>
          {header}
        </SafeAreaView>

        <View style={styles.bodyWrapper}>
          {scrollable ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                withTabInset && { paddingBottom: BottomTabInset + Spacing.four },
                contentContainerStyle,
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.staticContent,
                withTabInset && { paddingBottom: BottomTabInset },
                contentContainerStyle,
              ]}>
              {children}
            </View>
          )}

          {footer ? (
            <SafeAreaView edges={['bottom']} style={styles.footerContainer}>
              {footer}
            </SafeAreaView>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerRoot: {
    flex: 1,
    backgroundColor: AgroColors.screenBg,
    alignItems: 'center',
  },
  responsiveColumn: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: AgroColors.screenBg,
  },
  topSafeHeader: {
    backgroundColor: AgroColors.headerGreen,
    width: '100%',
  },
  bodyWrapper: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: 14,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: 14,
  },
  footerContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.three,
    backgroundColor: AgroColors.cardBg,
    borderTopWidth: 1,
    borderTopColor: AgroColors.divider,
  },
});
