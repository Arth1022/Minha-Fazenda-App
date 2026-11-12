import { is, SQL, Subquery } from 'drizzle-orm';
import type { AnySQLiteSelect } from 'drizzle-orm/sqlite-core';
import { SQLiteRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/query';
import { useEffect, useState } from 'react';

import { powersync } from '@/features/sync/db';

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
 */
export function useLiveQuery<T extends ConsultaDrizzle>(consulta: T, deps: unknown[] = []) {
  const primeiro = is(consulta, SQLiteRelationalQuery) && (consulta as unknown as { mode: string }).mode === 'first';
  const [data, setData] = useState<Awaited<T>>((primeiro ? undefined : []) as Awaited<T>);
  const [error, setError] = useState<Error>();
  const [updatedAt, setUpdatedAt] = useState<Date>();

  const erroDoFrom = erroDeFrom(consulta);

  useEffect(() => {
    if (erroDoFrom) return;
    let ativo = true;
    let parar: (() => void) | undefined;

    const ler = () => {
      (consulta as PromiseLike<Awaited<T>>).then(
        (linhas) => {
          if (!ativo) return;
          setData(linhas);
          setUpdatedAt(new Date());
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
    // Como no drizzle-orm: quem chama diz quando a consulta muda (deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error: erroDoFrom ?? error, updatedAt } as const;
}
