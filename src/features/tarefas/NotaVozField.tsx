import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Button } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  apagarAudio,
  extrairDuracaoAudioSeg,
  guardarAudio,
  LIMITE_SEGUNDOS_VOZ,
} from '@/services/audio';
import { useMidia } from '@/services/midia';

export interface NotaVozFieldProps {
  audioUri: string | null;
  onChange: (uri: string | null) => void;
}

function formatarSegundos(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Player de áudio da nota de voz (usado no modal de relato e no Card da tarefa).
 */
export function PlayerNotaVozCompacto({
  audioUri,
  onExcluir,
}: {
  audioUri: string;
  onExcluir?: () => void;
}) {
  // `midia:` (enviado por outro celular) vira arquivo local: baixa uma vez e toca offline depois
  const midia = useMidia(audioUri);
  const player = useAudioPlayer(midia.uri);
  const status = useAudioPlayerStatus(player);
  const duracaoSalva = status.duration ? Math.round(status.duration) : extrairDuracaoAudioSeg(audioUri);
  const duracaoTotal = Math.max(1, Math.round(status.duration || duracaoSalva));

  const alternar = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.currentTime >= duracaoTotal) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <View style={styles.cardSalvo}>
      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pausar nota de voz' : 'Ouvir nota de voz'}
        style={styles.botaoPlay}>
        <AppIcon
          name={status.playing ? 'power' : 'bell'}
          size={18}
          color={AgroColors.forest}
        />
        <Text style={styles.textoSalvo}>
          {status.playing
            ? `Reproduzindo ${formatarSegundos(status.currentTime)} / ${formatarSegundos(duracaoTotal)}`
            : `Ouvir nota de voz (${duracaoSalva}s)`}
        </Text>
      </Pressable>
      {onExcluir ? (
        <Pressable
          onPress={onExcluir}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Excluir nota de voz"
          style={styles.botaoExcluir}>
          <AppIcon name="trash" size={18} color={AgroColors.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Gravação rápida de nota de voz (até LIMITE_SEGUNDOS_VOZ) com áudio real via expo-audio,
 * indicador visual de gravação e reprodução simples.
 * Salva o arquivo diretamente no diretório local do app (`Documents/audios/`).
 */
export function NotaVozField({ audioUri, onChange }: NotaVozFieldProps) {
  const [gravando, setGravando] = useState(false);
  const [segundosGravados, setSegundosGravados] = useState(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const timerGravacaoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const duracaoRef = useRef(0);

  const limparTimer = () => {
    if (timerGravacaoRef.current) {
      clearInterval(timerGravacaoRef.current);
      timerGravacaoRef.current = null;
    }
  };

  useEffect(() => {
    return () => limparTimer();
  }, []);

  const finalizarGravacao = async () => {
    limparTimer();
    setGravando(false);
    const duracao = Math.max(1, duracaoRef.current);
    try {
      await recorder.stop();
      const gravadoUri = recorder.uri;
      const salvo = await guardarAudio(gravadoUri, duracao);
      onChange(salvo);
    } catch {
      // Fallback para ambientes sem codec nativo (ex: testes/emulador restrito)
      const salvo = await guardarAudio(null, duracao);
      onChange(salvo);
    }
  };

  const iniciarGravacao = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permissão necessária',
          'Permita o uso do microfone nas configurações do celular para gravar a nota de voz.'
        );
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (erro) {
      console.warn('[NotaVoz] Inicialização do áudio:', erro);
    }

    limparTimer();
    duracaoRef.current = 0;
    setSegundosGravados(0);
    setGravando(true);

    timerGravacaoRef.current = setInterval(() => {
      duracaoRef.current += 1;
      setSegundosGravados(duracaoRef.current);
      if (duracaoRef.current >= LIMITE_SEGUNDOS_VOZ) {
        void finalizarGravacao();
      }
    }, 1000);
  };

  const removerAudio = () => {
    limparTimer();
    apagarAudio(audioUri);
    onChange(null);
  };

  return (
    <View style={styles.bloco}>
      <Text style={styles.label}>Nota de voz (opcional · máx. {LIMITE_SEGUNDOS_VOZ}s)</Text>

      {gravando ? (
        <View style={styles.cardGravando}>
          <View style={styles.bolinhaGravando} />
          <Text style={styles.textoGravando}>
            Gravando... {formatarSegundos(segundosGravados)} / {formatarSegundos(LIMITE_SEGUNDOS_VOZ)}
          </Text>
          <Button
            label="Parar"
            size="sm"
            variant="danger"
            onPress={() => void finalizarGravacao()}
          />
        </View>
      ) : audioUri ? (
        <PlayerNotaVozCompacto audioUri={audioUri} onExcluir={removerAudio} />
      ) : (
        <Button
          label={`Gravar nota de voz (até ${LIMITE_SEGUNDOS_VOZ}s)`}
          variant="outline"
          size="sm"
          onPress={() => void iniciarGravacao()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
    fontWeight: '600',
  },
  cardGravando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: AgroColors.dangerBg,
    borderWidth: 1,
    borderColor: AgroColors.danger,
  },
  bolinhaGravando: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AgroColors.danger,
  },
  textoGravando: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: AgroColors.danger,
  },
  cardSalvo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: AgroColors.mintBg,
    borderWidth: 1,
    borderColor: AgroColors.forest,
  },
  botaoPlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  textoSalvo: {
    fontSize: 14,
    fontWeight: '700',
    color: AgroColors.forest,
  },
  botaoExcluir: {
    padding: 4,
  },
});
