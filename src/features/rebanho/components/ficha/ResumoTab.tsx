import React, { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Button, InfoBanner } from '@/components/ui';
import { AgroColors, IconSize, Spacing, Typography } from '@/constants/theme';
import type { FichaAnimal, TratamentoAtivo } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { formatDecimal, formatMedida } from '@/utils/formatters';
import {
  SITUACAO_REPRODUTIVA_LABEL,
  TIPO_REPRODUCAO_LABEL,
  situacaoReprodutiva,
  textoDaVariacao,
  textoEmDias,
  type DoseParaHoje,
  type SituacaoReprodutiva,
} from '../../services/ficha';
import { historicoDePeso } from '../../services/indicadores';
import { Chip, FichaCard, IconeRedondo, type TomFicha } from './elementos';

export const TOM_DA_SITUACAO: Record<SituacaoReprodutiva, TomFicha> = {
  vazia: 'neutro',
  aConfirmar: 'reproducao',
  prenhe: 'sucesso',
};

export interface ResumoTabProps {
  ficha: FichaAnimal;
  dosesHoje: DoseParaHoje[];
  /** Tratamento com a dose sendo gravada (desabilita o botão) */
  aplicando: string | null;
  onAplicar: (ativo: TratamentoAtivo) => void;
  onRegistrarPeso: () => void;
  /** Abre o histórico de pesagens com as métricas */
  onVerPesagens: () => void;
  /** Abre a lista de crias (cada uma leva à ficha dela) */
  onVerCrias: () => void;
  onVerReproducao: () => void;
}

/** Aba Resumo: o alerta, o que fazer hoje, peso, crias e a reprodução em andamento. */
export function ResumoTab({
  ficha,
  dosesHoje,
  aplicando,
  onAplicar,
  onRegistrarPeso,
  onVerPesagens,
  onVerCrias,
  onVerReproducao,
}: ResumoTabProps) {
  const { animal, peso, podeReproduzir } = ficha;
  // Métricas do período todo (primeira à última pesagem), não só a última variação
  const { ganhoTotalKg, periodoDias, gmdKg } = historicoDePeso(ficha.pesagens);
  const temCrias = ficha.crias.length > 0 || animal.criasAnteriores > 0;

  return (
    <View style={styles.coluna}>
      {/* Alerta mais importante do animal (carência, dose, parto ou novilha) */}
      {ficha.alerta ? <InfoBanner message={ficha.alerta.texto} /> : null}

      {dosesHoje.length > 0 ? (
        <FichaCard>
          <View style={styles.cabecalho}>
            <Text style={styles.tituloCard}>Para hoje</Text>
            <Chip
              tom="saude"
              label={dosesHoje.length === 1 ? '1 pendente' : `${dosesHoje.length} pendentes`}
            />
          </View>
          {dosesHoje.map(({ ativo, detalhe }) => (
            <Fragment key={ativo.tratamento.id}>
              <View style={styles.divisor} />
              <View style={styles.doseLinha}>
                <IconeRedondo nome="syringe" tom="saude" />
                <View style={styles.doseTextos}>
                  <Text style={styles.doseTitulo} numberOfLines={1}>
                    {ativo.tratamento.medicamento}
                  </Text>
                  <Text style={styles.doseDetalhe}>{detalhe}</Text>
                </View>
                <Button
                  label="Aplicar"
                  onPress={() => onAplicar(ativo)}
                  loading={aplicando === ativo.tratamento.id}
                />
              </View>
            </Fragment>
          ))}
        </FichaCard>
      ) : null}

      <View style={styles.linha}>
        <FichaCard style={styles.metade}>
          <Pressable
            onPress={onVerPesagens}
            disabled={!peso}
            style={({ pressed }) => [styles.metrica, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Ver pesagens">
            <View style={styles.rotuloLinha}>
              <Text style={styles.metricaRotulo}>Peso</Text>
              {peso ? (
                <AppIcon name="chevronRight" size={IconSize.md} color={AgroColors.textMuted} />
              ) : null}
            </View>
            <Text style={peso ? styles.metricaValor : styles.metricaVazia}>
              {peso ? formatMedida(peso.pesoKg, 'kg', 0) : 'Sem pesagem'}
            </Text>
            {gmdKg !== null ? (
              <Text style={styles.ganho}>GMD {formatDecimal(gmdKg, 2)} kg/dia</Text>
            ) : null}
            {ganhoTotalKg !== null && periodoDias !== null ? (
              <Text style={styles.metricaDetalhe}>
                {textoDaVariacao(ganhoTotalKg, periodoDias)}
              </Text>
            ) : peso ? (
              <Text style={styles.metricaDetalhe}>Pesado em {formatDataBR(peso.data)}</Text>
            ) : null}
          </Pressable>
          <Pressable
            onPress={onRegistrarPeso}
            hitSlop={8}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            accessibilityRole="button">
            <AppIcon name="plus" size={IconSize.lg} color={AgroColors.primary} />
            <Text style={styles.linkTexto}>Registrar peso</Text>
          </Pressable>
        </FichaCard>

        {podeReproduzir ? (
          <FichaCard style={styles.metade}>
            <Pressable
              onPress={onVerCrias}
              disabled={!temCrias}
              style={({ pressed }) => [styles.metrica, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Ver crias">
              <View style={styles.rotuloLinha}>
                <Text style={styles.metricaRotulo}>Crias</Text>
                {temCrias ? (
                  <AppIcon name="chevronRight" size={IconSize.md} color={AgroColors.textMuted} />
                ) : null}
              </View>
              <Text style={styles.metricaNumero}>{ficha.totalCrias}</Text>
              <Text style={styles.metricaDetalhe}>
                {ficha.ultimoParto
                  ? `Último parto ${formatDataBR(ficha.ultimoParto)}`
                  : ficha.totalCrias > 0
                    ? 'Antes de entrar no app'
                    : 'Nenhuma registrada'}
              </Text>
            </Pressable>
          </FichaCard>
        ) : null}
      </View>

      {animal.producaoLeiteL !== null || animal.racaoKgDia !== null ? (
        <View style={styles.linha}>
          {animal.producaoLeiteL !== null ? (
            <FichaCard style={styles.metade}>
              <View style={styles.metrica}>
                <Text style={styles.metricaRotulo}>Leite</Text>
                <Text style={styles.metricaValor}>{formatMedida(animal.producaoLeiteL, 'L/dia')}</Text>
              </View>
            </FichaCard>
          ) : null}
          {animal.racaoKgDia !== null ? (
            <FichaCard style={styles.metade}>
              <View style={styles.metrica}>
                <Text style={styles.metricaRotulo}>Ração concentrado</Text>
                <Text style={styles.metricaValor}>{formatMedida(animal.racaoKgDia, 'kg/dia')}</Text>
              </View>
            </FichaCard>
          ) : null}
        </View>
      ) : null}

      {podeReproduzir ? (
        <ReproducaoResumoCard ficha={ficha} onVerReproducao={onVerReproducao} />
      ) : null}
    </View>
  );
}

/** Card "Reprodução" do Resumo: cobertura → diagnóstico → parto previsto. */
function ReproducaoResumoCard({
  ficha,
  onVerReproducao,
}: {
  ficha: FichaAnimal;
  onVerReproducao: () => void;
}) {
  const { coberturaAberta, previsaoParto } = ficha.reproducao;
  const situacao = situacaoReprodutiva(ficha.reproducao);

  return (
    <FichaCard>
      <View style={styles.cabecalho}>
        <Text style={styles.tituloCard}>Reprodução</Text>
        <Chip tom={TOM_DA_SITUACAO[situacao]} label={SITUACAO_REPRODUTIVA_LABEL[situacao]} />
      </View>

      {coberturaAberta ? (
        <View style={styles.etapas}>
          <Etapa
            feita
            rotulo={TIPO_REPRODUCAO_LABEL[coberturaAberta.tipo]}
            valor={formatDataBR(coberturaAberta.data)}
          />
          <Etapa
            feita={coberturaAberta.prenhezConfirmada === true}
            rotulo="Diagnóstico"
            valor={coberturaAberta.prenhezConfirmada ? 'Prenhe' : 'Pendente'}
          />
          <Etapa
            feita={false}
            rotulo="Parto previsto"
            valor={previsaoParto ? formatDataBR(previsaoParto) : '—'}
            detalhe={previsaoParto ? textoEmDias(previsaoParto) : undefined}
          />
        </View>
      ) : (
        <Text style={styles.vazio}>
          {ficha.ultimoParto
            ? `Nenhuma cobertura em aberto. Último parto em ${formatDataBR(ficha.ultimoParto)}.`
            : 'Nenhuma cobertura em aberto.'}
        </Text>
      )}

      <View style={styles.divisor} />
      <Pressable
        onPress={onVerReproducao}
        style={({ pressed }) => [styles.verMais, pressed && styles.pressed]}
        accessibilityRole="button">
        <Text style={styles.linkTexto}>Ver reprodução</Text>
        <AppIcon name="chevronRight" size={IconSize.lg} color={AgroColors.primary} />
      </Pressable>
    </FichaCard>
  );
}

function Etapa({
  feita,
  rotulo,
  valor,
  detalhe,
}: {
  feita: boolean;
  rotulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <View style={styles.etapa}>
      <View style={[styles.etapaBarra, feita && styles.etapaBarraFeita]} />
      <Text style={styles.etapaRotulo}>{rotulo}</Text>
      <Text style={styles.etapaValor}>{valor}</Text>
      {detalhe ? <Text style={styles.etapaDetalhe}>{detalhe}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  tituloCard: {
    ...Typography.sectionTitle,
    fontSize: 18,
    lineHeight: 24,
  },
  divisor: {
    height: 1,
    backgroundColor: AgroColors.border,
  },
  doseLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  doseTextos: {
    flex: 1,
    gap: Spacing.half,
  },
  doseTitulo: {
    ...Typography.bodyBold,
    fontSize: 16,
    lineHeight: 22,
  },
  doseDetalhe: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  linha: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metade: {
    flex: 1,
    justifyContent: 'space-between',
  },
  metrica: {
    gap: Spacing.one,
  },
  rotuloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricaRotulo: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  metricaValor: {
    ...Typography.metricLarge,
    fontSize: 22,
    lineHeight: 28,
  },
  metricaVazia: {
    ...Typography.metricLarge,
    fontSize: 20,
    lineHeight: 26,
    color: AgroColors.textSecondary,
  },
  metricaNumero: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: AgroColors.textPrimary,
  },
  metricaDetalhe: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  ganho: {
    ...Typography.micro,
    color: AgroColors.primary,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  linkTexto: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: AgroColors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  etapas: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  etapa: {
    flex: 1,
    gap: Spacing.one,
  },
  etapaBarra: {
    height: 4,
    borderRadius: 2,
    backgroundColor: AgroColors.borderStrong,
    marginBottom: Spacing.two,
  },
  etapaBarraFeita: {
    backgroundColor: AgroColors.primary,
  },
  etapaRotulo: {
    ...Typography.caption,
    fontSize: 13,
    color: AgroColors.textMuted,
  },
  etapaValor: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  etapaDetalhe: {
    ...Typography.caption,
    fontSize: 13,
    color: AgroColors.textMuted,
  },
  vazio: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  verMais: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
