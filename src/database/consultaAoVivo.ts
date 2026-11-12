import { useEffect, useState } from 'react';

import { powersync } from '@/features/sync/db';
import { useFazendaDoContexto } from './fazendaDoContexto';

/** Espera para juntar as mudanças de uma transação (mover 18 animais = 36 linhas) numa leitura só. */
const ESPERA_MS = 40;

export interface ConsultaAoVivo<T> {
  dados: T;
  /** Já leu do banco pelo menos uma vez (ou falhou) */
  carregado: boolean;
  erro?: Error;
}

/**
 * Refaz a consulta quando muda QUALQUER uma das `tabelas` (as dos JOINs também,
 * e também quando o sync desce dados novos) e junta as mudanças de uma mesma
 * escrita numa reconsulta só. `chave` identifica a consulta (ex.: o id da
 * área): mudou, consulta de novo. Trocar a fazenda ativa também refaz, e o que
 * foi lido da fazenda anterior não aparece enquanto a nova carrega.
 */
export function useConsultaAoVivo<T>(
  consultar: () => PromiseLike<T>,
  tabelas: readonly string[],
  chave: string,
  inicial: T
): ConsultaAoVivo<T> {
  const fazendaId = useFazendaDoContexto();
  const [estado, setEstado] = useState<ConsultaAoVivo<T> & { fazendaId: string | null }>({
    dados: inicial,
    carregado: false,
    fazendaId,
  });

  useEffect(() => {
    let ativo = true;

    const ler = () => {
      consultar().then(
        (dados) => {
          if (ativo) setEstado({ dados, carregado: true, fazendaId });
        },
        (erro: unknown) => {
          if (ativo) {
            setEstado((atual) => ({
              ...atual,
              carregado: true,
              fazendaId,
              erro: erro instanceof Error ? erro : new Error(String(erro)),
            }));
          }
        }
      );
    };

    ler();
    const parar = powersync.onChangeWithCallback(
      { onChange: () => ler() },
      { tables: [...tabelas], throttleMs: ESPERA_MS }
    );
    return () => {
      ativo = false;
      parar();
    };
    // A consulta e as tabelas são as de quem chamou; a `chave` (e a fazenda) dizem quando refazer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, fazendaId]);

  // Leitura de outra fazenda não vale: volta ao inicial até ler a atual
  if (estado.fazendaId !== fazendaId) return { dados: inicial, carregado: false };
  return estado;
}
