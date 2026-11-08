import { formatBrinco } from '@/utils/formatters';

/**
 * Conteúdo do QR Code do animal: um link do app (esquema "minhafazenda" do
 * app.json) para a rota /animal/[id]. Lido pelo leitor do app ou pela câmera
 * comum do celular, abre a ficha do animal.
 */
export const PREFIXO_QR_ANIMAL = 'minhafazenda://animal/';

/** Brincos com QR feito fora do app costumam ter só o número ("104", "#104"). */
const TAMANHO_MAX_BRINCO = 20;

export type ReferenciaAnimal = { tipo: 'id'; id: string } | { tipo: 'brinco'; brinco: string };

export function conteudoQrAnimal(animalId: string): string {
  return `${PREFIXO_QR_ANIMAL}${animalId}`;
}

/**
 * Entende o QR lido: link do app → id do animal; texto curto sem espaços →
 * brinco ("104" vira "#104", como no cadastro); qualquer outra coisa → null.
 */
export function lerQrAnimal(valor: string): ReferenciaAnimal | null {
  const texto = valor.trim();
  if (texto.toLowerCase().startsWith(PREFIXO_QR_ANIMAL)) {
    const id = texto.slice(PREFIXO_QR_ANIMAL.length).split(/[/?#]/)[0];
    return id ? { tipo: 'id', id: decodeURIComponent(id) } : null;
  }
  if (texto && texto.length <= TAMANHO_MAX_BRINCO && !/\s/.test(texto) && !texto.includes('://')) {
    return { tipo: 'brinco', brinco: formatBrinco(texto) };
  }
  return null;
}
