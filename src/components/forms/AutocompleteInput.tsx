import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { normalizarTexto } from '@/utils';
import { CustomInput, type CustomInputProps } from './CustomInput';

export interface AutocompleteInputProps extends Omit<
  CustomInputProps,
  'value' | 'onChangeText'
> {
  value: string;
  onChangeText: (value: string) => void;
  /** Lista completa de sugestões pesquisáveis */
  suggestions: readonly string[];
  /** Quantidade máxima de sugestões exibidas */
  maxSuggestions?: number;
}

/** Sugestões que começam com o texto primeiro, depois as que apenas o contêm. */
function filterSuggestions(
  suggestions: readonly string[],
  value: string,
  max: number
): string[] {
  const query = normalizarTexto(value);
  if (!query) return [];
  const normalized = suggestions.map((item) => ({
    item,
    key: normalizarTexto(item),
  }));
  // Valor já corresponde exatamente a uma sugestão: nada a sugerir
  if (normalized.some(({ key }) => key === query)) return [];
  const startsWith = normalized.filter(({ key }) => key.startsWith(query));
  const contains = normalized.filter(
    ({ key }) => !key.startsWith(query) && key.includes(query)
  );
  return [...startsWith, ...contains].slice(0, max).map(({ item }) => item);
}

/**
 * Campo de texto com sugestões filtradas conforme a digitação.
 * Aceita texto livre: as sugestões apenas auxiliam o preenchimento.
 */
export function AutocompleteInput({
  value,
  onChangeText,
  suggestions,
  maxSuggestions = 6,
  ...inputProps
}: AutocompleteInputProps) {
  const matches = filterSuggestions(suggestions, value, maxSuggestions);

  return (
    <View style={styles.container}>
      <CustomInput
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        {...inputProps}
      />

      {matches.length > 0 ? (
        <View style={styles.suggestionList}>
          {matches.map((item, index) => (
            <Pressable
              key={item}
              onPress={() => onChangeText(item)}
              style={({ pressed }) => [
                styles.suggestionItem,
                index > 0 && styles.suggestionDivider,
                pressed && styles.suggestionPressed,
              ]}
              accessibilityRole="button">
              <Text style={styles.suggestionText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  suggestionList: {
    borderWidth: 1,
    borderColor: AgroColors.border,
    borderRadius: Radius.sm,
    backgroundColor: AgroColors.cardBg,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  suggestionDivider: {
    borderTopWidth: 1,
    borderTopColor: AgroColors.divider,
  },
  suggestionPressed: {
    backgroundColor: AgroColors.mintBg,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: AgroColors.textPrimary,
  },
});
