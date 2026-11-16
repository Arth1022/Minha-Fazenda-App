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

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import {
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

/** Alturas das barrinhas da onda (decorativa) do player do relato */
const ONDA = [10, 16, 12, 22, 14, 26, 18, 24, 12, 20, 14, 18];

export interface GravacaoVoz {
  gravando: boolean;
  segundos: number;
  iniciar: () => Promise<void>;
  parar: () => Promise<void>;
}

/**
 * Gravação rápida de nota de voz (até LIMITE_SEGUNDOS_VOZ) com expo-audio. O
 * arquivo vai direto para o diretório local do app (`Documents/audios/`).
 */
export function useGravacaoVoz(onSalvo: (uri: string | null) => void): GravacaoVoz {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const duracaoRef = useRef(0);
  const onSalvoRef = useRef(onSalvo);
  useEffect(() => {
    onSalvoRef.current = onSalvo;
  }, [onSalvo]);

  const limparTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => limparTimer(), []);

  const parar = async () => {
    limparTimer();
    setGravando(false);
    const duracao = Math.max(1, duracaoRef.current);
    try {
      await recorder.stop();
      onSalvoRef.current(await guardarAudio(recorder.uri, duracao));
    } catch {
      // Fallback para ambientes sem codec nativo (ex: testes/emulador restrito)
      onSalvoRef.current(await guardarAudio(null, duracao));
    }
  };

  const iniciar = async () => {
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
    setSegundos(0);
    setGravando(true);
    timerRef.current = setInterval(() => {
      duracaoRef.current += 1;
      setSegundos(duracaoRef.current);
      if (duracaoRef.current >= LIMITE_SEGUNDOS_VOZ) void parar();
    }, 1000);
  };

  return { gravando, segundos, iniciar, parar };
}

/** Faixa "gravando" do relato: ponto vermelho, tempo e parar. */
export function FaixaGravando({ segundos, onParar }: { segundos: number; onParar: () => void }) {
  return (
    <View style={[styles.faixa, styles.faixaGravando]}>
      <View style={styles.bolinhaGravando} />
      <Text style={styles.textoGravando}>
        Gravando {formatarSegundos(segundos)} / {formatarSegundos(LIMITE_SEGUNDOS_VOZ)}
      </Text>
      <Pressable
        onPress={onParar}
        accessibilityRole="button"
        accessibilityLabel="Parar gravação"
        style={[styles.botaoRedondo, styles.botaoParar]}>
        <View style={styles.quadradoParar} />
      </Pressable>
    </View>
  );
}

/** Player da nota de voz do relato: play, onda, duração e lixeira. */
export function PlayerNotaVozOnda({ audioUri, onExcluir }: { audioUri: string; onExcluir: () => void }) {
  const midia = useMidia(audioUri);
  const player = useAudioPlayer(midia.uri);
  const status = useAudioPlayerStatus(player);
  const duracaoSalva = extrairDuracaoAudioSeg(audioUri);
  const duracaoTotal = Math.max(1, Math.round(status.duration || duracaoSalva));
  const progresso = status.playing || status.currentTime > 0 ? status.currentTime / duracaoTotal : 0;

  const alternar = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.currentTime >= duracaoTotal) player.seekTo(0);
    player.play();
  };

  const tempo = status.playing ? status.currentTime : duracaoTotal;

  return (
    <View style={styles.faixa}>
      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pausar nota de voz' : 'Ouvir nota de voz'}
        style={styles.botaoRedondo}>
        <AppIcon name={status.playing ? 'pause' : 'play'} size={16} color={AgroColors.textInverse} />
      </Pressable>
      <View style={styles.onda}>
        {ONDA.map((altura, i) => (
          <View
            key={i}
            style={[
              styles.barra,
              { height: altura },
              i / ONDA.length < progresso && styles.barraTocada,
            ]}
          />
        ))}
      </View>
      <Text style={styles.duracao}>{formatarSegundos(tempo).replace(/^0/, '')}</Text>
      <Pressable
        onPress={onExcluir}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Excluir nota de voz"
        style={styles.botaoExcluir}>
        <AppIcon name="trash" size={22} color={AgroColors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.surfaceMuted,
  },
  faixaGravando: {
    paddingLeft: Spacing.md,
    backgroundColor: AgroColors.dangerBg,
  },
  botaoRedondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.forest,
  },
  botaoParar: {
    backgroundColor: AgroColors.danger,
  },
  quadradoParar: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: AgroColors.textInverse,
  },
  onda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barra: {
    width: 3,
    borderRadius: 2,
    backgroundColor: AgroColors.textMuted,
  },
  barraTocada: {
    backgroundColor: AgroColors.forest,
  },
  duracao: {
    ...Typography.bodyMedium,
    color: AgroColors.textPrimary,
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
