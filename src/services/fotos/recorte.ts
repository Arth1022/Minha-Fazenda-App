/**
 * Geometria da leitura por foto: onde o visor da câmera (o retângulo-guia na
 * tela) cai dentro da foto tirada. Sem dependências do aparelho, para testar.
 */

export interface Tamanho {
  width: number;
  height: number;
}

export interface Retangulo extends Tamanho {
  x: number;
  y: number;
}

/** Recorte menor que isso não tem o que ler: melhor usar a foto inteira. */
const MENOR_RECORTE = 48;
/** Faixa de largura do recorte que o leitor de texto lê melhor (letra grande, sem pesar). */
const LARGURA_MINIMA_LEITURA = 1280;
const LARGURA_MAXIMA_LEITURA = 2048;

/**
 * Área do visor na foto, com `folga` (fração do visor, em cada lado) para
 * perdoar a mão tremendo e a diferença entre a prévia e a foto.
 *
 * A prévia mostra a foto "cobrindo" a tela (as sobras ficam de fora), então se
 * desfaz essa escala e o corte das sobras. Null quando não dá para confiar no
 * recorte: foto deitada com a tela em pé (giro não aplicado) ou área pequena demais.
 */
export function areaNaFoto(
  foto: Tamanho,
  tela: Tamanho,
  visor: Retangulo,
  folga = 0
): Retangulo | null {
  if (foto.width <= 0 || foto.height <= 0 || tela.width <= 0 || tela.height <= 0) return null;
  if (foto.height >= foto.width !== tela.height >= tela.width) return null;

  const escala = Math.max(tela.width / foto.width, tela.height / foto.height);
  const sobraX = (foto.width * escala - tela.width) / 2;
  const sobraY = (foto.height * escala - tela.height) / 2;
  const folgaX = visor.width * folga;
  const folgaY = visor.height * folga;

  const naFotoX = (telaX: number) => limitar((telaX + sobraX) / escala, foto.width);
  const naFotoY = (telaY: number) => limitar((telaY + sobraY) / escala, foto.height);
  const x0 = Math.floor(naFotoX(visor.x - folgaX));
  const y0 = Math.floor(naFotoY(visor.y - folgaY));
  const x1 = Math.ceil(naFotoX(visor.x + visor.width + folgaX));
  const y1 = Math.ceil(naFotoY(visor.y + visor.height + folgaY));

  const area = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  return area.width >= MENOR_RECORTE && area.height >= MENOR_RECORTE ? area : null;
}

/**
 * Largura para a qual redimensionar o recorte antes de ler; null se já está boa.
 * Recorte pequeno (celular simples) é ampliado; enorme é reduzido.
 */
export function larguraParaLeitura(largura: number): number | null {
  if (largura < LARGURA_MINIMA_LEITURA) return LARGURA_MINIMA_LEITURA;
  if (largura > LARGURA_MAXIMA_LEITURA) return LARGURA_MAXIMA_LEITURA;
  return null;
}

function limitar(valor: number, maximo: number): number {
  return Math.min(Math.max(valor, 0), maximo);
}
