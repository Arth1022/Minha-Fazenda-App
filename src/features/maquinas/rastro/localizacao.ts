import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

import type { Posicao } from '../data/usos';
import { TEMPOS } from '../services/padroes';
import { TAREFA_RASTRO } from './constantes';

/**
 * GPS do uso da máquina: permissão, ligar e desligar o rastro. O app só usa o
 * GPS com um uso aberto; fora disso, não rastreia ninguém.
 * Doc: https://docs.expo.dev/versions/v58.0.0/sdk/location/
 */

/** "sempre": rastreia com o app fechado; "emUso": só com o app aberto; "negada": sem GPS. */
export type NivelLocalizacao = 'sempre' | 'emUso' | 'negada';

const TEXTO_AVISO =
  'O Minha Fazenda coleta dados de localização para registrar o uso das máquinas ' +
  '(tempo, KM e talhões) mesmo quando o app está fechado ou não está em uso. ' +
  'A coleta só acontece enquanto uma máquina está em uso.';

/** Aviso próprio antes do pedido do sistema (exigência do Google Play). */
function confirmarAviso(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('Localização durante o uso', TEXTO_AVISO, [
      { text: 'Agora não', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continuar', onPress: () => resolve(true) },
    ]);
  });
}

async function nivelAtual(): Promise<NivelLocalizacao> {
  const primeiroPlano = await Location.getForegroundPermissionsAsync();
  if (!primeiroPlano.granted) return 'negada';
  const segundoPlano = await Location.getBackgroundPermissionsAsync();
  return segundoPlano.granted ? 'sempre' : 'emUso';
}

/**
 * Garante a permissão para rastrear o uso. Pede "durante o uso" e depois "o tempo
 * todo" (no Android 11+ isso abre as configurações). Sem permissão, a máquina
 * liga do mesmo jeito, só sem KM e talhões.
 */
export async function pedirLocalizacaoParaRastro(): Promise<NivelLocalizacao> {
  if (Platform.OS === 'web') return 'negada';
  const atual = await nivelAtual();
  if (atual === 'sempre') return atual;

  const [primeiroPlano, segundoPlano] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);
  const podePedir = primeiroPlano.granted ? segundoPlano.canAskAgain : primeiroPlano.canAskAgain;
  if (!podePedir) return atual;
  if (!(await confirmarAviso())) return atual;

  if (!primeiroPlano.granted) {
    const pedido = await Location.requestForegroundPermissionsAsync();
    if (!pedido.granted) return 'negada';
  }
  const fundo = await Location.requestBackgroundPermissionsAsync();
  return fundo.granted ? 'sempre' : 'emUso';
}

/**
 * Liga o rastro (serviço em primeiro plano com notificação fixa no Android).
 * Devolve false se o sistema não deixar: o uso segue sem GPS.
 */
export async function iniciarRastro(nomeMaquina: string): Promise<boolean> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TAREFA_RASTRO)) return true;
    await Location.startLocationUpdatesAsync(TAREFA_RASTRO, {
      accuracy: Location.Accuracy.High,
      timeInterval: TEMPOS.intervaloGpsMs,
      // 0: continua recebendo ponto com a máquina parada (é assim que se sabe que parou)
      distanceInterval: 0,
      activityType: Location.ActivityType.OtherNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: `${nomeMaquina} em uso`,
        notificationBody: 'Registrando tempo e KM. Toque para abrir.',
        notificationColor: '#1B5E20',
        killServiceOnDestroy: false,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Desliga o rastro junto com o uso (condição do Google para esse tipo de serviço). */
export async function pararRastro(): Promise<void> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TAREFA_RASTRO)) {
      await Location.stopLocationUpdatesAsync(TAREFA_RASTRO);
    }
  } catch {
    // Tarefa não registrada (ex.: app reinstalado): nada para parar
  }
}

export async function rastroLigado(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(TAREFA_RASTRO);
  } catch {
    return false;
  }
}

/** Posição rápida (última conhecida, de até 2 min) para marcar onde algo foi registrado. */
export async function posicaoRapida(): Promise<Posicao | null> {
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return null;
    const ultima = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000, requiredAccuracy: 100 });
    return ultima ? { lat: ultima.coords.latitude, lng: ultima.coords.longitude } : null;
  } catch {
    return null;
  }
}
