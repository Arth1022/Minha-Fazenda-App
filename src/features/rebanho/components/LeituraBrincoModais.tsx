import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { CustomInput, FormModal } from '@/components/forms';
import { AppIcon, BottomSheet, Button } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import type { Animal } from '@/dtos';
import type { EstadoLeituraBrinco } from '../hooks/useLeituraBrinco';
import { AnimalAvatar } from './AnimalAvatar';

export interface LeituraBrincoModaisProps {
  estado: EstadoLeituraBrinco;
  onAbrir: (animal: Animal) => void;
  /** "Digitar o brinco" na lista de opções */
  onDigitar: (sugestao: string) => void;
  /** Brinco digitado para buscar */
  onBuscar: (texto: string) => Promise<void>;
  onFechar: () => void;
}

/** Depois da leitura do número: escolher entre os parecidos ou digitar o brinco. */
export function LeituraBrincoModais({
  estado,
  onAbrir,
  onDigitar,
  onBuscar,
  onFechar,
}: LeituraBrincoModaisProps) {
  return (
    <>
      <BottomSheet
        visible={estado.tipo === 'escolher'}
        title="Qual é o animal?"
        subtitle={
          estado.tipo === 'escolher' && estado.lido
            ? `Número lido: ${estado.lido}`
            : 'Toque no animal para abrir a ficha'
        }
        onClose={onFechar}>
        {estado.tipo === 'escolher'
          ? estado.candidatos.map((animal) => (
              <Pressable
                key={animal.id}
                onPress={() => onAbrir(animal)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
                <AnimalAvatar size={44} />
                <View style={styles.textos}>
                  <Text style={styles.titulo} numberOfLines={1}>
                    {animal.nome ? `${animal.nome} · ${animal.brinco}` : `Brinco ${animal.brinco}`}
                  </Text>
                  {animal.raca ? <Text style={styles.detalhe}>{animal.raca}</Text> : null}
                </View>
                <AppIcon name="chevronRight" size={IconSize.lg} color={AgroColors.textSecondary} />
              </Pressable>
            ))
          : null}
        <Button
          label="Não é nenhum, digitar o brinco"
          variant="outline"
          fullWidth
          onPress={() => onDigitar(estado.tipo === 'escolher' ? estado.lido ?? '' : '')}
        />
      </BottomSheet>

      {/* Montado a cada abertura: o campo começa com o número lido */}
      {estado.tipo === 'digitar' ? (
        <DigitarBrincoModal
          sugestao={estado.sugestao}
          erro={estado.erro}
          daFoto={estado.daFoto}
          onBuscar={onBuscar}
          onFechar={onFechar}
        />
      ) : null}
    </>
  );
}

function DigitarBrincoModal({
  sugestao,
  erro,
  daFoto,
  onBuscar,
  onFechar,
}: {
  sugestao: string;
  erro?: string;
  daFoto: boolean;
  onBuscar: (texto: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [brinco, setBrinco] = useState(sugestao);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);

  const buscar = async () => {
    if (!brinco.trim()) return;
    setBuscando(true);
    try {
      await onBuscar(brinco.trim());
    } finally {
      setBuscando(false);
    }
  };

  return (
    <FormModal
      visible
      title="Digitar brinco"
      subtitle={
        daFoto
          ? 'Não encontrei o animal pelo número da foto. Confira e digite o brinco.'
          : 'Digite o número do brinco do animal'
      }
      onClose={onFechar}
      onShow={() => inputRef.current?.focus()}
      onSubmit={buscar}
      submitLabel="Abrir ficha"
      loading={buscando}>
      <CustomInput
        ref={inputRef}
        label="Brinco"
        value={brinco}
        onChangeText={setBrinco}
        placeholder="Ex: 104"
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={buscar}
        error={erro}
      />
    </FormModal>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.subtleBg,
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
    fontSize: 16,
  },
  detalhe: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
});
