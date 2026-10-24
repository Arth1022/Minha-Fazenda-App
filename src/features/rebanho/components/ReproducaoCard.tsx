import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { Animal, Reproducao, ReproducaoFicha } from '@/dtos';
import { diasEntre, formatDataBR } from '@/utils/date';
import { SEM_VALOR } from '@/utils/formatters';
import { ResumoLinha } from './ResumoLinha';

const TIPO_LABEL: Record<Reproducao['tipo'], string> = {
  cobertura: 'Monta natural',
  inseminacao: 'Inseminação',
};

/** Touro da fazenda (brinco/nome) ou o texto de fora/sêmen. */
function nomeDoTouro(cobertura: Reproducao, touros: Animal[]): string {
  const touro = touros.find((animal) => animal.id === cobertura.touroId);
  if (touro) return touro.nome ? `${touro.nome} · ${touro.brinco}` : touro.brinco;
  return cobertura.touroDescricao ?? SEM_VALOR;
}

/** "12/12/2026 (em 40 dias)", "Hoje" ou "(há 3 dias)" se já passou. */
function textoDaPrevisao(previsao: Date): string {
  const dias = diasEntre(new Date(), previsao);
  if (dias === 0) return `${formatDataBR(previsao)} (hoje)`;
  return dias > 0
    ? `${formatDataBR(previsao)} (em ${dias} dias)`
    : `${formatDataBR(previsao)} (há ${-dias} dias)`;
}

export interface ReproducaoCardProps {
  reproducao: ReproducaoFicha;
  ultimoParto: Date | null;
  /** Machos do rebanho, para mostrar o nome do touro da cobertura */
  touros: Animal[];
  onConfirmarPrenhez: (coberturaId: string, prenhe: boolean) => void;
}

/**
 * Card "Reprodução" da ficha (só novilha/vaca): a cobertura em aberto, a
 * previsão de parto e a confirmação de prenhez. Só exibe; a ficha grava.
 */
export function ReproducaoCard({
  reproducao,
  ultimoParto,
  touros,
  onConfirmarPrenhez,
}: ReproducaoCardProps) {
  const { coberturaAberta, previsaoParto } = reproducao;

  return (
    <Card padding="three">
      <View style={styles.lista}>
        <Text style={styles.titulo}>Reprodução</Text>

        {coberturaAberta ? (
          <>
            <ResumoLinha label={TIPO_LABEL[coberturaAberta.tipo]}>
              {formatDataBR(coberturaAberta.data)}
            </ResumoLinha>
            <ResumoLinha label="Touro">{nomeDoTouro(coberturaAberta, touros)}</ResumoLinha>
            {previsaoParto ? (
              <ResumoLinha label="Previsão de parto">{textoDaPrevisao(previsaoParto)}</ResumoLinha>
            ) : null}
            <ResumoLinha label="Prenhez">
              {coberturaAberta.prenhezConfirmada ? 'Confirmada' : 'A confirmar'}
            </ResumoLinha>

            {coberturaAberta.prenhezConfirmada == null ? (
              <View style={styles.acoes}>
                <Button
                  label="Está prenhe"
                  variant="outline"
                  size="sm"
                  onPress={() => onConfirmarPrenhez(coberturaAberta.id, true)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Não pegou"
                  variant="ghost"
                  size="sm"
                  onPress={() => onConfirmarPrenhez(coberturaAberta.id, false)}
                  style={{ flex: 1 }}
                />
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.vazio}>Nenhuma cobertura em aberto.</Text>
        )}

        {ultimoParto ? (
          <ResumoLinha label="Último parto">{formatDataBR(ultimoParto)}</ResumoLinha>
        ) : null}
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
  acoes: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  vazio: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
});
