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

import { CustomInput, FormModal } from '@/components/forms';
import { AppIcon } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import type { AnimalComFase } from '@/dtos';
import { buscarAnimais } from '../services/busca';
import { FASE_LABEL } from '../services/fase';
import { AnimalAvatar } from './AnimalAvatar';

/** Altura fixa da lista: o modal não muda de tamanho enquanto se digita. */
const ALTURA_LISTA_MAX = 420;

function contagem(total: number, buscando: boolean): string {
  if (total === 0) return buscando ? 'Nenhum animal encontrado' : 'Nenhum animal no rebanho';
  if (buscando) return total === 1 ? '1 animal encontrado' : `${total} animais encontrados`;
  return total === 1 ? '1 animal no rebanho' : `${total} animais no rebanho`;
}

interface ResultadoProps {
  animal: AnimalComFase;
  onPress: () => void;
}

/** Linha do resultado: mesma identificação da ficha (nome · brinco, fase · raça). */
function Resultado({ animal, onPress }: ResultadoProps) {
  const titulo = animal.nome ? `${animal.nome} · ${animal.brinco}` : `Brinco ${animal.brinco}`;
  const detalhe = [FASE_LABEL[animal.fase], animal.raca].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <AnimalAvatar size={36} />
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={styles.detalhe} numberOfLines={1}>
          {detalhe}
        </Text>
      </View>
      <AppIcon name="chevronRight" size={IconSize.lg} color={AgroColors.textMuted} />
    </Pressable>
  );
}

export interface BuscarAnimalModalProps {
  visible: boolean;
  /** Rebanho inteiro: a busca não depende da aba aberta */
  animais: AnimalComFase[];
  onClose: () => void;
  /** Animal tocado na lista de resultados */
  onSelect: (animal: AnimalComFase) => void;
}

/**
 * Busca no rebanho inteiro por nome, brinco ou raça. Sem nada digitado, lista
 * todos os animais; tocar num deles devolve o animal para a tela abrir a ficha.
 */
export function BuscarAnimalModal({
  visible,
  animais,
  onClose,
  onSelect,
}: BuscarAnimalModalProps) {
  const [busca, setBusca] = useState('');
  const inputRef = useRef<TextInputInstance>(null);
  const { height } = useWindowDimensions();

  const resultados = buscarAnimais(animais, busca);
  const buscando = busca.trim().length > 0;
  const alturaLista = Math.round(Math.min(height * 0.45, ALTURA_LISTA_MAX));

  // A próxima abertura começa com a busca limpa
  const fechar = () => {
    setBusca('');
    onClose();
  };

  const escolher = (animal: AnimalComFase) => {
    setBusca('');
    onSelect(animal);
  };

  return (
    <FormModal
      visible={visible}
      title="Buscar animal"
      subtitle="Por nome, brinco ou raça, em todo o rebanho"
      onClose={fechar}
      onShow={() => inputRef.current?.focus()}
      scrollable={false}>
      <CustomInput
        ref={inputRef}
        value={busca}
        onChangeText={setBusca}
        placeholder="Ex: Mimosa ou #104"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        leftIcon={<AppIcon name="search" size={IconSize.md} color={AgroColors.textMuted} />}
        rightIcon={
          buscando ? (
            <Pressable
              onPress={() => setBusca('')}
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
        keyExtractor={(animal) => animal.id}
        renderItem={({ item }) => (
          <Resultado animal={item} onPress={() => escolher(item)} />
        )}
        style={{ height: alturaLista }}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </FormModal>
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
