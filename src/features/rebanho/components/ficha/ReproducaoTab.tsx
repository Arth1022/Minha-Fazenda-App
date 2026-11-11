import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Button, FichaCard, PassoLinhaDoTempo } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import type { Animal, FichaAnimal } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import {
  SITUACAO_REPRODUTIVA_LABEL,
  TIPO_REPRODUCAO_LABEL,
  linhaDoTempoReprodutiva,
  situacaoReprodutiva,
  textoEmDias,
  type SituacaoReprodutiva,
} from '../../services/ficha';

const COR_DA_SITUACAO: Record<SituacaoReprodutiva, string> = {
  vazia: AgroColors.textSecondary,
  aConfirmar: AgroColors.breeding,
  prenhe: AgroColors.primary,
};

export interface ReproducaoTabProps {
  ficha: FichaAnimal;
  /** Machos do rebanho, para o nome do touro */
  touros: Animal[];
  /** Diagnóstico gravando (desabilita os botões) */
  salvando: boolean;
  onDiagnostico: (coberturaId: string, prenhe: boolean) => void;
  onInformarTouro: (coberturaId: string) => void;
  onRegistrarCobertura: () => void;
}

/** Aba Reprodução: situação atual, resultado do diagnóstico e linha do tempo. */
export function ReproducaoTab({
  ficha,
  touros,
  salvando,
  onDiagnostico,
  onInformarTouro,
  onRegistrarCobertura,
}: ReproducaoTabProps) {
  const { coberturaAberta, previsaoParto } = ficha.reproducao;
  const situacao = situacaoReprodutiva(ficha.reproducao);
  const eventos = linhaDoTempoReprodutiva({
    reproducao: ficha.reproducao,
    reproducoes: ficha.reproducoes,
    crias: ficha.crias,
    touros,
  });

  let detalhe: string;
  if (coberturaAberta) {
    detalhe = `${TIPO_REPRODUCAO_LABEL[coberturaAberta.tipo]} em ${formatDataBR(coberturaAberta.data)}`;
    if (situacao === 'prenhe' && previsaoParto) {
      detalhe += ` · parto previsto ${formatDataBR(previsaoParto)} (${textoEmDias(previsaoParto)})`;
    }
  } else {
    detalhe = ficha.ultimoParto
      ? `Nenhuma cobertura em aberto · último parto em ${formatDataBR(ficha.ultimoParto)}`
      : 'Nenhuma cobertura em aberto';
  }

  return (
    <View style={styles.coluna}>
      <FichaCard>
        <View style={styles.situacao}>
          <Text style={styles.rotulo}>Situação atual</Text>
          <Text style={[styles.situacaoTexto, { color: COR_DA_SITUACAO[situacao] }]}>
            {SITUACAO_REPRODUTIVA_LABEL[situacao]}
          </Text>
          <Text style={styles.detalhe}>{detalhe}</Text>
        </View>

        {coberturaAberta && coberturaAberta.prenhezConfirmada == null ? (
          <View style={styles.diagnostico}>
            <Text style={styles.diagnosticoTitulo}>Resultado do diagnóstico</Text>
            <View style={styles.botoes}>
              <Pressable
                onPress={() => onDiagnostico(coberturaAberta.id, true)}
                disabled={salvando}
                style={({ pressed }) => [styles.botao, styles.botaoSim, pressed && styles.pressed]}
                accessibilityRole="button">
                <AppIcon name="check" size={IconSize.lg} color={AgroColors.primary} />
                <Text style={[styles.botaoTexto, styles.botaoTextoSim]}>Está prenhe</Text>
              </Pressable>
              <Pressable
                onPress={() => onDiagnostico(coberturaAberta.id, false)}
                disabled={salvando}
                style={({ pressed }) => [styles.botao, styles.botaoNao, pressed && styles.pressed]}
                accessibilityRole="button">
                <AppIcon name="x" size={IconSize.lg} color={AgroColors.textSecondary} />
                <Text style={styles.botaoTexto}>Não pegou</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {!coberturaAberta ? (
          <Button
            label="Registrar cobertura"
            variant="outline"
            fullWidth
            onPress={onRegistrarCobertura}
          />
        ) : null}
      </FichaCard>

      {eventos.length > 0 ? (
        <FichaCard>
          <Text style={styles.tituloCard}>Linha do tempo</Text>
          <View>
            {eventos.map((evento, index) => {
              const ultimo = index === eventos.length - 1;
              const coberturaSemTouro = evento.informarTouroDe;
              return (
                <PassoLinhaDoTempo key={evento.chave} estado={evento.feito ? 'feito' : 'aFazer'} ultimo={ultimo}>
                  <View style={styles.eventoTextos}>
                    <Text style={styles.eventoRotulo}>{evento.rotulo}</Text>
                    <Text style={styles.eventoTitulo}>{evento.titulo}</Text>
                    {evento.detalhe ? (
                      <View style={styles.eventoDetalheLinha}>
                        <Text style={styles.eventoDetalhe}>{evento.detalhe}</Text>
                        {coberturaSemTouro ? (
                          <Pressable
                            onPress={() => onInformarTouro(coberturaSemTouro)}
                            hitSlop={8}
                            accessibilityRole="button">
                            <Text style={styles.informar}>Informar</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </PassoLinhaDoTempo>
              );
            })}
          </View>
        </FichaCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
  situacao: {
    gap: Spacing.one,
  },
  rotulo: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  situacaoTexto: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  detalhe: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  diagnostico: {
    gap: Spacing.sm,
  },
  diagnosticoTitulo: {
    ...Typography.bodyBold,
    color: AgroColors.textSecondary,
  },
  botoes: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  botao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    backgroundColor: AgroColors.cardBg,
  },
  botaoSim: {
    borderColor: AgroColors.primary,
  },
  botaoNao: {
    borderColor: AgroColors.borderStrong,
  },
  botaoTexto: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: AgroColors.textSecondary,
  },
  botaoTextoSim: {
    color: AgroColors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  tituloCard: {
    ...Typography.sectionTitle,
    fontSize: 18,
    lineHeight: 24,
  },
  eventoTextos: {
    flex: 1,
    gap: Spacing.half,
  },
  eventoRotulo: {
    ...Typography.caption,
    fontSize: 13,
    color: AgroColors.textMuted,
  },
  eventoTitulo: {
    ...Typography.bodyBold,
    fontSize: 16,
    lineHeight: 22,
  },
  eventoDetalheLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  eventoDetalhe: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
    flexShrink: 1,
  },
  informar: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: AgroColors.primary,
  },
});
