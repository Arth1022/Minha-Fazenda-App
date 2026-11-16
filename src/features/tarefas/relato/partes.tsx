import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';

/** Botão redondo cinza do canto (voltar). */
export function BotaoVoltar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [styles.voltar, pressed && styles.pressed]}>
      <AppIcon name="arrowLeft" size={22} color={AgroColors.textPrimary} />
    </Pressable>
  );
}

/** Cabeçalho simples das etapas de escolha: voltar e título. */
export function CabecalhoSimples({ titulo, onVoltar }: { titulo: string; onVoltar: () => void }) {
  return (
    <View style={styles.cabecalho}>
      <BotaoVoltar onPress={onVoltar} />
      <Text style={styles.cabecalhoTitulo}>{titulo}</Text>
    </View>
  );
}

export interface LinhaOpcaoProps {
  icone: AppIconName;
  corIcone?: string;
  titulo: string;
  subtitulo?: string | null;
  /** Link verde à direita (ex.: "Ajustar") */
  acao?: { label: string; onPress: () => void };
  /** Chave liga/desliga à direita */
  chave?: { valor: boolean; onChange: (valor: boolean) => void; cor: string };
  /** Linha divisória em cima */
  divisor?: boolean;
}

/** Linha do relato: ícone, título com legenda e uma ação ou chave à direita. */
export function LinhaOpcao({ icone, corIcone, titulo, subtitulo, acao, chave, divisor = true }: LinhaOpcaoProps) {
  return (
    <View style={[styles.linha, divisor && styles.linhaDivisor]}>
      <AppIcon name={icone} size={22} color={corIcone ?? AgroColors.forest} />
      <View style={styles.linhaTextos}>
        <Text style={styles.linhaTitulo} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={styles.linhaSubtitulo} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {acao ? (
        <Pressable
          onPress={acao.onPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${acao.label}: ${titulo}`}
          style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.linhaAcao}>{acao.label}</Text>
        </Pressable>
      ) : null}
      {chave ? (
        <Switch
          value={chave.valor}
          onValueChange={chave.onChange}
          trackColor={{ false: COR_CHAVE_DESLIGADA, true: chave.cor }}
          thumbColor={AgroColors.textInverse}
          accessibilityLabel={titulo}
        />
      ) : null}
    </View>
  );
}

const COR_CHAVE_DESLIGADA = '#CBD5CC';

const styles = StyleSheet.create({
  voltar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.surfaceMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cabecalhoTitulo: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: AgroColors.textPrimary,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  linhaDivisor: {
    borderTopWidth: 1,
    borderTopColor: AgroColors.border,
  },
  linhaTextos: {
    flex: 1,
    gap: 1,
  },
  linhaTitulo: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  linhaSubtitulo: {
    fontSize: 13,
    lineHeight: 17,
    color: AgroColors.textSecondary,
  },
  linhaAcao: {
    fontSize: 15,
    fontWeight: '700',
    color: AgroColors.forest,
  },
});
