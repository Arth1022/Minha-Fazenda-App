import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FormModal } from '@/components/forms';
import { Button } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { MaquinaComUso } from '@/dtos';
import { STATUS_MAQUINA_LABEL, TIPO_MAQUINA_LABEL } from '../constants';
import { useControleUso } from '../hooks/useControleUso';
import { useMaquinaComUso } from '../hooks/useMaquinaComUso';
import { MaquinaAvatar } from './MaquinaAvatar';
import { TempoDecorrido } from './TempoDecorrido';

export interface AcoesMaquinaModalProps {
  /** Máquina lida no QR Code; null fecha o modal */
  maquinaId: string | null;
  onClose: () => void;
}

/**
 * Opções da máquina lida no QR Code: ligar (ou desligar, se já está em uso) e
 * visualizar a ficha. O modal acompanha a máquina ao vivo: ao ligar, já mostra o
 * cronômetro, que serve de confirmação.
 */
export function AcoesMaquinaModal({ maquinaId, onClose }: AcoesMaquinaModalProps) {
  const maquina = useMaquinaComUso(maquinaId);

  return (
    <FormModal
      visible={maquinaId !== null}
      title={maquina?.nome ?? 'Máquina'}
      subtitle="Lida pelo QR Code"
      onClose={onClose}>
      {maquina ? (
        <Conteudo maquina={maquina} onClose={onClose} />
      ) : (
        <ActivityIndicator color={AgroColors.primary} />
      )}
    </FormModal>
  );
}

function Conteudo({ maquina, onClose }: { maquina: MaquinaComUso; onClose: () => void }) {
  const router = useRouter();
  const { alternar, ocupadaId } = useControleUso();
  const { usoAtual } = maquina;
  const podeLigar = maquina.status !== 'inativa';
  const descricao = [TIPO_MAQUINA_LABEL[maquina.tipo], maquina.marca, maquina.modelo]
    .filter(Boolean)
    .join(' · ');

  const visualizar = () => {
    onClose();
    router.push({ pathname: '/maquina/[id]', params: { id: maquina.id } });
  };

  return (
    <View style={styles.conteudo}>
      <View style={styles.perfil}>
        <MaquinaAvatar tipo={maquina.tipo} marca={maquina.marca} size={52} variant="mint" />
        <View style={styles.textos}>
          <Text style={styles.descricao} numberOfLines={1}>
            {descricao}
          </Text>
          {usoAtual ? (
            <View style={styles.situacao}>
              <Text style={styles.emUso}>Em uso há </Text>
              <TempoDecorrido desde={usoAtual.inicio} style={styles.emUso} />
            </View>
          ) : (
            <Text style={styles.parada}>
              {maquina.status === 'ativa' ? 'Parada' : STATUS_MAQUINA_LABEL[maquina.status]}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.acoes}>
        {usoAtual || podeLigar ? (
          <Button
            label={usoAtual ? 'Desligar máquina' : 'Ligar máquina'}
            variant={usoAtual ? 'danger' : 'primary'}
            size="lg"
            fullWidth
            loading={ocupadaId === maquina.id}
            onPress={() => alternar(maquina, { confirmar: false })}
          />
        ) : (
          <Text style={styles.aviso}>Máquina inativa: não pode ser ligada.</Text>
        )}
        <Button label="Visualizar" variant="outline" size="lg" fullWidth onPress={visualizar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: Spacing.lg,
  },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  descricao: {
    ...Typography.caption,
  },
  situacao: {
    flexDirection: 'row',
  },
  emUso: {
    ...Typography.captionBold,
    color: AgroColors.primary,
  },
  parada: {
    ...Typography.caption,
  },
  acoes: {
    gap: Spacing.sm,
  },
  aviso: {
    ...Typography.caption,
    color: AgroColors.warning,
    textAlign: 'center',
  },
});
