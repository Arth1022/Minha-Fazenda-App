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
  children,
}: FormModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
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

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>

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
  bodyContent: {
    gap: Spacing.md,
    paddingVertical: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: AgroColors.divider,
  },
});
