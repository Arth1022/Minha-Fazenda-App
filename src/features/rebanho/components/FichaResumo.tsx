import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card, InfoBanner, MilkAmount } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { FichaAnimal, PesoAtual } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { formatDecimal, formatMedida } from '@/utils/formatters';
import { FASE_LABEL, SITUACAO_LEITE_LABEL } from '../services/fase';
import { ResumoLinha } from './ResumoLinha';

/** "+12 kg em 30 dias", ou null quando só há uma pesagem. */
function textoDoGanho(peso: PesoAtual | null): string | null {
  if (peso?.ganhoKg == null || peso.diasDesdeAnterior == null) return null;
  const sinal = peso.ganhoKg > 0 ? '+' : '';
  return `${sinal}${formatDecimal(peso.ganhoKg)} kg em ${peso.diasDesdeAnterior} dias`;
}

export interface FichaResumoProps {
  ficha: FichaAnimal;
  /** Alerta principal do animal (ex.: "Em carência até 12/10") */
  alerta?: string | null;
}

/**
 * Topo da Ficha Animal: perfil (nome, fase, idade, raça), resumo dos números e
 * o alerta. Só exibe: recebe tudo pronto do useFichaAnimal.
 */
export function FichaResumo({ ficha, alerta }: FichaResumoProps) {
  const { animal, fase, idade, situacaoLeite, peso, ultimoParto, podeReproduzir } = ficha;
  const titulo = animal.nome ? `${animal.nome} · ${animal.brinco}` : `Brinco ${animal.brinco}`;
  const subtitulo = [FASE_LABEL[fase], idade, animal.raca].filter(Boolean).join(' · ');
  const ganho = textoDoGanho(peso);

  return (
    <View style={styles.container}>
      <View style={styles.perfil}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>🐮</Text>
        </View>
        <View style={styles.perfilTextos}>
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          <Text style={styles.subtitulo}>{subtitulo}</Text>
        </View>
        {situacaoLeite ? (
          <Badge
            label={SITUACAO_LEITE_LABEL[situacaoLeite]}
            variant={situacaoLeite === 'lactacao' ? 'success' : 'neutral'}
          />
        ) : null}
      </View>

      {alerta ? <InfoBanner message={alerta} /> : null}

      <Card padding="three">
        <View style={styles.lista}>
          <ResumoLinha label="Peso">
            <View style={styles.pesoCol}>
              <Text style={styles.valor}>{formatMedida(peso?.pesoKg ?? null, 'kg', 0)}</Text>
              {ganho ? <Text style={styles.ganho}>{ganho}</Text> : null}
            </View>
          </ResumoLinha>
          {animal.producaoLeiteL !== null ? (
            <ResumoLinha label="Produção de Leite">
              <MilkAmount liters={animal.producaoLeiteL} />
            </ResumoLinha>
          ) : null}
          {animal.racaoKgDia !== null ? (
            <ResumoLinha label="Ração Concentrado">
              {formatMedida(animal.racaoKgDia, 'kg/dia')}
            </ResumoLinha>
          ) : null}
          {podeReproduzir ? (
            <ResumoLinha label="Crias">{ficha.crias.length}</ResumoLinha>
          ) : null}
          {ultimoParto ? (
            <ResumoLinha label="Último parto">{formatDataBR(ultimoParto)}</ResumoLinha>
          ) : null}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AgroColors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  perfilTextos: {
    flex: 1,
    gap: Spacing.half,
  },
  titulo: {
    ...Typography.screenTitle,
  },
  subtitulo: {
    ...Typography.caption,
  },
  lista: {
    gap: Spacing.md,
  },
  pesoCol: {
    alignItems: 'flex-end',
  },
  valor: {
    ...Typography.bodyBold,
  },
  ganho: {
    ...Typography.micro,
    color: AgroColors.primary,
  },
});
