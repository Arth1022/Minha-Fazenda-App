import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  CameraType,
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
} from 'expo-image-picker';

import type { OrigemFoto } from '@/services/fotos';
import { api } from '@/shared/api';
import { atualizarUsuarioDaSessao } from './servicoConta';
import { sessaoEmMemoria, type UsuarioDaSessao } from './sessao';

/** A foto sai do celular já reduzida: 512 × 512 em JPEG. */
const LADO_AVATAR = 512;
const COMPRESSAO = 0.8;
/** O servidor regrava a foto e sobe para o Storage; no Render "frio" a primeira leva mais de 20 s. */
const TEMPO_ENVIO_AVATAR_MS = 60_000;

/**
 * Câmera (a da frente, para a selfie) ou galeria, com recorte 1:1; depois reduz
 * para 512 × 512 em JPEG (compressão 0,8). Devolve o arquivo pronto para
 * enviar, ou null se a pessoa cancelar.
 */
export async function escolherFotoDoAvatar(origem: OrigemFoto = 'galeria'): Promise<string | null> {
  if (origem === 'camera') {
    const permissao = await requestCameraPermissionsAsync();
    if (!permissao.granted) {
      throw new Error('Permita o uso da câmera nas configurações do celular para tirar a foto.');
    }
  }
  const opcoes = { mediaTypes: ['images' as const], allowsEditing: true, aspect: [1, 1] as [number, number], quality: 1 };
  const resultado =
    origem === 'camera'
      ? await launchCameraAsync({ ...opcoes, cameraType: CameraType.front })
      : await launchImageLibraryAsync(opcoes);
  const uri = resultado.canceled ? null : resultado.assets[0]?.uri;
  if (!uri) return null;
  const imagem = await ImageManipulator.manipulate(uri).resize({ width: LADO_AVATAR, height: LADO_AVATAR }).renderAsync();
  const salva = await imagem.saveAsync({ compress: COMPRESSAO, format: SaveFormat.JPEG });
  return salva.uri;
}

function usuarioDaSessao(): UsuarioDaSessao {
  const usuario = sessaoEmMemoria().usuario;
  if (!usuario) throw new Error('Entre na sua conta para mudar o perfil.');
  return usuario;
}

/** `PUT /usuarios/me/avatar` (multipart, campo "arquivo"); precisa de internet. */
export async function enviarAvatar(uri: string): Promise<string> {
  const formulario = new FormData();
  // O fetch do Expo (expo/fetch) lê o arquivo pelo File do expo-file-system; o objeto
  // { uri, name, type } do fetch antigo do React Native não é aceito e falha antes de enviar
  formulario.append('arquivo', new File(uri));
  const { avatarUrl } = await api<{ avatarUrl: string }>('/usuarios/me/avatar', {
    metodo: 'PUT',
    formulario,
    tempoLimiteMs: TEMPO_ENVIO_AVATAR_MS,
  });
  await atualizarUsuarioDaSessao({ ...usuarioDaSessao(), avatarUrl });
  return avatarUrl;
}

/** `DELETE /usuarios/me/avatar`: volta para a letra. */
export async function removerAvatar(): Promise<void> {
  await api('/usuarios/me/avatar', { metodo: 'DELETE' });
  await atualizarUsuarioDaSessao({ ...usuarioDaSessao(), avatarUrl: null });
}

/** `PATCH /usuarios/me` com o nome (2 a 60 caracteres, validado antes). */
export async function alterarNome(nome: string): Promise<void> {
  const usuario = await api<UsuarioDaSessao>('/usuarios/me', { metodo: 'PATCH', corpo: { nome: nome.trim() } });
  await atualizarUsuarioDaSessao(usuario);
}
