import { is, SQL, Subquery } from 'drizzle-orm';
import type { AnySQLiteSelect } from 'drizzle-orm/sqlite-core';
import { SQLiteRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/query';
import { useEffect, useState } from 'react';

import { powersync } from '@/features/sync/db';
import { useFazendaDoContexto } from './fazendaDoContexto';

const ESPERA_MS = 40;

type ConsultaDrizzle = Pick<AnySQLiteSelect, '_' | 'then' | 'toSQL'> | SQLiteRelationalQuery<'async', unknown>;

/** Como no drizzle-orm: subconsulta ou SQL no FROM não tem tabela para observar. */
function erroDeFrom(consulta: ConsultaDrizzle): Error | undefined {
  const tabela = is(consulta, SQLiteRelationalQuery)
    ? null
    : (consulta as unknown as { config?: { table?: unknown } }).config?.table;
  return tabela && (is(tabela, Subquery) || is(tabela, SQL))
    ? new Error('useLiveQuery não aceita subconsulta ou SQL no FROM')
    : undefined;
}

/**
 * Consulta do Drizzle que se refaz sozinha quando muda alguma tabela dela (a do
 * FROM e as dos JOINs, resolvidas pelo PowerSync), inclusive pelo sync. Mesmo
 * formato do `useLiveQuery` do drizzle-orm: `data` começa em `[]` (ou
 * `undefined` no `findFirst`) e `updatedAt` marca a primeira leitura.
 *
 * A fazenda ativa entra nas deps sozinha: ao trocar de fazenda, a tela
 * re-renderiza, a consulta é montada de novo (com o filtro da nova) e o que foi
 * lido da anterior deixa de aparecer enquanto a nova carrega.
 */
export function useLiveQuery<T extends ConsultaDrizzle>(consulta: T, deps: unknown[] = []) {
  const primeiro = is(consulta, SQLiteRelationalQuery) && (consulta as unknown as { mode: string }).mode === 'first';
  const vazio = (primeiro ? undefined : []) as Awaited<T>;
  const fazendaId = useFazendaDoContexto();
  const [lido, setLido] = useState<{ fazendaId: string | null; data: Awaited<T>; updatedAt: Date } | null>(null);
  const [error, setError] = useState<Error>();

  const erroDoFrom = erroDeFrom(consulta);

  useEffect(() => {
    if (erroDoFrom) return;
    let ativo = true;
    let parar: (() => void) | undefined;

    const ler = () => {
      (consulta as PromiseLike<Awaited<T>>).then(
        (linhas) => {
          if (!ativo) return;
          setLido({ fazendaId, data: linhas, updatedAt: new Date() });
        },
        (erro: unknown) => {
          if (ativo) setError(erro instanceof Error ? erro : new Error(String(erro)));
        }
      );
    };

    ler();
    const { sql, params } = consulta.toSQL();
    powersync.resolveTables(sql, params).then(
      (tabelas) => {
        if (!ativo) return;
        parar = powersync.onChangeWithCallback({ onChange: ler }, { tables: tabelas, throttleMs: ESPERA_MS });
      },
      (erro: unknown) => {
        if (ativo) setError(erro instanceof Error ? erro : new Error(String(erro)));
      }
    );

    return () => {
      ativo = false;
      parar?.();
    };
    // Como no drizzle-orm: quem chama diz quando a consulta muda (deps), mais a fazenda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, fazendaId]);

  // Leitura de outra fazenda não vale: volta ao vazio até ler a atual
  const valido = lido !== null && lido.fazendaId === fazendaId;
  return {
    data: valido ? lido.data : vazio,
    error: erroDoFrom ?? error,
    updatedAt: valido ? lido.updatedAt : undefined,
  } as const;
}
