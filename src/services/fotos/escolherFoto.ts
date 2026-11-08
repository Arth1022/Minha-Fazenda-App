import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync } from 'expo-image-picker';

/** Qualidade suficiente para ler um comprovante, sem pesar no celular */
const QUALIDADE = 0.6;

export type OrigemFoto = 'camera' | 'galeria';

/**
 * Abre a câmera ou a galeria e devolve a foto escolhida (arquivo temporário),
 * ou null se a pessoa cancelar. Guarde com `guardarFoto` ao salvar o registro.
 */
export async function escolherFoto(origem: OrigemFoto): Promise<string | null> {
  if (origem === 'camera') {
    const permissao = await requestCameraPermissionsAsync();
    if (!permissao.granted) {
      throw new Error('Permita o uso da câmera nas configurações do celular para tirar a foto.');
    }
  }
  const abrir = origem === 'camera' ? launchCameraAsync : launchImageLibraryAsync;
  const resultado = await abrir({ mediaTypes: ['images'], quality: QUALIDADE });
  return resultado.canceled ? null : resultado.assets[0]?.uri ?? null;
}
