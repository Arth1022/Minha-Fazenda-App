import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { api } from '@/shared/api';
import { atualizarUsuarioDaSessao } from './servicoConta';
import { sessaoEmMemoria, type UsuarioDaSessao } from './sessao';

/** A foto sai do celular já reduzida: 512 × 512 em JPEG. */
const LADO_AVATAR = 512;
const COMPRESSAO = 0.8;

/**
 * Galeria com recorte 1:1, depois reduz para 512 × 512 em JPEG (compressão
 * 0,8). Devolve o arquivo pronto para enviar, ou null se a pessoa cancelar.
 */
export async function escolherFotoDoAvatar(): Promise<string | null> {
  const resultado = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
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
  // No React Native o arquivo vai como { uri, name, type }
  formulario.append('arquivo', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);
  const { avatarUrl } = await api<{ avatarUrl: string }>('/usuarios/me/avatar', {
    metodo: 'PUT',
    formulario,
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
