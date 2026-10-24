import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, InfoBanner } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { Lembrete, TipoLembrete } from '@/dtos';
import { diasEntre, formatDiaMes } from '@/utils/date';

const ICONE: Partial<Record<TipoLembrete, string>> = {
  dose: '💊',
  fim_carencia: '⏳',
  parto: '🐄',
};
const ICONE_PADRAO = '🔔';

/** "Hoje", "Amanhã", "Em 5 dias · 12/10". */
function quandoTexto(data: Date): string {
  const dias = diasEntre(new Date(), data);
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `Em ${dias} dias · ${formatDiaMes(data)}`;
}

export interface ProximosCardProps {
  /** Próximos lembretes (quem chama já ordena e corta nos 3 primeiros) */
  lembretes: Lembrete[];
  /** O celular chegou ao limite de lembretes agendados */
  limiteAtingido: boolean;
}

/** Card "Próximos" da ficha: doses, fim de carência e parto previsto. */
export function ProximosCard({ lembretes, limiteAtingido }: ProximosCardProps) {
  return (
    <Card padding="three">
      <View style={styles.lista}>
        <Text style={styles.titulo}>Próximos</Text>

        {limiteAtingido ? (
          <InfoBanner message="Limite de lembretes do celular atingido. Os mais distantes não vão tocar até os próximos passarem." />
        ) : null}

        {lembretes.length === 0 ? (
          <Text style={styles.vazio}>Nada agendado para este animal.</Text>
        ) : (
          lembretes.map((lembrete) => (
            <View key={lembrete.id} style={styles.item}>
              <View style={styles.iconeCircle}>
                <Text style={styles.icone}>{ICONE[lembrete.tipo] ?? ICONE_PADRAO}</Text>
              </View>
              <Text style={styles.itemTitulo} numberOfLines={1}>
                {lembrete.titulo}
              </Text>
              <Text style={styles.quando}>{quandoTexto(lembrete.data)}</Text>
            </View>
          ))
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: Spacing.md,
  },
  titulo: {
    ...Typography.sectionTitle,
  },
  vazio: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconeCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icone: {
    fontSize: 15,
  },
  itemTitulo: {
    ...Typography.bodyMedium,
    color: AgroColors.textPrimary,
    flex: 1,
  },
  quando: {
    ...Typography.captionBold,
    color: AgroColors.primary,
  },
});
