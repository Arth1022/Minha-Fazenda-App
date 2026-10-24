import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import { formatDataBR } from '@/utils/date';

// TODO(B1): trocar pelo EventoTimeline de @/dtos quando o back-end publicar
export interface EventoLinhaDoTempo {
  tipo: string;
  data: Date;
  titulo: string;
  detalhe?: string;
}

const ICONE: Record<string, string> = {
  pesagem: '⚖',
  cobertura: '🐂',
  parto: '🐄',
  tratamento: '💊',
  saida: '🚪',
};
const ICONE_PADRAO = '•';

export interface LinhaDoTempoProps {
  /** Eventos do animal, do mais recente para o mais antigo */
  eventos: EventoLinhaDoTempo[];
}

/** Histórico da ficha: pesagens, coberturas, partos e tratamentos numa linha só. */
export function LinhaDoTempo({ eventos }: LinhaDoTempoProps) {
  return (
    <Card padding="three">
      <View style={styles.lista}>
        <Text style={styles.titulo}>Histórico</Text>

        {eventos.length === 0 ? (
          <Text style={styles.vazio}>Nenhum registro ainda.</Text>
        ) : (
          eventos.map((evento, index) => (
            <View key={`${evento.tipo}-${evento.data.getTime()}-${index}`} style={styles.item}>
              <View style={styles.trilho}>
                <View style={styles.iconeCircle}>
                  <Text style={styles.icone}>{ICONE[evento.tipo] ?? ICONE_PADRAO}</Text>
                </View>
                {index < eventos.length - 1 ? <View style={styles.linha} /> : null}
              </View>
              <View style={styles.textos}>
                <Text style={styles.data}>{formatDataBR(evento.data)}</Text>
                <Text style={styles.itemTitulo}>{evento.titulo}</Text>
                {evento.detalhe ? <Text style={styles.detalhe}>{evento.detalhe}</Text> : null}
              </View>
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
    gap: Spacing.sm,
  },
  trilho: {
    alignItems: 'center',
  },
  iconeCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icone: {
    fontSize: 13,
  },
  linha: {
    flex: 1,
    width: 2,
    marginTop: Spacing.one,
    backgroundColor: AgroColors.mintBorder,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
    paddingBottom: Spacing.two,
  },
  data: {
    ...Typography.micro,
  },
  itemTitulo: {
    ...Typography.bodyBold,
  },
  detalhe: {
    ...Typography.caption,
  },
});
