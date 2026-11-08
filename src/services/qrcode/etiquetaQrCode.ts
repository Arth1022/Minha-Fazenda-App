import { create, type QRCodeErrorCorrectionLevel } from 'qrcode';

/**
 * Etiqueta de QR Code para imprimir, em HTML pronto para virar PDF. O QR vai
 * como desenho vetorial (SVG): fica nítido em qualquer impressora ou zoom e não
 * perde qualidade quando o PDF é enviado pelo WhatsApp.
 */

/** Margem branca obrigatória em volta do QR, em módulos (padrão da norma). */
const MARGEM_MODULOS = 4;
/** Lado do QR impresso: lê fácil com o celular e cabe num brinco grande ou coleira. */
const LADO_CM = 5;

export interface OpcoesSvgQrCode {
  /** Correção de erro: "M" aguenta ~15% da etiqueta suja ou riscada */
  nivel?: QRCodeErrorCorrectionLevel;
  /** Margem branca em módulos */
  margem?: number;
}

/**
 * QR Code em SVG, com a margem branca já incluída. Os módulos escuros de cada
 * linha são juntados num só traço, o que deixa o arquivo pequeno.
 */
export function svgDoQrCode(texto: string, { nivel = 'M', margem = MARGEM_MODULOS }: OpcoesSvgQrCode = {}): string {
  const { modules } = create(texto, { errorCorrectionLevel: nivel });
  const { size } = modules;
  const caminho: string[] = [];
  for (let linha = 0; linha < size; linha++) {
    let coluna = 0;
    while (coluna < size) {
      if (!modules.get(linha, coluna)) {
        coluna++;
        continue;
      }
      const inicio = coluna;
      while (coluna < size && modules.get(linha, coluna)) coluna++;
      caminho.push(`M${inicio + margem} ${linha + margem}h${coluna - inicio}v1h-${coluna - inicio}z`);
    }
  }
  const lado = size + margem * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges">` +
    `<rect width="${lado}" height="${lado}" fill="#fff"/>` +
    `<path d="${caminho.join('')}" fill="#000"/></svg>`
  );
}

export interface DadosEtiqueta {
  /** O que o QR guarda (ex.: link do animal) */
  conteudo: string;
  /** Texto grande abaixo do QR (ex.: o brinco) */
  titulo: string;
  /** Linha menor abaixo do título (ex.: o nome); opcional */
  subtitulo?: string | null;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Nome e brinco vêm do cadastro: nunca entram no HTML sem escapar. */
function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * Folha A4 com a etiqueta no topo: QR de 5 cm, título e subtítulo, e uma borda
 * tracejada para recortar.
 */
export function htmlDaEtiqueta({ conteudo, titulo, subtitulo }: DadosEtiqueta): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000;
    font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; }
  .folha { display: flex; justify-content: center; padding-top: 2cm; }
  .etiqueta { box-sizing: border-box; width: ${LADO_CM + 1.6}cm; padding: 0.8cm;
    border: 1px dashed #888; border-radius: 4mm; text-align: center; }
  .qr svg { display: block; width: ${LADO_CM}cm; height: ${LADO_CM}cm; }
  .titulo { margin-top: 3mm; font-size: 20pt; font-weight: 700; letter-spacing: 1px; word-break: break-word; }
  .subtitulo { margin-top: 1mm; font-size: 12pt; word-break: break-word; }
</style>
</head>
<body>
  <div class="folha">
    <div class="etiqueta">
      <div class="qr">${svgDoQrCode(conteudo)}</div>
      <div class="titulo">${escapar(titulo)}</div>
      ${subtitulo ? `<div class="subtitulo">${escapar(subtitulo)}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
}
