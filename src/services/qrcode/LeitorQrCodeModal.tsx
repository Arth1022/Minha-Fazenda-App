import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, Button } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import {
  descartarFotoTemporaria,
  leituraDeTextoDisponivel,
  lerTextoDaFoto,
  type Retangulo,
  type Tamanho,
} from '@/services/fotos';

/** Lado do quadrado-guia do QR Code */
const VISOR_QR = 240;
/** Retângulo-guia do número (brinco é mais largo que alto) */
const VISOR_TEXTO = { width: 300, height: 150 };
const CANTO = 28;

export type ModoLeitor = 'qrcode' | 'texto';

export interface LeitorQrCodeModalProps {
  visible: boolean;
  /** Texto no topo da câmera (ex.: "Ler brinco do animal") */
  titulo: string;
  /** Rótulo do modo foto (ex.: "Número do brinco"); sem ele, só lê QR Code */
  modoTexto?: string;
  /** Primeiro QR Code lido; a câmera para de ler depois dele */
  onQrCode: (valor: string) => void;
  /** Textos lidos na foto (modo texto), na ordem em que aparecem */
  onTexto: (textos: string[]) => void;
  onCancelar: () => void;
}

/**
 * Tela cheia com a câmera traseira (funciona offline): lê QR Code sozinha ou,
 * no modo texto, tira uma foto e lê o texto dela no próprio aparelho. A
 * lanterna já abre acesa, para a leitura no curral; dá para apagar se refletir.
 */
export function LeitorQrCodeModal({
  visible,
  titulo,
  modoTexto,
  onQrCode,
  onTexto,
  onCancelar,
}: LeitorQrCodeModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancelar}>
      <Leitor
        titulo={titulo}
        modoTexto={leituraDeTextoDisponivel ? modoTexto : undefined}
        onQrCode={onQrCode}
        onTexto={onTexto}
        onCancelar={onCancelar}
      />
    </Modal>
  );
}

/** Leitura do brinco só serve se tiver algum dígito; senão vale tentar a foto inteira. */
const temDigito = (textos: string[]) => textos.some((texto) => /\d/.test(texto));

function Leitor({ titulo, modoTexto, onQrCode, onTexto, onCancelar }: Omit<LeitorQrCodeModalProps, 'visible'>) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  // A câmera avisa várias vezes por segundo enquanto o código está à vista: vale só a primeira
  const jaLeu = useRef(false);
  const [modo, setModo] = useState<ModoLeitor>('qrcode');
  const [lanterna, setLanterna] = useState(true);
  const [lendoFoto, setLendoFoto] = useState(false);
  const [cameraPronta, setCameraPronta] = useState(false);
  // Medidas da prévia e do visor: a leitura recorta a foto onde o visor estava
  const tela = useRef<Tamanho | null>(null);
  const visor = useRef<Retangulo | null>(null);

  const aoLerQr = ({ data }: BarcodeScanningResult) => {
    if (jaLeu.current || !data) return;
    jaLeu.current = true;
    Vibration.vibrate(40);
    onQrCode(data);
  };

  const fotografar = async () => {
    const camera = cameraRef.current;
    if (!camera || lendoFoto || !cameraPronta) return;
    setLendoFoto(true);
    let foto: string | null = null;
    try {
      // Qualidade máxima: a foto é só do cache e a compressão borra os dígitos
      foto = (await camera.takePictureAsync({ quality: 1, shutterSound: false })).uri;
      const enquadramento = tela.current && visor.current ? { tela: tela.current, visor: visor.current } : undefined;
      const textos = await lerTextoDaFoto(foto, { enquadramento, serve: temDigito });
      Vibration.vibrate(40);
      onTexto(textos);
    } catch {
      // Sem leitura (ex.: modelo de texto ainda não baixado): segue como "nada lido",
      // e quem chamou oferece digitar. O produtor nunca fica parado na câmera.
      onTexto([]);
    } finally {
      if (foto) descartarFotoTemporaria(foto);
      setLendoFoto(false);
    }
  };

  const ehTexto = modo === 'texto';

  let conteudo: React.ReactNode;
  if (!permissao) {
    conteudo = <ActivityIndicator color={AgroColors.textInverse} />;
  } else if (!permissao.granted) {
    conteudo = (
      <View style={styles.aviso}>
        <Text style={styles.avisoTitulo}>Permita o uso da câmera</Text>
        <Text style={styles.avisoTexto}>
          A câmera é usada só para ler o QR Code ou o número do brinco, aqui no aparelho.
        </Text>
        {permissao.canAskAgain ? (
          <Button label="Permitir câmera" variant="primary" fullWidth onPress={pedirPermissao} />
        ) : (
          <Button
            label="Abrir configurações"
            variant="primary"
            fullWidth
            onPress={() => Linking.openSettings()}
          />
        )}
      </View>
    );
  } else {
    conteudo = (
      <>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={lanterna}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={ehTexto ? undefined : aoLerQr}
          onCameraReady={() => setCameraPronta(true)}
        />
        <View
          style={[styles.visor, ehTexto ? VISOR_TEXTO : styles.visorQr]}
          onLayout={({ nativeEvent }) => {
            visor.current = nativeEvent.layout;
          }}>
          <View style={[styles.canto, styles.cantoSupEsq]} />
          <View style={[styles.canto, styles.cantoSupDir]} />
          <View style={[styles.canto, styles.cantoInfEsq]} />
          <View style={[styles.canto, styles.cantoInfDir]} />
        </View>

        <View style={[styles.rodape, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Text style={styles.dica}>
            {ehTexto
              ? 'Enquadre o número do brinco e toque para ler'
              : 'Aponte a câmera para o QR Code'}
          </Text>

          {ehTexto ? (
            <Pressable
              onPress={fotografar}
              disabled={lendoFoto || !cameraPronta}
              style={({ pressed }) => [styles.disparo, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Ler número do brinco">
              {lendoFoto ? (
                <ActivityIndicator color={AgroColors.primary} />
              ) : (
                <View style={styles.disparoMiolo} />
              )}
            </Pressable>
          ) : null}

          {modoTexto ? (
            <View style={styles.modos} accessibilityRole="tablist">
              {(
                [
                  ['qrcode', 'QR Code'],
                  ['texto', modoTexto],
                ] as const
              ).map(([chave, rotulo]) => {
                const ativo = modo === chave;
                return (
                  <Pressable
                    key={chave}
                    onPress={() => setModo(chave)}
                    disabled={lendoFoto}
                    style={[styles.modo, ativo && styles.modoAtivo]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: ativo }}>
                    <Text style={[styles.modoTexto, ativo && styles.modoTextoAtivo]}>{rotulo}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </>
    );
  }

  return (
    <View
      style={styles.tela}
      onLayout={({ nativeEvent }) => {
        tela.current = nativeEvent.layout;
      }}>
      {conteudo}

      <View style={[styles.topo, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        {permissao?.granted ? (
          <Pressable
            onPress={() => setLanterna((acesa) => !acesa)}
            hitSlop={10}
            style={({ pressed }) => [styles.botaoTopo, lanterna && styles.lanternaAcesa, pressed && styles.pressed]}
            accessibilityRole="switch"
            accessibilityState={{ checked: lanterna }}
            accessibilityLabel="Lanterna">
            <AppIcon
              name="flashlight"
              size={IconSize.lg}
              color={lanterna ? AgroColors.textPrimary : AgroColors.textInverse}
            />
          </Pressable>
        ) : null}
        <Pressable
          onPress={onCancelar}
          hitSlop={10}
          style={({ pressed }) => [styles.botaoTopo, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Fechar leitor">
          <AppIcon name="x" size={IconSize.lg} color={AgroColors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  titulo: {
    ...Typography.headerTitle,
    flex: 1,
  },
  botaoTopo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  lanternaAcesa: {
    backgroundColor: AgroColors.wheatGold,
  },
  pressed: {
    opacity: 0.7,
  },
  visor: {
    pointerEvents: 'none',
  },
  visorQr: {
    width: VISOR_QR,
    height: VISOR_QR,
  },
  canto: {
    position: 'absolute',
    width: CANTO,
    height: CANTO,
    borderColor: AgroColors.primaryLight,
  },
  cantoSupEsq: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: Radius.md,
  },
  cantoSupDir: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: Radius.md,
  },
  cantoInfEsq: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: Radius.md,
  },
  cantoInfDir: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: Radius.md,
  },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  dica: {
    ...Typography.bodyBold,
    color: AgroColors.textInverse,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    overflow: 'hidden',
    textAlign: 'center',
  },
  disparo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: AgroColors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disparoMiolo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AgroColors.textInverse,
  },
  modos: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modo: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  modoAtivo: {
    backgroundColor: AgroColors.textInverse,
  },
  modoTexto: {
    ...Typography.bodyBold,
    color: AgroColors.textInverse,
  },
  modoTextoAtivo: {
    color: AgroColors.textPrimary,
  },
  aviso: {
    width: '100%',
    maxWidth: 360,
    padding: Spacing.lg,
    gap: Spacing.md,
    margin: Spacing.three,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.cardBg,
  },
  avisoTitulo: {
    ...Typography.sectionTitle,
  },
  avisoTexto: {
    ...Typography.bodyMedium,
  },
});
