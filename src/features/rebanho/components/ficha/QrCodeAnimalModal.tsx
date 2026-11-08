import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { FormModal } from '@/components/forms';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { Animal } from '@/dtos';
import { compartilharPdf, htmlDaEtiqueta } from '@/services/qrcode';
import { conteudoQrAnimal } from '../../services/qrCode';

const LADO_QR = 220;

export interface QrCodeAnimalModalProps {
  visible: boolean;
  animal: Pick<Animal, 'id' | 'brinco' | 'nome'>;
  onClose: () => void;
}

/**
 * QR Code do animal para imprimir e prender no brinco ou na coleira. "Baixar" gera
 * um PDF (QR vetorial, tamanho certo para imprimir) e abre o compartilhar: a
 * pessoa escolhe onde salvar ou para quem enviar.
 */
export function QrCodeAnimalModal({ visible, animal, onClose }: QrCodeAnimalModalProps) {
  const [baixando, setBaixando] = useState(false);

  const baixar = async () => {
    setBaixando(true);
    try {
      const html = htmlDaEtiqueta({
        conteudo: conteudoQrAnimal(animal.id),
        titulo: animal.brinco,
        subtitulo: animal.nome,
      });
      await compartilharPdf(html, `qrcode-animal-${animal.brinco}`, 'Salvar QR Code do animal');
    } catch (error) {
      Alert.alert('Não foi possível baixar', error instanceof Error ? error.message : String(error));
    } finally {
      setBaixando(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title="QR Code do animal"
      subtitle={animal.nome ? `${animal.nome} · Brinco ${animal.brinco}` : `Brinco ${animal.brinco}`}
      onClose={onClose}
      onSubmit={baixar}
      submitLabel="Baixar"
      cancelLabel="Fechar"
      loading={baixando}>
      <View style={styles.conteudo}>
        {/* Só desenha o QR com o modal aberto: a ficha não paga esse custo */}
        {visible ? (
          <View style={styles.moldura}>
            {/* Só a prévia na tela; o PDF baixado tem o próprio QR vetorial */}
            <QRCode value={conteudoQrAnimal(animal.id)} size={LADO_QR} ecl="M" quietZone={12} />
          </View>
        ) : null}
        <Text style={styles.brinco}>{animal.brinco}</Text>
        <Text style={styles.dica}>
          Baixe, imprima e prenda no brinco ou na coleira. Ao ler pelo app, a ficha do animal abre na
          hora.
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
    padding: Spacing.one,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
  },
  brinco: {
    ...Typography.metricLarge,
    letterSpacing: 1,
  },
  dica: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
