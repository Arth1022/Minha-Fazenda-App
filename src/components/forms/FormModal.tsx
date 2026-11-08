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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { AgroColors, IconSize, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export interface FormModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Sem onSubmit, o modal não mostra o rodapé (ex.: menu de opções) */
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** Chamado quando o modal termina de abrir (ex.: focar o campo de busca) */
  onShow?: () => void;
  /**
   * Envolve o conteúdo numa rolagem (padrão). Desligue quando o conteúdo já rola
   * sozinho (ex.: FlatList), para o que vem antes dele ficar fixo.
   */
  scrollable?: boolean;
  /**
   * `center` (padrão): cartão no meio da tela.
   * `sheet`: sobe do rodapé e pode crescer até quase cobrir a tela.
   */
  variant?: 'center' | 'sheet';
  children: React.ReactNode;
}

/**
 * Modal padronizado para formulários de criação e edição rápida.
 */
export function FormModal({
  visible,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  loading = false,
  onShow,
  scrollable = true,
  variant = 'center',
  children,
}: FormModalProps) {
  const insets = useSafeAreaInsets();
  const isSheet = variant === 'sheet';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isSheet ? 'slide' : 'fade'}
      onRequestClose={onClose}
      onShow={onShow}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.overlay,
          isSheet && [styles.overlaySheet, { paddingTop: insets.top + Spacing.five }],
        ]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />

        <View
          style={[
            styles.sheet,
            isSheet && [styles.sheetBottom, { paddingBottom: insets.bottom + Spacing.lg }],
          ]}>
          {isSheet ? <View style={styles.handle} /> : null}

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? (
                <Text style={styles.subtitle}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar modal">
              <AppIcon name="x" size={IconSize.md} color={AgroColors.textSecondary} />
            </Pressable>
          </View>

          {scrollable ? (
            <ScrollView
              style={isSheet ? styles.bodyScrollSheet : styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.bodyContent, styles.bodyFixed]}>{children}</View>
          )}

          {onSubmit ? (
            <View style={styles.footer}>
              <Button
                label={cancelLabel}
                variant="secondary"
                onPress={onClose}
                disabled={loading}
                style={{ flex: 1 }}
              />
              <Button
                label={submitLabel}
                variant="primary"
                onPress={onSubmit}
                loading={loading}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  // Folha colada no rodapé; o paddingTop (status bar + folga) limita a altura
  overlaySheet: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    padding: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.three,
    ...Shadows.md,
  },
  sheetBottom: {
    maxWidth: '100%',
    maxHeight: '100%',
    flexShrink: 1,
    borderRadius: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.sm,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: AgroColors.divider,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.screenTitle,
    fontSize: 17,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AgroColors.subtleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    maxHeight: 380,
  },
  // Sem teto fixo: ocupa o espaço que a folha tiver e rola o resto
  bodyScrollSheet: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    gap: Spacing.md,
    paddingVertical: 2,
  },
  // Encolhe com o modal (ex.: teclado aberto) para a lista interna continuar rolando
  bodyFixed: {
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: AgroColors.divider,
  },
});
