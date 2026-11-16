import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, Button } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { useConta } from '@/features/conta/AuthContext';
import { useEstadoSync } from '@/features/sync';

export interface ResumoRegistro {
  titulo: string;
  urgente: boolean;
  local: string | null;
}

export interface EtapaRegistradaProps {
  resumo: ResumoRegistro;
  onVerTarefa: () => void;
  onPronto: () => void;
}

/** Fase 3 do relato: confirmação com o resumo da ocorrência e o aviso de sem internet. */
export function EtapaRegistrada({ resumo, onVerTarefa, onPronto }: EtapaRegistradaProps) {
  const { estado } = useConta();
  const sync = useEstadoSync();
  // Sem conta, os dados ficam só no celular: o aviso de sincronizar não se aplica
  const semInternet = estado === 'logado' && sync === 'sem-internet';

  return (
    <View style={styles.corpo}>
      <View style={styles.selo}>
        <AppIcon name="check" size={32} color={AgroColors.forest} />
      </View>
      <Text style={styles.titulo}>Ocorrência registrada</Text>

      <View style={styles.cartao}>
        <View style={styles.cartaoTopo}>
          <Text style={styles.cartaoTitulo} numberOfLines={2}>
            {resumo.titulo}
          </Text>
          {resumo.urgente ? (
            <View style={styles.urgente}>
              <Text style={styles.urgenteTexto}>Urgente</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cartaoLegenda}>
          {['Aberta', 'ninguém ainda', resumo.local].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {semInternet ? (
        <View style={styles.aviso}>
          <AppIcon name="cloudOff" size={20} color={AgroColors.textSecondary} />
          <Text style={styles.avisoTexto}>Sem internet agora. A equipe recebe quando seu celular sincronizar.</Text>
        </View>
      ) : null}

      <View style={styles.botoes}>
        <Button label="Ver tarefa" variant="outline" size="lg" onPress={onVerTarefa} style={styles.verTarefa} textStyle={styles.verTarefaTexto} />
        <Button label="Pronto" size="lg" onPress={onPronto} style={styles.pronto} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  corpo: {
    gap: Spacing.lg,
    paddingTop: Spacing.md,
  },
  selo: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.forestTint,
  },
  titulo: {
    marginTop: -Spacing.xs,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: AgroColors.textPrimary,
  },
  cartao: {
    gap: Spacing.xs,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
  },
  cartaoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cartaoTitulo: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  urgente: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    backgroundColor: AgroColors.reportOrange,
  },
  urgenteTexto: {
    fontSize: 13,
    fontWeight: '800',
    color: AgroColors.textInverse,
  },
  cartaoLegenda: {
    fontSize: 14,
    lineHeight: 19,
    color: AgroColors.textSecondary,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.surfaceMuted,
  },
  avisoTexto: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: AgroColors.textSecondary,
  },
  botoes: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  verTarefa: {
    flex: 1,
    borderColor: AgroColors.forest,
    borderRadius: Radius.lg,
  },
  verTarefaTexto: {
    color: AgroColors.forest,
  },
  pronto: {
    flex: 1,
    backgroundColor: AgroColors.forest,
    borderRadius: Radius.lg,
  },
});
