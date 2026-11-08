import { and, eq, isNull } from 'drizzle-orm';
import { useMemo } from 'react';

import { db, maquinas, useLiveQuery, usosMaquina } from '@/database';
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

function usoAbertoNaMaquina(maquinaId: string) {
  return db
    .select()
    .from(usosMaquina)
    .where(and(eq(usosMaquina.maquinaId, maquinaId), isNull(usosMaquina.fim)))
    .limit(1);
}

function engateAberto(implementoId: string) {
  return db
    .select({ id: maquinas.id, nome: maquinas.nome })
    .from(usosMaquina)
    .innerJoin(maquinas, eq(maquinas.id, usosMaquina.maquinaId))
    .where(and(eq(usosMaquina.implementoId, implementoId), isNull(usosMaquina.fim)))
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
