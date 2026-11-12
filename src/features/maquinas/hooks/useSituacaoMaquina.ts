import { and, eq, isNull } from 'drizzle-orm';
import { useMemo } from 'react';

import { daFazenda, db, maquinas, naoApagado, useLiveQuery, usosMaquina } from '@/database';
import type { Maquina, OcorrenciaMaquina, UsoMaquina } from '@/dtos';
import { usuarioAtual } from '@/services/usuario';
import { problemasAbertos } from '../data/ocorrencias';
import { condicaoDaMaquina, type CondicaoMaquina } from '../services/registros';

export interface SituacaoMaquina {
  condicao: CondicaoMaquina;
  problemas: OcorrenciaMaquina[];
  /** Uso aberto na máquina, de quem for */
  usoAberto: UsoMaquina | null;
  /** O uso aberto é de outra pessoa (o QR oferece "Assumir") */
  deOutraPessoa: boolean;
  /** Implemento: a máquina em que está engatado agora */
  engatadoEm: Pick<Maquina, 'id' | 'nome'> | null;
}

// daFazenda também tira os apagados: um uso descartado (ligado sem querer) fica
// com deleted_at e, nos dados antigos, sem fim; sem o filtro a máquina aparecia
// "em uso" para sempre e o "Desligar" falhava com "A máquina não está em uso".
function usoAbertoNaMaquina(maquinaId: string) {
  return db
    .select()
    .from(usosMaquina)
    .where(and(daFazenda(usosMaquina), eq(usosMaquina.maquinaId, maquinaId), isNull(usosMaquina.fim)))
    .limit(1);
}

function engateAberto(implementoId: string) {
  return db
    .select({ id: maquinas.id, nome: maquinas.nome })
    .from(usosMaquina)
    .innerJoin(maquinas, and(eq(maquinas.id, usosMaquina.maquinaId), naoApagado(maquinas)))
    .where(and(daFazenda(usosMaquina), eq(usosMaquina.implementoId, implementoId), isNull(usosMaquina.fim)))
    .limit(1);
}

/** Situação ao vivo da máquina: problemas em aberto, quem está usando e engate. */
export function useSituacaoMaquina(maquina: Pick<Maquina, 'id' | 'status'> | null): SituacaoMaquina {
  const id = maquina?.id ?? '';
  const { data: problemas } = useLiveQuery(problemasAbertos(id), [id]);
  const { data: abertos } = useLiveQuery(usoAbertoNaMaquina(id), [id]);
  const { data: engates } = useLiveQuery(engateAberto(id), [id]);

  return useMemo(() => {
    const usoAberto = abertos[0] ?? null;
    return {
      condicao: maquina ? condicaoDaMaquina(maquina, problemas) : 'ok',
      problemas,
      usoAberto,
      // Sem operador: uso de antes do registro de quem opera, feito neste celular
      deOutraPessoa: usoAberto?.operadorId != null && usoAberto.operadorId !== usuarioAtual().id,
      engatadoEm: engates[0] ?? null,
    };
  }, [maquina, problemas, abertos, engates]);
}
