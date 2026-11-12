import Storage from 'expo-sqlite/kv-store';

import type { EstiloMapa } from '../components/MapaBase';

/**
 * Camadas do mapa ligadas neste celular (RF-013). É preferência do aparelho:
 * fica no kv-store, não nas tabelas da fazenda, e não sobe no sync. Trajetos
 * entram aqui quando as máquinas chegarem ao mapa.
 */
export interface CamadasMapa {
  estilo: EstiloMapa;
  /** Polígonos das áreas, com nome e selo */
  areas: boolean;
  /** Pontos de atenção (praga, daninha, erosão) */
  pontos: boolean;
  /** Ocorrências abertas relatadas no campo (RF-T13) */
  ocorrencias: boolean;
  /** Rebanho: o selo de cabeças em cada pasto ocupado */
  rebanho: boolean;
}

export const CAMADAS_PADRAO: CamadasMapa = {
  estilo: 'satelite',
  areas: true,
  pontos: true,
  ocorrencias: true,
  rebanho: true,
};

const CHAVE = 'mapa.camadas';

/** Lê as camadas salvas; qualquer valor estranho volta ao padrão. */
export function lerCamadas(): CamadasMapa {
  try {
    const bruto = Storage.getItemSync(CHAVE);
    const lido = (bruto ? JSON.parse(bruto) : null) as Partial<CamadasMapa> | null;
    return {
      estilo: lido?.estilo === 'mapa' ? 'mapa' : CAMADAS_PADRAO.estilo,
      areas: typeof lido?.areas === 'boolean' ? lido.areas : CAMADAS_PADRAO.areas,
      pontos: typeof lido?.pontos === 'boolean' ? lido.pontos : CAMADAS_PADRAO.pontos,
      ocorrencias:
        typeof lido?.ocorrencias === 'boolean' ? lido.ocorrencias : CAMADAS_PADRAO.ocorrencias,
      rebanho: typeof lido?.rebanho === 'boolean' ? lido.rebanho : CAMADAS_PADRAO.rebanho,
    };
  } catch {
    return CAMADAS_PADRAO;
  }
}

export function salvarCamadas(camadas: CamadasMapa): void {
  try {
    Storage.setItemSync(CHAVE, JSON.stringify(camadas));
  } catch {
    // Sem armazenamento: a escolha vale só enquanto o mapa estiver aberto
  }
}
