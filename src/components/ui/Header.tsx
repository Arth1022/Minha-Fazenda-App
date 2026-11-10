import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { AppIcon } from './AppIcon';

export interface HeaderProps {
  /** Título exibido na barra superior */
  title: string;
  /** Subtítulo opcional ou texto do sub-banner */
  subtitle?: string;
  /** Exibe seta de retorno (<) à esquerda */
  showBack?: boolean;
  /** Exibe ícone de menu hambúrguer (☰) à esquerda quando showBack=false */
  showMenu?: boolean;
  /** Exibe sino de notificação à direita */
  showNotification?: boolean;
  /** Exibe botão de mais opções (⋮) à direita */
  showMore?: boolean;
  /** Sub-banner verde abaixo do cabeçalho (ex.: "✓ Tratamento Animal" na Tela 3 do Figma) */
  subBannerTitle?: string;
  /** Callback customizado para o botão esquerdo */
  onLeftPress?: () => void;
  /** Callback customizado para o botão direito */
  onRightPress?: () => void;
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Cabeçalho superior fiel ao protótipo do Figma.
 * Barra verde-escura (#14532D) de ponta a ponta com suporte a navegação,
 * ícone de menu, notificações, menu de contexto (⋮) e sub-banner de módulo.
 */
export function Header({
  title,
  subtitle,
  showBack = false,
  showMenu = false,
  showNotification = false,
  showMore = false,
  subBannerTitle,
  onLeftPress,
  onRightPress,
  style,
}: HeaderProps) {
  const router = useRouter();

  const handleLeftAction = () => {
    if (onLeftPress) {
      onLeftPress();
      return;
    }
    if (showBack && router.canGoBack()) {
      router.back();
    } else if (showBack) {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.headerBar}>
        <View style={styles.leftRow}>
          {showBack ? (
            <Pressable
              onPress={handleLeftAction}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Voltar">
              <Text style={styles.backChevron}>‹</Text>
            </Pressable>
          ) : showMenu ? (
            <Pressable
              onPress={onLeftPress}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Menu">
              <View style={styles.hamburgerBox}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
            </Pressable>
          ) : null}

          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && !subBannerTitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightRow}>
          {showNotification ? (
            <Pressable
              onPress={onRightPress}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Notificações">
              <AppIcon name="bell" size={22} color={AgroColors.textInverse} />
            </Pressable>
          ) : null}

          {showMore ? (
            <Pressable
              onPress={onRightPress}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Mais opções">
              <Text style={styles.moreDots}>⋮</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {subBannerTitle ? (
        <View style={styles.subBanner}>
          <View style={styles.subBannerCheckCircle}>
            <Text style={styles.subBannerCheckMark}>✓</Text>
          </View>
          <Text style={styles.subBannerText}>{subBannerTitle}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: AgroColors.headerGreen,
  },
  headerBar: {
    width: '100%',
    backgroundColor: AgroColors.headerGreen,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  backChevron: {
    color: AgroColors.textInverse,
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '400',
    marginTop: -2,
  },
  hamburgerBox: {
    width: 18,
    height: 14,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: AgroColors.textInverse,
    borderRadius: 1,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...Typography.headerTitle,
  },
  subtitle: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 1,
  },
  moreDots: {
    color: AgroColors.textInverse,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  subBanner: {
    width: '100%',
    backgroundColor: AgroColors.primary,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  subBannerCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AgroColors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBannerCheckMark: {
    color: AgroColors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  subBannerText: {
    color: AgroColors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});
