import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';

/** "qrcode-animal-#104" → "qrcode-animal-104": só letras, números, "-" e "_". */
function nomeSeguro(nome: string): string {
  return nome.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'qrcode';
}

/**
 * Salva uma imagem PNG (base64 sem o prefixo "data:") na galeria do aparelho.
 * Pede só a permissão de gravar fotos. Lança erro se a pessoa negar.
 */
export async function salvarPngNaGaleria(base64: string, nomeArquivo: string): Promise<void> {
  const permissao = await requestPermissionsAsync(true);
  if (!permissao.granted) {
    throw new Error('Permita salvar fotos nas configurações do celular para baixar o QR Code.');
  }

  // A galeria copia de um arquivo local: grava o PNG no cache antes
  const arquivo = new File(Paths.cache, `${nomeSeguro(nomeArquivo)}.png`);
  arquivo.create({ overwrite: true });
  await arquivo.write(base64, { encoding: 'base64' });
  await Asset.create(arquivo.uri);
}
