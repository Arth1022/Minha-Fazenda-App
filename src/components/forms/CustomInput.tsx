import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';

export interface CustomInputProps extends TextInputProps {
  /** Referência do TextInput interno (ex.: focar o campo ao abrir um modal) */
  ref?: React.Ref<TextInputInstance>;
  /** Rótulo exibido acima do campo */
  label?: string;
  /** Mensagem de erro de validação (ativa o estado visual de erro) */
  error?: string;
  /** Texto auxiliar exibido abaixo do campo quando não há erro */
  helperText?: string;
  /** Ativa o modo de senha com botão de alternar visibilidade (olho) */
  isPassword?: boolean;
  /** Desabilita a interação do campo */
  disabled?: boolean;
  /** Elemento ou ícone renderizado à esquerda do input */
  leftIcon?: React.ReactNode;
  /** Elemento ou ícone renderizado à direita do input */
  rightIcon?: React.ReactNode;
  /** Sufixo textual fixo à direita (ex.: "Ha", "kg", "L") */
  suffix?: string;
  /** Estilo customizado do container externo */
  containerStyle?: ViewStyle;
  /** Indica se o campo é obrigatório (exibe asterisco) */
  required?: boolean;
}

/**
 * Componente de formulário desacoplado e reutilizável (CustomInput / FormField).
 * Suporta label, placeholder, validação/erro, controle de visibilidade de senha
 * e estados de foco/desabilitado seguindo o Design System do Figma.
 */
export function CustomInput({
  label,
  error,
  helperText,
  isPassword = false,
  secureTextEntry,
  disabled = false,
  editable = true,
  leftIcon,
  rightIcon,
  suffix,
  containerStyle,
  required = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: CustomInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isFieldDisabled = disabled || editable === false;
  const hasError = Boolean(error && error.trim().length > 0);
  const shouldObscure = (isPassword || secureTextEntry) && !isPasswordVisible;

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, hasError && styles.labelError]}>
            {label}
          </Text>
          {required ? <Text style={styles.requiredMark}>*</Text> : null}
        </View>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          hasError && styles.inputWrapperError,
          isFieldDisabled && styles.inputWrapperDisabled,
        ]}>
        {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.input,
            isFieldDisabled && styles.inputDisabledText,
            style,
          ]}
          placeholderTextColor={AgroColors.textPlaceholder}
          editable={!isFieldDisabled}
          secureTextEntry={shouldObscure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {suffix ? <Text style={styles.suffixText}>{suffix}</Text> : null}

        {isPassword || secureTextEntry ? (
          <Pressable
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            disabled={isFieldDisabled}
            hitSlop={8}
            style={styles.passwordToggle}
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'
            }>
            <Text style={styles.passwordToggleText}>
              {isPasswordVisible ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.iconSlot}>{rightIcon}</View>
        ) : null}
      </View>

      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

export const FormField = CustomInput;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  label: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
    fontWeight: '600',
  },
  labelError: {
    color: AgroColors.danger,
  },
  requiredMark: {
    color: AgroColors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AgroColors.inputBg,
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    gap: Spacing.two,
  },
  inputWrapperFocused: {
    borderColor: AgroColors.primary,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  inputWrapperError: {
    borderColor: AgroColors.danger,
    borderWidth: 1.5,
    backgroundColor: '#FFFBFB',
  },
  inputWrapperDisabled: {
    backgroundColor: AgroColors.divider,
    borderColor: AgroColors.border,
    opacity: 0.75,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: AgroColors.textPrimary,
    paddingVertical: 10,
  },
  inputDisabledText: {
    color: AgroColors.textMuted,
  },
  suffixText: {
    fontSize: 13,
    fontWeight: '600',
    color: AgroColors.textMuted,
  },
  passwordToggle: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  passwordToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.primary,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: AgroColors.danger,
    marginTop: 1,
  },
  helperText: {
    fontSize: 11,
    color: AgroColors.textMuted,
    marginTop: 1,
  },
});
