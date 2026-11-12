import { useState } from 'react';

import { validarNomeFazenda } from '@/features/fazenda';
import { mensagemDoErro } from '@/shared/api';
import { escolherFotoDoAvatar } from './avatarEPerfil';
import { entrarSemConta } from './servicoConta';
import { validarNome } from './validacao';

type Campo = 'nome' | 'nomeFazenda';

/**
 * Entrar sem conta: primeiro o aviso (dados só neste celular), depois o perfil
 * local (nome obrigatório, foto opcional) e a fazenda local (nome obrigatório).
 * Nenhuma requisição à API.
 */
export function useSemConta() {
  const [etapa, setEtapa] = useState<'aviso' | 'dados'>('aviso');
  const [nome, setNome] = useState('');
  const [nomeFazenda, setNomeFazenda] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const concluir = async () => {
    const novos = {
      nome: validarNome(nome) ?? undefined,
      nomeFazenda: validarNomeFazenda(nomeFazenda) ?? undefined,
    };
    setErros(novos);
    setErroGeral(null);
    if (novos.nome || novos.nomeFazenda) return;
    setSalvando(true);
    try {
      await entrarSemConta({ nome, fotoUri, nomeFazenda });
    } catch (e) {
      setErroGeral(mensagemDoErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return {
    etapa,
    continuar: () => setEtapa('dados'),
    nome,
    setNome: (valor: string) => {
      setNome(valor);
      setErros((e) => ({ ...e, nome: undefined }));
    },
    nomeFazenda,
    setNomeFazenda: (valor: string) => {
      setNomeFazenda(valor);
      setErros((e) => ({ ...e, nomeFazenda: undefined }));
    },
    fotoUri,
    escolherFoto: async () => {
      try {
        const uri = await escolherFotoDoAvatar();
        if (uri) setFotoUri(uri);
      } catch (e) {
        setErroGeral(mensagemDoErro(e, 'Não foi possível abrir a galeria.'));
      }
    },
    erros,
    erroGeral,
    salvando,
    concluir,
  };
}
