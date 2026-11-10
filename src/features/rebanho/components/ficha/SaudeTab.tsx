import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Button, FichaCard, IconeRedondo } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import type { DiaDaTrilha, Tratamento, TratamentoAtivo } from '@/dtos';
import { formatDiaMes, inicioDoDia } from '@/utils/date';
import {
  doseDeHojePendente,
  textoDaDose,
  textoDaProximaDose,
  textoDoPeriodo,
  textoDoProgresso,
} from '../../services/ficha';

/** Acima disso a barra vira contínua (segmentos ficariam finos demais para tocar). */
const MAX_SEGMENTOS = 31;

export interface SaudeTabProps {
  ativos: TratamentoAtivo[];
  /** Tratamento com uma dose sendo gravada */
  aplicando: string | null;
  onAplicar: (ativo: TratamentoAtivo) => void;
  /** Toque num dia que já chegou: marca ou desmarca a dose daquele dia */
  onAlternarDia: (ativo: TratamentoAtivo, dia: DiaDaTrilha) => void;
  onEditar: (tratamento: Tratamento) => void;
}

/** Aba Saúde: tratamentos e vacinas em andamento. */
export function SaudeTab({ ativos, aplicando, onAplicar, onAlternarDia, onEditar }: SaudeTabProps) {
  return (
    <View style={styles.coluna}>
      <View style={styles.secaoTitulo}>
        <Text style={styles.secaoTexto}>Tratamentos em andamento</Text>
        {ativos.length > 0 ? (
          <View style={styles.contador}>
            <Text style={styles.contadorTexto}>{ativos.length}</Text>
          </View>
        ) : null}
      </View>

      {ativos.length === 0 ? (
        <FichaCard>
          <Text style={styles.vazio}>
            Nenhum tratamento em andamento. Use “Registrar” para lançar um remédio ou vacina.
          </Text>
        </FichaCard>
      ) : (
        ativos.map((ativo) => (
          <TratamentoCard
            key={ativo.tratamento.id}
            ativo={ativo}
            aplicando={aplicando === ativo.tratamento.id}
            onAplicar={() => onAplicar(ativo)}
            onAlternarDia={(dia) => onAlternarDia(ativo, dia)}
            onEditar={() => onEditar(ativo.tratamento)}
          />
        ))
      )}
    </View>
  );
}

interface TratamentoCardProps {
  ativo: TratamentoAtivo;
  aplicando: boolean;
  onAplicar: () => void;
  onAlternarDia: (dia: DiaDaTrilha) => void;
  onEditar: () => void;
}

function TratamentoCard({ ativo, aplicando, onAplicar, onAlternarDia, onEditar }: TratamentoCardProps) {
  const { tratamento, proximaDose, hoje } = ativo;
  const dose = textoDaDose(ativo);
  const podeAplicar = doseDeHojePendente(ativo);

  return (
    <FichaCard>
      <View style={styles.topo}>
        <IconeRedondo nome="syringe" tom="saude" />
        <View style={styles.topoTextos}>
          <Text style={styles.medicamento} numberOfLines={2}>
            {tratamento.medicamento}
          </Text>
          {dose ? <Text style={styles.dose}>{dose}</Text> : null}
        </View>
        <Pressable
          onPress={onEditar}
          hitSlop={10}
          style={({ pressed }) => [styles.editar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${tratamento.medicamento}`}>
          <AppIcon name="edit" size={IconSize.lg} color={AgroColors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.progresso}>
        <View style={styles.progressoLinha}>
          <Text style={styles.progressoTexto}>{textoDoProgresso(ativo)}</Text>
          <Text style={styles.periodo}>{textoDoPeriodo(tratamento)}</Text>
        </View>
        <BarraDeDias ativo={ativo} onAlternarDia={onAlternarDia} />
      </View>

      <View style={styles.proxima}>
        <AppIcon name="clock" size={24} color={AgroColors.primary} />
        <View style={styles.proximaTextos}>
          <Text style={styles.proximaRotulo}>Próxima dose</Text>
          <Text style={styles.proximaValor}>
            {proximaDose ? textoDaProximaDose(proximaDose) : 'Todas as doses aplicadas'}
          </Text>
        </View>
        {podeAplicar ? <Button label="Aplicar" onPress={onAplicar} loading={aplicando} /> : null}
      </View>

      {hoje?.confirmado ? (
        <View style={styles.aplicada}>
          <AppIcon name="check" size={IconSize.md} color={AgroColors.primary} />
          <Text style={styles.aplicadaTexto}>Dose de hoje aplicada</Text>
          <Pressable
            onPress={() => onAlternarDia(hoje)}
            disabled={aplicando}
            hitSlop={8}
            accessibilityRole="button">
            <Text style={styles.desfazer}>Desfazer</Text>
          </Pressable>
        </View>
      ) : null}
    </FichaCard>
  );
}

/**
 * Um segmento por dia de dose: laranja forte = aplicada ou hoje, laranja claro =
 * dia que passou sem registro, cinza = ainda vai chegar. Tocar num dia que já
 * chegou marca ou desmarca a dose.
 */
function BarraDeDias({
  ativo,
  onAlternarDia,
}: {
  ativo: TratamentoAtivo;
  onAlternarDia: (dia: DiaDaTrilha) => void;
}) {
  const { trilha } = ativo;
  const hoje = inicioDoDia(new Date()).getTime();

  if (trilha.length > MAX_SEGMENTOS || !ativo.tratamento.dataFim) {
    // Tratamento longo ou contínuo: barra única com a parte aplicada
    const total = ativo.tratamento.dataFim ? trilha.length : 0;
    const aplicadas = trilha.filter((d) => d.confirmado).length;
    if (total === 0) return null;
    return (
      <View style={styles.barraUnica}>
        <View style={[styles.barraUnicaCheia, { width: `${(aplicadas / total) * 100}%` }]} />
      </View>
    );
  }

  return (
    <View style={styles.segmentos}>
      {trilha.map((d) => {
        const ehHoje = d.dia.getTime() === hoje;
        const estilo = d.confirmado || ehHoje
          ? styles.segmentoForte
          : d.futuro
            ? styles.segmentoFuturo
            : styles.segmentoPerdido;
        return (
          <Pressable
            key={d.indice}
            onPress={() => onAlternarDia(d)}
            disabled={d.futuro}
            hitSlop={{ top: 10, bottom: 10 }}
            style={[styles.segmento, estilo]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: d.confirmado, disabled: d.futuro }}
            accessibilityLabel={`Dose de ${formatDiaMes(d.dia)}`}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
  secaoTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  secaoTexto: {
    ...Typography.sectionTitle,
    color: AgroColors.textSecondary,
  },
  contador: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.healthBg,
  },
  contadorTexto: {
    fontSize: 13,
    fontWeight: '800',
    color: AgroColors.health,
  },
  vazio: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  topoTextos: {
    flex: 1,
    gap: Spacing.half,
  },
  medicamento: {
    ...Typography.sectionTitle,
    fontSize: 18,
    lineHeight: 24,
  },
  dose: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  editar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  progresso: {
    gap: Spacing.two,
  },
  progressoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  progressoTexto: {
    ...Typography.bodyBold,
  },
  periodo: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  segmentos: {
    flexDirection: 'row',
    gap: 4,
  },
  segmento: {
    flex: 1,
    height: 8,
    borderRadius: 3,
  },
  segmentoForte: {
    backgroundColor: AgroColors.healthProgress,
  },
  segmentoPerdido: {
    backgroundColor: AgroColors.warningBorder,
  },
  segmentoFuturo: {
    backgroundColor: AgroColors.border,
  },
  barraUnica: {
    height: 8,
    borderRadius: 4,
    backgroundColor: AgroColors.border,
    overflow: 'hidden',
  },
  barraUnicaCheia: {
    height: '100%',
    backgroundColor: AgroColors.healthProgress,
  },
  proxima: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.screenBg,
  },
  proximaTextos: {
    flex: 1,
    gap: Spacing.half,
  },
  proximaRotulo: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
  proximaValor: {
    ...Typography.bodyBold,
    fontSize: 17,
    lineHeight: 22,
  },
  aplicada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  aplicadaTexto: {
    ...Typography.bodyMedium,
    color: AgroColors.primary,
    flex: 1,
  },
  desfazer: {
    ...Typography.bodyBold,
    color: AgroColors.textSecondary,
    textDecorationLine: 'underline',
  },
});
