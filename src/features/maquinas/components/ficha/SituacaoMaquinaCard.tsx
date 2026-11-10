import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FichaCard, IconeRedondo, type AppIconName, type TomFicha } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { Maquina, UsoMaquina } from '@/dtos';
import { CONDICAO_LABEL } from '../../constants';
import { formatarMomento } from '../../services/historico';
import { ehImplemento } from '../../services/padroes';
import type { CondicaoMaquina } from '../../services/registros';
import { horaCurta } from '../../services/uso';
import { TempoDecorrido } from '../TempoDecorrido';

export interface SituacaoMaquinaCardProps {
  maquina: Maquina;
  condicao: CondicaoMaquina;
  /** Uso aberto na máquina (de quem for) */
  usoAberto: UsoMaquina | null;
  /** O uso aberto é de outra pessoa */
  deOutraPessoa: boolean;
  /** Último uso encerrado, para "Último uso: sex, 06/11 às 18:39" */
  ultimoUso: UsoMaquina | null;
  /** Implemento: a máquina em que está engatado agora */
  engatadoEm: string | null;
}

interface Situacao {
  icone: AppIconName;
  tom: TomFicha;
  titulo: string;
  detalhe: string;
  ajuda: string;
}

function situacaoDa({
  maquina,
  condicao,
  usoAberto,
  deOutraPessoa,
  ultimoUso,
  engatadoEm,
}: SituacaoMaquinaCardProps): Situacao {
  const ultimo = ultimoUso?.fim ? `Último uso: ${formatarMomento(ultimoUso.fim)}` : 'Ainda não foi usada';

  if (ehImplemento(maquina)) {
    return {
      icone: 'power',
      tom: engatadoEm ? 'sucesso' : 'neutro',
      titulo: engatadoEm ? 'Em uso' : 'Parado',
      detalhe: engatadoEm ? `Engatado em ${engatadoEm}` : ultimo,
      ajuda: 'Implemento não liga sozinho: escolha-o ao ligar o trator que vai puxá-lo.',
    };
  }

  if (usoAberto) {
    const quem = usoAberto.operador ? `por ${usoAberto.operador} ` : '';
    return {
      icone: 'power',
      tom: 'sucesso',
      titulo: 'Em uso',
      detalhe: `Ligada ${quem}desde ${horaCurta(usoAberto.inicio)}`,
      ajuda: deOutraPessoa
        ? 'Outra pessoa está usando. Se agora é você, toque em Assumir.'
        : 'Toque em Desligar quando terminar de usar.',
    };
  }

  if (condicao === 'inativa') {
    return {
      icone: 'power',
      tom: 'neutro',
      titulo: CONDICAO_LABEL.inativa,
      detalhe: ultimo,
      ajuda: 'Máquina inativa não pode ser ligada.',
    };
  }

  if (condicao !== 'ok') {
    return {
      icone: 'wrench',
      tom: 'saude',
      titulo: CONDICAO_LABEL[condicao],
      detalhe: ultimo,
      ajuda: 'Quando o problema for resolvido, marque abaixo para liberar a máquina.',
    };
  }

  return {
    icone: 'power',
    tom: 'neutro',
    titulo: 'Parada',
    detalhe: ultimo,
    ajuda: 'Toque em Ligar quando começar a usar. O app conta o tempo e, com GPS, os km rodados.',
  };
}

/** Primeiro card do Resumo: a máquina está parada ou em uso, e o que fazer. */
export function SituacaoMaquinaCard(props: SituacaoMaquinaCardProps) {
  const situacao = situacaoDa(props);
  // Cronômetro só da máquina ligada (o implemento não tem uso próprio)
  const ligadaDesde = !ehImplemento(props.maquina) ? (props.usoAberto?.inicio ?? null) : null;

  return (
    <FichaCard>
      <View style={styles.linha}>
        <IconeRedondo nome={situacao.icone} tom={situacao.tom} />
        <View style={styles.textos}>
          <Text style={styles.titulo}>{situacao.titulo}</Text>
          <Text style={styles.detalhe}>{situacao.detalhe}</Text>
        </View>
        {ligadaDesde ? <TempoDecorrido desde={ligadaDesde} style={styles.cronometro} /> : null}
      </View>
      <View style={styles.divisor} />
      <Text style={styles.ajuda}>{situacao.ajuda}</Text>
    </FichaCard>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  titulo: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  detalhe: {
    ...Typography.bodyMedium,
  },
  cronometro: {
    ...Typography.metricLarge,
    color: AgroColors.primaryDark,
  },
  divisor: {
    height: 1,
    backgroundColor: AgroColors.border,
  },
  ajuda: {
    ...Typography.body,
    color: AgroColors.textSecondary,
  },
});
