import { normalizarCodigo } from './uso';

/**
 * Conteúdo do QR Code da máquina: um link do app (esquema "minhafazenda" do
 * app.json) para a rota /maquina/[id]. Lido pela câmera comum do celular, já abre
 * a ficha; lido pelo leitor do app, abre as opções da máquina.
 */
export const PREFIXO_QR_MAQUINA = 'minhafazenda://maquina/';

/** Etiquetas antigas ou feitas à mão costumam ter só o ID curto ("TR-01"). */
const TAMANHO_MAX_CODIGO = 20;

export type ReferenciaMaquina = { tipo: 'id'; id: string } | { tipo: 'codigo'; codigo: string };

export function conteudoQrMaquina(maquinaId: string): string {
  return `${PREFIXO_QR_MAQUINA}${maquinaId}`;
}

/**
 * Entende o QR lido: link do app → id da máquina; texto curto sem espaços → ID
 * ("tr-01" vira "TR-01"); qualquer outra coisa → null (não é de máquina).
 */
export function lerQrMaquina(valor: string): ReferenciaMaquina | null {
  const texto = valor.trim();
  if (texto.toLowerCase().startsWith(PREFIXO_QR_MAQUINA)) {
    const id = texto.slice(PREFIXO_QR_MAQUINA.length).split(/[/?#]/)[0];
    return id ? { tipo: 'id', id: decodeURIComponent(id) } : null;
  }
  if (texto && texto.length <= TAMANHO_MAX_CODIGO && !/\s/.test(texto) && !texto.includes('://')) {
    return { tipo: 'codigo', codigo: normalizarCodigo(texto) };
  }
  return null;
}
