import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { AppIcon } from './AppIcon';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Fração da altura da tela que o conteúdo pode ocupar antes de rolar (padrão 0,6) */
  alturaMaxima?: number;
  children: React.ReactNode;
}

/**
 * Folha que sobe do rodapé sobre a tela escurecida (ex.: menu "O que deseja
 * registrar?"). Fecha no X, no fundo escuro ou no voltar do Android.
 */
export function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  alturaMaxima = 0.6,
  children,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.titles}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Fechar">
              <AppIcon name="x" size={IconSize.lg} color={AgroColors.textSecondary} />
            </Pressable>
          </View>

          {/* Rola quando a lista passa de ~60% da tela (ex.: muitas crias ou pesagens) */}
          <ScrollView
            style={{ maxHeight: height * alturaMaxima }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
  },
  sheet: {
    backgroundColor: AgroColors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  titles: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    ...Typography.screenTitle,
    fontSize: 20,
    lineHeight: 26,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.divider,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    gap: Spacing.sm,
  },
});
