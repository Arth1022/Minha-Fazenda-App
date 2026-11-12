import { useSyncExternalStore } from 'react';

/**
 * Onde ficam os botões flutuantes das abas (Relatar problema e QR Code). Uma
 * tela com painel no rodapé (ex.: a lista de áreas do mapa) sobe os botões
 * para cima dele ou esconde os dois; ao sair da tela, volta ao padrão.
 */
export interface PosicaoBotoesFlutuantes {
  /** Quanto os botões sobem acima do lugar de sempre */
  elevacao: number;
  ocultos: boolean;
}

const PADRAO: PosicaoBotoesFlutuantes = { elevacao: 0, ocultos: false };

let atual = PADRAO;
const ouvintes = new Set<() => void>();

/** Muda a posição dos botões; null volta ao lugar de sempre. */
export function posicionarBotoesFlutuantes(nova: PosicaoBotoesFlutuantes | null): void {
  const proxima = nova ?? PADRAO;
  if (proxima.elevacao === atual.elevacao && proxima.ocultos === atual.ocultos) return;
  atual = proxima;
  ouvintes.forEach((ouvir) => ouvir());
}

function inscrever(ouvir: () => void) {
  ouvintes.add(ouvir);
  return () => {
    ouvintes.delete(ouvir);
  };
}

function ler() {
  return atual;
}

export function useBotoesFlutuantes(): PosicaoBotoesFlutuantes {
  return useSyncExternalStore(inscrever, ler, ler);
}
