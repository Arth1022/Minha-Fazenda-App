import type { TipoTalhao } from '@/database';
import { diasEntre } from '@/utils/date';

/**
 * "Onde está" na ficha do animal (M2, RF-023): o pasto de agora e por onde ele
 * passou. Funções puras sobre o histórico de movimentações.
 */

/** Uma passagem por um pasto (linha de `historicoDoAnimal`, da mais recente). */
export interface PassagemDoAnimal {
  areaId: string;
  areaNome: string;
  areaTipo: TipoTalhao;
  loteNome: string | null;
  entradaEm: Date;
  saidaEm: Date | null;
  registradoPor: string | null;
}

export interface ItemLocal {
  chave: string;
  /** Nome do pasto ou "Sem local" */
  titulo: string;
  semLocal: boolean;
  /** null: desde antes do primeiro pasto */
  de: Date | null;
  /** null: até hoje */
  ate: Date | null;
  /** null: sem começo conhecido */
  dias: number | null;
  por: string | null;
  atual: boolean;
}

/**
 * Linha do tempo do local (protótipo, tela 20): os pastos do mais recente e os
 * intervalos "Sem local" — agora, entre um pasto e outro e antes do primeiro.
 */
export function linhaDoTempoDoLocal(historico: readonly PassagemDoAnimal[], agora = new Date()): ItemLocal[] {
  const itens: ItemLocal[] = [];
  if (historico.length === 0) return itens;

  const maisRecente = historico[0];
  if (maisRecente.saidaEm !== null) {
    itens.push({
      chave: 'sem-local-agora',
      titulo: 'Sem local',
      semLocal: true,
      de: maisRecente.saidaEm,
      ate: null,
      dias: diasEntre(maisRecente.saidaEm, agora),
      por: null,
      atual: true,
    });
  }

  historico.forEach((passagem, indice) => {
    itens.push({
      chave: `${passagem.areaId}-${passagem.entradaEm.getTime()}`,
      titulo: passagem.areaNome,
      semLocal: false,
      de: passagem.entradaEm,
      ate: passagem.saidaEm,
      dias: diasEntre(passagem.entradaEm, passagem.saidaEm ?? agora),
      por: passagem.registradoPor,
      atual: passagem.saidaEm === null,
    });
    const anterior = historico[indice + 1];
    // Saiu de um pasto e só entrou no próximo depois: ficou sem local nesse meio-tempo
    if (anterior?.saidaEm && anterior.saidaEm.getTime() < passagem.entradaEm.getTime()) {
      itens.push({
        chave: `sem-local-${anterior.saidaEm.getTime()}`,
        titulo: 'Sem local',
        semLocal: true,
        de: anterior.saidaEm,
        ate: passagem.entradaEm,
        dias: diasEntre(anterior.saidaEm, passagem.entradaEm),
        por: null,
        atual: false,
      });
    }
  });

  const primeira = historico[historico.length - 1];
  itens.push({
    chave: 'sem-local-inicio',
    titulo: 'Sem local',
    semLocal: true,
    de: null,
    ate: primeira.entradaEm,
    dias: null,
    por: null,
    atual: false,
  });
  return itens;
}

export interface ResumoLocal {
  /** "Pasto 1" ou "Sem local definido" */
  titulo: string;
  /** "há 8 dias · Lote Novilhas" */
  detalhe: string | null;
}

/** Cartão "Onde está" da ficha. */
export function resumoDoLocal(
  atual: Pick<PassagemDoAnimal, 'areaNome' | 'entradaEm'> | null,
  loteNome: string | null,
  agora = new Date()
): ResumoLocal {
  const lote = loteNome ? `Lote ${loteNome}` : null;
  if (!atual) return { titulo: 'Sem local definido', detalhe: lote };
  const dias = diasEntre(atual.entradaEm, agora);
  const tempo = dias === 0 ? 'desde hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
  return { titulo: atual.areaNome, detalhe: [tempo, lote].filter(Boolean).join(' · ') };
}
