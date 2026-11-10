import type { UsoMaquina } from '@/dtos';

/** Marca do uso para o dono: como foi registrado ou encerrado. */
export interface MarcaUso {
  texto: string;
  /** "atencao" pede o olhar do dono; "info" é só contexto */
  tom: 'atencao' | 'info';
}

type UsoMarcavel = Pick<
  UsoMaquina,
  'origem' | 'fimMotivo' | 'rastreado' | 'segSemSinal' | 'localizacaoSimulada' | 'fim'
>;

/** Segundos sem sinal a partir dos quais vale marcar (abaixo disso é ruído). */
const SEM_SINAL_RELEVANTE_S = 60;

/**
 * Marcas do histórico: "manual", "encerrada pelo app", "sem sinal",
 * "localização simulada", "sem GPS" e "assumida".
 */
export function marcasDoUso(uso: UsoMarcavel): MarcaUso[] {
  const marcas: MarcaUso[] = [];
  if (uso.origem === 'manual') marcas.push({ texto: 'Registro manual', tom: 'atencao' });
  if (uso.fimMotivo === 'parada' || uso.fimMotivo === 'pausa' || uso.fimMotivo === 'velocidade') {
    marcas.push({ texto: 'Encerrada pelo app', tom: 'atencao' });
  }
  if (uso.fimMotivo === 'assumida') marcas.push({ texto: 'Assumida por outra pessoa', tom: 'info' });
  if (uso.localizacaoSimulada) marcas.push({ texto: 'Localização simulada', tom: 'atencao' });
  if ((uso.segSemSinal ?? 0) >= SEM_SINAL_RELEVANTE_S) marcas.push({ texto: 'Sem sinal', tom: 'info' });
  if (uso.origem === 'app' && !uso.rastreado && uso.fim) marcas.push({ texto: 'Sem GPS', tom: 'info' });
  return marcas;
}
