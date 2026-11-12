import { useState } from 'react';

import { definirFazendaAtiva } from '@/features/fazenda/fazendaAtiva';
import { ehErroApi, mensagemDoErro } from '@/shared/api';
import { aceitarConvite, normalizarCodigo, pareceCodigo } from './servicoConvite';

export const MENSAGEM_CODIGO_INVALIDO = 'Código inválido, já usado ou vencido. Peça um novo ao dono da fazenda.';

/**
 * Quem já tem conta digita o código que o dono passou e entra na fazenda como
 * colaborador. A fazenda aparece na lista quando o sync a trouxer.
 */
export function useEntrarComCodigo() {
  const [codigo, setCodigo] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Devolve se entrou na fazenda (a folha do código fecha). */
  const entrar = async (): Promise<boolean> => {
    if (!pareceCodigo(codigo)) {
      setErro('O código tem 6 letras e números.');
      return false;
    }
    setEntrando(true);
    setErro(null);
    try {
      const { fazendaId } = await aceitarConvite(normalizarCodigo(codigo));
      setCodigo('');
      definirFazendaAtiva(fazendaId);
      return true;
    } catch (e) {
      setErro(ehErroApi(e) && e.status === 410 ? MENSAGEM_CODIGO_INVALIDO : mensagemDoErro(e));
      return false;
    } finally {
      setEntrando(false);
    }
  };

  return {
    codigo,
    setCodigo: (valor: string) => {
      setCodigo(valor.toUpperCase());
      setErro(null);
    },
    entrando,
    erro,
    entrar,
  };
}
