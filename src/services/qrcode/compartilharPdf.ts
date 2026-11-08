import { File, Paths } from 'expo-file-system';
import { printToFileAsync } from 'expo-print';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

/** Folha A4 em pontos (1/72 de polegada), a unidade do gerador de PDF. */
const A4 = { width: 595, height: 842 };

/** "qrcode-animal-#104" → "qrcode-animal-104": só letras, números, "-" e "_". */
function nomeSeguro(nome: string): string {
  return nome.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'documento';
}

/**
 * Gera o PDF da página HTML e abre o compartilhar do celular: a pessoa escolhe
 * onde guardar (Arquivos, Drive, WhatsApp, impressora...). PDF não é
 * recomprimido no envio, então a impressão sai com a mesma qualidade.
 * Resolve quando a tela de compartilhar fecha, tenha a pessoa escolhido ou não.
 */
export async function compartilharPdf(html: string, nomeArquivo: string, titulo: string): Promise<void> {
  if (!(await isAvailableAsync())) {
    throw new Error('Este aparelho não permite compartilhar arquivos.');
  }

  const { uri } = await printToFileAsync({ html, ...A4 });
  // O PDF sai com nome aleatório: dá um nome que a pessoa reconheça no WhatsApp ou na pasta.
  // Fica no cache (o app escolhido pode ler depois que a tela fecha); o mesmo nome é sobrescrito.
  const destino = new File(Paths.cache, `${nomeSeguro(nomeArquivo)}.pdf`);
  if (destino.exists) destino.delete();
  await new File(uri).move(destino);

  await shareAsync(destino.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: titulo });
}
