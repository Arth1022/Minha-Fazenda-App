import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

import { LeitorQrCodeModal } from './LeitorQrCodeModal';

export interface OpcoesLeituraQrCode {
  /** Texto no topo da câmera (padrão: "Ler QR Code") */
  titulo?: string;
}

export interface OpcoesLeituraCamera extends OpcoesLeituraQrCode {
  /**
   * Também oferece ler texto por foto (OCR no aparelho), com este rótulo no
   * seletor de modo (ex.: "Número do brinco"). Sem ele, só lê QR Code.
   */
  modoTexto?: string;
}

/** O que a câmera leu: o conteúdo do QR Code ou os textos da foto. */
export type LeituraCamera = { tipo: 'qrcode'; valor: string } | { tipo: 'texto'; textos: string[] };

/** Abre a câmera; null se a pessoa fechar sem ler. */
export type LerCamera = (opcoes?: OpcoesLeituraCamera) => Promise<LeituraCamera | null>;

/** Abre a câmera só para QR Code e devolve o conteúdo, ou null se a pessoa fechar. */
export type LerQrCode = (opcoes?: OpcoesLeituraQrCode) => Promise<string | null>;

interface Aberto {
  titulo: string;
  modoTexto?: string;
}

const LeitorCameraContext = createContext<LerCamera | null>(null);

/**
 * Serviço de leitura pela câmera do app (QR Code e, quando pedido, número/texto
 * por foto): uma única tela de câmera, montada aqui, usada por qualquer tela via
 * `useLeitorQrCode()` ou `useLeitorCamera()`.
 */
export function LeitorQrCodeProvider({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  // Quem pediu a leitura em andamento (resolve a Promise de lerCamera)
  const pendente = useRef<((leitura: LeituraCamera | null) => void) | null>(null);

  const finalizar = useCallback((leitura: LeituraCamera | null) => {
    pendente.current?.(leitura);
    pendente.current = null;
    setAberto(null);
  }, []);

  const lerCamera = useCallback<LerCamera>(
    (opcoes = {}) =>
      new Promise((resolve) => {
        // Uma leitura nova cancela a que ainda estava aberta
        pendente.current?.(null);
        pendente.current = resolve;
        setAberto({ titulo: opcoes.titulo ?? 'Ler QR Code', modoTexto: opcoes.modoTexto });
      }),
    []
  );

  return (
    <LeitorCameraContext.Provider value={lerCamera}>
      {children}
      <LeitorQrCodeModal
        visible={aberto !== null}
        titulo={aberto?.titulo ?? ''}
        modoTexto={aberto?.modoTexto}
        onQrCode={(valor) => finalizar({ tipo: 'qrcode', valor })}
        onTexto={(textos) => finalizar({ tipo: 'texto', textos })}
        onCancelar={() => finalizar(null)}
      />
    </LeitorCameraContext.Provider>
  );
}

function useLerCamera(): LerCamera {
  const lerCamera = useContext(LeitorCameraContext);
  if (!lerCamera) {
    throw new Error('O leitor da câmera precisa estar dentro do LeitorQrCodeProvider');
  }
  return lerCamera;
}

/**
 * Leitura completa (QR Code ou texto por foto):
 * ```ts
 * const lerCamera = useLeitorCamera();
 * const leitura = await lerCamera({ modoTexto: 'Número do brinco' });
 * if (leitura?.tipo === 'texto') console.log(leitura.textos);
 * ```
 */
export function useLeitorCamera(): LerCamera {
  return useLerCamera();
}

/**
 * Só QR Code, de qualquer tela:
 * ```ts
 * const lerQrCode = useLeitorQrCode();
 * const valor = await lerQrCode({ titulo: 'Ler brinco' }); // null = cancelado
 * ```
 */
export function useLeitorQrCode(): LerQrCode {
  const lerCamera = useLerCamera();
  return useCallback<LerQrCode>(
    async (opcoes) => {
      const leitura = await lerCamera(opcoes);
      return leitura?.tipo === 'qrcode' ? leitura.valor : null;
    },
    [lerCamera]
  );
}
