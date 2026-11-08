import React, { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextInputInstance,
} from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { CustomInput } from './CustomInput';
import { FormModal } from './FormModal';

/** Altura fixa da lista: o modal não muda de tamanho enquanto se digita. */
const ALTURA_LISTA_MAX = 420;

export interface BuscaModalProps<T> {
  visible: boolean;
  title: string;
  subtitle?: string;
  placeholder?: string;
  /** Tudo que pode ser encontrado (a busca não depende de aba ou filtro da tela) */
  itens: readonly T[];
  /** Filtra e ordena pelo termo digitado; sem termo, deve devolver todos */
  buscar: (itens: readonly T[], termo: string) => readonly T[];
  keyExtractor: (item: T) => string;
  /** Linha do resultado; use `ResultadoBuscaItem` para manter o padrão do app */
  renderItem: (item: T, escolher: () => void) => React.ReactNode;
  /** Texto acima da lista (ex.: "3 máquinas encontradas") */
  contagem: (total: number, buscando: boolean) => string;
  onClose: () => void;
  /** Item tocado na lista de resultados */
  onSelect: (item: T) => void;
}

/**
 * Modal de busca do app: campo com lupa (foca ao abrir), contagem e lista com
 * altura fixa. Quem usa só diz como buscar e como desenhar cada resultado.
 */
export function BuscaModal<T>({
  visible,
  title,
  subtitle,
  placeholder,
  itens,
  buscar,
  keyExtractor,
  renderItem,
  contagem,
  onClose,
  onSelect,
}: BuscaModalProps<T>) {
  const [termo, setTermo] = useState('');
  const inputRef = useRef<TextInputInstance>(null);
  const { height } = useWindowDimensions();

  const resultados = buscar(itens, termo);
  const buscando = termo.trim().length > 0;
  const alturaLista = Math.round(Math.min(height * 0.45, ALTURA_LISTA_MAX));

  // A próxima abertura começa com a busca limpa
  const fechar = () => {
    setTermo('');
    onClose();
  };

  const escolher = (item: T) => {
    setTermo('');
    onSelect(item);
  };

  return (
    <FormModal
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={fechar}
      onShow={() => inputRef.current?.focus()}
      scrollable={false}>
      <CustomInput
        ref={inputRef}
        value={termo}
        onChangeText={setTermo}
        placeholder={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        leftIcon={<AppIcon name="search" size={IconSize.md} color={AgroColors.textMuted} />}
        rightIcon={
          buscando ? (
            <Pressable
              onPress={() => setTermo('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca">
              <AppIcon name="x" size={IconSize.md} color={AgroColors.textMuted} />
            </Pressable>
          ) : undefined
        }
      />

      <Text style={styles.contagem}>{contagem(resultados.length, buscando)}</Text>

      <FlatList
        data={resultados}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => <>{renderItem(item, () => escolher(item))}</>}
        style={{ height: alturaLista }}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </FormModal>
  );
}

export interface ResultadoBuscaItemProps {
  /** Avatar à esquerda (ex.: vaquinha, logo da marca) */
  avatar?: React.ReactNode;
  titulo: string;
  detalhe?: string;
  onPress: () => void;
}

/** Linha padrão de resultado de busca: avatar, título, detalhe e seta. */
export function ResultadoBuscaItem({ avatar, titulo, detalhe, onPress }: ResultadoBuscaItemProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      {avatar}
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        {detalhe ? (
          <Text style={styles.detalhe} numberOfLines={1}>
            {detalhe}
          </Text>
        ) : null}
      </View>
      <AppIcon name="chevronRight" size={IconSize.lg} color={AgroColors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contagem: {
    ...Typography.caption,
  },
  lista: {
    gap: Spacing.sm,
    paddingBottom: Spacing.half,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
  },
  itemPressed: {
    backgroundColor: AgroColors.mintSurface,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  titulo: {
    ...Typography.bodyBold,
  },
  detalhe: {
    ...Typography.caption,
  },
});
