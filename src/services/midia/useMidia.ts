import { useEffect, useState } from 'react';

import { baixarMidia, midiaNoCelular } from './cache';
import { caminhoDaMidia, ehMidiaRemota, fazendaDaMidia } from './valor';

export interface MidiaParaExibir {
  /** URI que `<Image>` e o player abrem (sempre local), ou null enquanto baixa / sem mídia */
  uri: string | null;
  carregando: boolean;
  /** Não deu para baixar (sem internet na primeira vez, ou arquivo removido) */
  falhou: boolean;
}

interface Download {
  valor: string;
  uri: string | null;
  falhou: boolean;
}

/**
 * Valor da coluna (`file://` ou `midia:`) → arquivo que dá para abrir. Mídia de outro celular é
 * baixada uma vez e fica no cache (depois abre offline).
 */
export function useMidia(valor: string | null | undefined): MidiaParaExibir {
  const remota = ehMidiaRemota(valor);
  const noCelular = remota ? midiaNoCelular(caminhoDaMidia(valor)) : null;
  const [download, setDownload] = useState<Download | null>(null);

  useEffect(() => {
    if (!remota || noCelular) return;
    let ativo = true;
    baixarMidia(fazendaDaMidia(valor), caminhoDaMidia(valor)).then(
      (uri) => ativo && setDownload({ valor, uri, falhou: false }),
      () => ativo && setDownload({ valor, uri: null, falhou: true })
    );
    return () => {
      ativo = false;
    };
  }, [valor, remota, noCelular]);

  if (!valor) return { uri: null, carregando: false, falhou: false };
  if (!remota) return { uri: valor, carregando: false, falhou: false };
  if (noCelular) return { uri: noCelular, carregando: false, falhou: false };
  const baixado = download?.valor === valor ? download : null;
  return { uri: baixado?.uri ?? null, carregando: !baixado, falhou: baixado?.falhou ?? false };
}
