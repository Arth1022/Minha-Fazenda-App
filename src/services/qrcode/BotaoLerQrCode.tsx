import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Shadows } from '@/constants/theme';
import { type OpcoesLeituraCamera, useLeitorCamera } from './LeitorQrCodeProvider';

export interface BotaoLerQrCodeProps {
  /** Conteúdo do QR Code lido (não é chamado se a pessoa fechar a câmera) */
  onLido: (valor: string) => void;
  /** Textos lidos por foto; só com `opcoes.modoTexto` a câmera oferece esse modo */
  onTextoLido?: (textos: string[]) => void;
  /** Opções da leitura (ex.: título da câmera, rótulo do modo texto) */
  opcoes?: OpcoesLeituraCamera;
  /** Posição/tamanho extra (ex.: absoluto num canto da tela) */
  style?: ViewStyle;
}

/** Botão redondo com o símbolo de leitura de QR Code: abre a câmera do serviço. */
export function BotaoLerQrCode({ onLido, onTextoLido, opcoes, style }: BotaoLerQrCodeProps) {
  const lerCamera = useLeitorCamera();

  const ler = async () => {
    const leitura = await lerCamera({
      ...opcoes,
      modoTexto: onTextoLido ? opcoes?.modoTexto : undefined,
    });
    if (leitura?.tipo === 'qrcode') onLido(leitura.valor);
    else if (leitura?.tipo === 'texto') onTextoLido?.(leitura.textos);
  };

  return (
    <Pressable
      onPress={ler}
      accessibilityRole="button"
      accessibilityLabel="Ler QR Code ou número do brinco"
      style={({ pressed }) => [styles.botao, pressed && styles.pressed, style]}>
      <AppIcon name="qrcode" size={26} color={AgroColors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.cardBg,
    borderWidth: 1,
    borderColor: AgroColors.mintBorder,
    ...Shadows.fab,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
