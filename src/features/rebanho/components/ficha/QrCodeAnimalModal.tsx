import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { FormModal } from '@/components/forms';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { Animal } from '@/dtos';
import { salvarPngNaGaleria } from '@/services/qrcode';
import { conteudoQrAnimal } from '../../services/qrCode';

const LADO_QR = 220;
/** Imagem baixada em alta resolução, boa para imprimir */
const LADO_IMAGEM = 1024;

/** O que o QRCode entrega no getRef: o <Svg> do react-native-svg. */
type SvgDoQr = { toDataURL: (callback: (base64: string) => void, options?: object) => void };

export interface QrCodeAnimalModalProps {
  visible: boolean;
  animal: Pick<Animal, 'id' | 'brinco' | 'nome'>;
  onClose: () => void;
}

/** QR Code do animal para imprimir e prender no brinco ou na coleira; "Baixar" salva na galeria. */
export function QrCodeAnimalModal({ visible, animal, onClose }: QrCodeAnimalModalProps) {
  const svgRef = useRef<SvgDoQr | null>(null);
  const [baixando, setBaixando] = useState(false);

  const baixar = () => {
    const svg = svgRef.current;
    if (!svg) return;
    setBaixando(true);
    svg.toDataURL(
      async (base64) => {
        try {
          await salvarPngNaGaleria(base64, `qrcode-animal-${animal.brinco}`);
          Alert.alert('QR Code salvo', 'A imagem está na galeria do celular, pronta para imprimir.');
        } catch (error) {
          Alert.alert(
            'Não foi possível salvar',
            error instanceof Error ? error.message : String(error)
          );
        } finally {
          setBaixando(false);
        }
      },
      { width: LADO_IMAGEM, height: LADO_IMAGEM }
    );
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
            {/* quietZone: margem branca na imagem baixada, sem ela a leitura falha impressa */}
            <QRCode
              value={conteudoQrAnimal(animal.id)}
              size={LADO_QR}
              ecl="M"
              quietZone={12}
              getRef={(svg: SvgDoQr | null) => {
                svgRef.current = svg;
              }}
            />
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
