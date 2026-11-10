import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/** Espera para juntar as mudanças de uma transação (mover 18 animais = 36 linhas) numa leitura só. */
const ESPERA_MS = 40;

export interface ConsultaAoVivo<T> {
  dados: T;
  /** Já leu do banco pelo menos uma vez (ou falhou) */
  carregado: boolean;
  erro?: Error;
}

/**
 * Como o `useLiveQuery` do Drizzle, que só reconsulta quando muda a tabela do
 * FROM: este refaz a consulta quando muda QUALQUER uma das `tabelas` (as dos
 * JOINs também) e junta as mudanças de uma mesma escrita numa reconsulta só.
 * `chave` identifica a consulta (ex.: o id da área): mudou, consulta de novo.
 */
export function useConsultaAoVivo<T>(
  consultar: () => PromiseLike<T>,
  tabelas: readonly string[],
  chave: string,
  inicial: T
): ConsultaAoVivo<T> {
  const [estado, setEstado] = useState<ConsultaAoVivo<T>>({ dados: inicial, carregado: false });

  useEffect(() => {
    let ativo = true;
    let agendada: ReturnType<typeof setTimeout> | null = null;

    const ler = () => {
      agendada = null;
      consultar().then(
        (dados) => {
          if (ativo) setEstado({ dados, carregado: true });
        },
        (erro: unknown) => {
          if (ativo) {
            setEstado((atual) => ({
              ...atual,
              carregado: true,
              erro: erro instanceof Error ? erro : new Error(String(erro)),
            }));
          }
        }
      );
    };

    ler();
    const inscricao = addDatabaseChangeListener(({ tableName }) => {
      if (agendada === null && tabelas.includes(tableName)) agendada = setTimeout(ler, ESPERA_MS);
    });
    return () => {
      ativo = false;
      if (agendada !== null) clearTimeout(agendada);
      inscricao.remove();
    };
    // A consulta e as tabelas são as de quem chamou; a `chave` diz quando refazer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return estado;
}
