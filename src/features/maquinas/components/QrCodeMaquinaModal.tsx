import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { FormModal } from '@/components/forms';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { Maquina } from '@/dtos';
import { conteudoQrMaquina } from '../services/qrCode';

const LADO_QR = 220;

export interface QrCodeMaquinaModalProps {
  visible: boolean;
  maquina: Pick<Maquina, 'id' | 'nome'>;
  onClose: () => void;
}

/** QR Code da máquina para imprimir e colar nela (ou mostrar na tela para ler). */
export function QrCodeMaquinaModal({ visible, maquina, onClose }: QrCodeMaquinaModalProps) {
  return (
    <FormModal visible={visible} title="QR Code da máquina" subtitle={maquina.nome} onClose={onClose}>
      <View style={styles.conteudo}>
        {/* Só desenha o QR com o modal aberto: a ficha não paga esse custo */}
        {visible ? (
          <View style={styles.moldura}>
            <QRCode value={conteudoQrMaquina(maquina.id)} size={LADO_QR} ecl="M" />
          </View>
        ) : null}
        <Text style={styles.dica}>
          Imprima e cole na máquina. Ao ler pelo app, aparecem as opções de ligar ou ver a ficha.
        </Text>
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  moldura: {
    padding: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
  },
  dica: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
