import { useEffect, useRef, useState } from 'react';

import { useConsultaAoVivo } from '@/database';
import { useJaSincronizou } from '@/features/sync';
import { useEstadoDaConta, useUsuarioAtual } from '@/services/usuario';
import { mensagemDoErro, ehErroApi, SEM_CONEXAO } from '@/shared/api';
import { minhasFazendas, TABELAS_FAZENDAS, type FazendaDoUsuario } from './consultas';
import { definirFazendaAtiva, fazendaAtivaSalva } from './fazendaAtiva';
import { useFazendaAtiva } from './FazendaAtivaProvider';
import { criarFazenda, validarNomeFazenda } from './servicoFazenda';

/**
 * Lista de fazendas do usuário (vem do sync) e "Criar fazenda". Com uma
 * fazenda só, abre direto nela — a não ser quando a pessoa veio trocar.
 */
export function useListaFazendas({ trocando = false }: { trocando?: boolean } = {}) {
  const usuario = useUsuarioAtual();
  const estado = useEstadoDaConta();
  const { aguardandoSync } = useFazendaAtiva();
  const jaSincronizou = useJaSincronizou();
  const { dados: fazendas, carregado } = useConsultaAoVivo<FazendaDoUsuario[]>(
    () => minhasFazendas(usuario.id, estado),
    TABELAS_FAZENDAS,
    `${usuario.id}:${estado}`,
    []
  );

  const abriuSozinha = useRef(false);
  useEffect(() => {
    if (trocando || abriuSozinha.current || !carregado || fazendas.length !== 1 || fazendaAtivaSalva()) return;
    abriuSozinha.current = true;
    definirFazendaAtiva(fazendas[0].id);
  }, [trocando, carregado, fazendas]);

  const [nomeNova, setNomeNova] = useState('');
  const [erroNova, setErroNova] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [avisoNova, setAvisoNova] = useState<string | null>(null);

  /** Devolve se a fazenda foi criada (a folha de "Nova fazenda" fecha). */
  const criar = async (): Promise<boolean> => {
    const erro = validarNomeFazenda(nomeNova);
    if (erro) {
      setErroNova(erro);
      return false;
    }
    setCriando(true);
    setErroNova(null);
    try {
      const criada = await criarFazenda(nomeNova);
      setNomeNova('');
      setAvisoNova(`${criada.nome} foi criada. Ela abre assim que sincronizar.`);
      definirFazendaAtiva(criada.id);
      return true;
    } catch (e) {
      setErroNova(
        ehErroApi(e, SEM_CONEXAO) ? 'Conecte-se à internet para criar a fazenda.' : mensagemDoErro(e)
      );
      return false;
    } finally {
      setCriando(false);
    }
  };

  return {
    fazendas,
    /** Ainda lendo, ou logado esperando o primeiro sync trazer as fazendas */
    carregando: !carregado || (estado === 'logado' && !jaSincronizou && fazendas.length === 0),
    aguardandoSync,
    podeCriar: estado === 'logado',
    escolher: (fazenda: FazendaDoUsuario) => definirFazendaAtiva(fazenda.id),
    nomeNova,
    setNomeNova: (nome: string) => {
      setNomeNova(nome);
      setErroNova(null);
    },
    erroNova,
    avisoNova,
    criando,
    criar,
  };
}
