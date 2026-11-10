import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AgroColors, Spacing } from '@/constants/theme';

import { AppIcon } from './AppIcon';

/** Feito (bolinha cheia), atual (anel verde) ou a fazer (anel cinza). */
export type EstadoPasso = 'feito' | 'atual' | 'aFazer';

export interface PassoLinhaDoTempoProps {
  estado: EstadoPasso;
  /** Último passo: sem a linha para o próximo */
  ultimo?: boolean;
  /** Diâmetro da bolinha (a reprodução usa 18; o ciclo da lavoura, 24 com o check) */
  tamanho?: number;
  /** Check branco dentro da bolinha do passo feito */
  comCheck?: boolean;
  children: React.ReactNode;
}

/**
 * Um passo da linha do tempo: a bolinha, a linha até o próximo e o conteúdo ao
 * lado. É o visual da linha do tempo da reprodução do rebanho, reaproveitado no
 * ciclo de plantio da lavoura (RF-040).
 */
export function PassoLinhaDoTempo({
  estado,
  ultimo = false,
  tamanho = 18,
  comCheck = false,
  children,
}: PassoLinhaDoTempoProps) {
  return (
    <View style={styles.passo}>
      <View style={[styles.trilho, { width: tamanho }]}>
        <View
          style={[
            styles.ponto,
            { width: tamanho, height: tamanho, borderRadius: tamanho / 2 },
            estado === 'feito' ? styles.pontoFeito : estado === 'atual' ? styles.pontoAtual : styles.pontoAFazer,
          ]}>
          {estado === 'feito' && comCheck ? (
            <AppIcon name="check" size={Math.round(tamanho * 0.6)} color={AgroColors.textInverse} />
          ) : null}
        </View>
        {!ultimo ? <View style={styles.linha} /> : null}
      </View>
      <View style={[styles.conteudo, !ultimo && styles.espaco]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  passo: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  trilho: {
    alignItems: 'center',
  },
  ponto: {
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pontoFeito: {
    backgroundColor: AgroColors.primary,
  },
  pontoAtual: {
    borderWidth: 3,
    borderColor: AgroColors.primary,
    backgroundColor: AgroColors.cardBg,
  },
  pontoAFazer: {
    borderWidth: 2.5,
    borderColor: AgroColors.textMuted,
    backgroundColor: AgroColors.cardBg,
  },
  linha: {
    flex: 1,
    width: 2,
    marginVertical: Spacing.one,
    backgroundColor: AgroColors.border,
  },
  conteudo: {
    flex: 1,
  },
  espaco: {
    paddingBottom: Spacing.lg,
  },
});
