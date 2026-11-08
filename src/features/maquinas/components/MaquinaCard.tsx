import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { MaquinaComUso } from '@/dtos';
import { STATUS_MAQUINA_LABEL, TIPO_MAQUINA_LABEL } from '../constants';
import { BotaoLigarMaquina } from './BotaoLigarMaquina';
import { MaquinaAvatar } from './MaquinaAvatar';
import { TempoDecorrido } from './TempoDecorrido';

export interface MaquinaCardProps {
  maquina: MaquinaComUso;
  /** Abre a ficha (recebe a máquina: o pai passa uma função estável) */
  onAbrir: (maquina: MaquinaComUso) => void;
  /** Botão de liga/desliga: liga a máquina parada ou desliga a que está em uso */
  onCodigoPress: (maquina: MaquinaComUso) => void;
  /** Gravando o uso desta máquina */
  ocupada?: boolean;
}

/** "Massey Ferguson · MF 4275", ou o tipo quando não há marca/modelo. */
function descricao(maquina: MaquinaComUso): string {
  const marcaModelo = [maquina.marca, maquina.modelo].filter(Boolean).join(' · ');
  return marcaModelo || TIPO_MAQUINA_LABEL[maquina.tipo];
}

/**
 * Cartão da máquina na lista: avatar, nome e marca, situação (parada ou em uso,
 * com cronômetro) e o botão de liga/desliga. Em uso, mostra também o botão Desligar.
 */
export const MaquinaCard = React.memo(function MaquinaCard({
  maquina,
  onAbrir,
  onCodigoPress,
  ocupada = false,
}: MaquinaCardProps) {
  const { usoAtual } = maquina;
  const inativa = maquina.status === 'inativa';
  const abrir = () => onAbrir(maquina);
  const alternarUso = () => onCodigoPress(maquina);

  return (
    <Card padding="md" onPress={abrir} variant={usoAtual ? 'selected' : 'default'}>
      <View style={styles.row}>
        <MaquinaAvatar tipo={maquina.tipo} marca={maquina.marca} />

        <View style={styles.infoCol}>
          <Text style={styles.nome} numberOfLines={1}>
            {maquina.nome}
          </Text>
          <Text style={styles.descricao} numberOfLines={1}>
            {descricao(maquina)}
          </Text>

          {usoAtual ? (
            <View style={styles.situacao}>
              <View style={[styles.ponto, styles.pontoEmUso]} />
              <Text style={styles.emUso}>Em uso · </Text>
              <TempoDecorrido desde={usoAtual.inicio} style={styles.emUso} />
            </View>
          ) : (
            <View style={styles.situacao}>
              <View style={[styles.ponto, maquina.status === 'manutencao' && styles.pontoAlerta]} />
              <Text style={[styles.parada, maquina.status === 'manutencao' && styles.alerta]}>
                {maquina.status === 'ativa' ? 'Parada' : STATUS_MAQUINA_LABEL[maquina.status]}
              </Text>
            </View>
          )}
        </View>

        <BotaoLigarMaquina
          nome={maquina.nome}
          emUso={usoAtual !== null}
          onPress={alternarUso}
          disabled={inativa && !usoAtual}
          loading={ocupada}
        />
      </View>

      {usoAtual ? (
        <Button label="Desligar" variant="danger" size="sm" fullWidth onPress={alternarUso} disabled={ocupada} />
      ) : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoCol: {
    flex: 1,
    gap: Spacing.half,
  },
  nome: {
    ...Typography.bodyBold,
  },
  descricao: {
    ...Typography.caption,
    fontWeight: '400',
  },
  situacao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.half,
  },
  ponto: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: Spacing.xs,
    backgroundColor: AgroColors.textPlaceholder,
  },
  pontoEmUso: {
    backgroundColor: AgroColors.primaryLight,
  },
  pontoAlerta: {
    backgroundColor: AgroColors.warning,
  },
  emUso: {
    ...Typography.captionBold,
    color: AgroColors.primary,
  },
  parada: {
    ...Typography.caption,
  },
  alerta: {
    color: AgroColors.warning,
  },
});
