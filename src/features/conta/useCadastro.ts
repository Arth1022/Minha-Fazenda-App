import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { conviteGuardado, MENSAGEM_CODIGO_INVALIDO, pareceCodigo } from '@/features/convite';
import { validarNomeFazenda } from '@/features/fazenda';
import { ehErroApi, mensagemDoErro } from '@/shared/api';
import { enviarAvatar, escolherFotoDoAvatar } from './avatarEPerfil';
import { registrar, type Credencial } from './servicoConta';
import { campoDoErro, validarEmail, validarNome, validarSenha } from './validacao';

type Campo = 'nome' | 'email' | 'senha' | 'nomeFazenda' | 'codigoConvite';

/**
 * Cadastro: nome, credencial, nome da fazenda (escondido com convite) e avatar
 * opcional. Ao concluir: registro, foto (se escolheu) e a fazenda devolvida.
 */
export function useCadastro() {
  const router = useRouter();
  // Link de convite guardado, ou código digitado: entra numa fazenda em vez de criar
  const [comLink] = useState(() => conviteGuardado() !== null);
  const [codigoConvite, setCodigoConvite] = useState('');
  const comCodigo = !comLink && codigoConvite.trim().length > 0;
  const comConvite = comLink || comCodigo;
  const [nome, setNome] = useState('');
  const [credencial, setCredencial] = useState<Credencial>({ tipo: 'senha', email: '', senha: '' });
  const [nomeFazenda, setNomeFazenda] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const limparErro = (campo: Campo) => setErros((atual) => ({ ...atual, [campo]: undefined }));

  const escolherFoto = async () => {
    try {
      const uri = await escolherFotoDoAvatar();
      if (uri) setFotoUri(uri);
    } catch (e) {
      setErroGeral(mensagemDoErro(e, 'Não foi possível abrir a galeria.'));
    }
  };

  const concluir = async () => {
    const novos: Partial<Record<Campo, string>> = {
      nome: validarNome(nome) ?? undefined,
      email: validarEmail(credencial.email) ?? undefined,
      senha: validarSenha(credencial.senha) ?? undefined,
      nomeFazenda: comConvite ? undefined : (validarNomeFazenda(nomeFazenda) ?? undefined),
      codigoConvite: comCodigo && !pareceCodigo(codigoConvite) ? 'O código tem 6 letras e números.' : undefined,
    };
    setErros(novos);
    setErroGeral(null);
    if (Object.values(novos).some(Boolean)) return;

    setEnviando(true);
    try {
      await registrar({ nome, credencial, nomeFazenda, codigoConvite: comCodigo ? codigoConvite : null });
    } catch (e) {
      if (comCodigo && ehErroApi(e) && e.status === 410) {
        setErros({ codigoConvite: MENSAGEM_CODIGO_INVALIDO });
        setEnviando(false);
        return;
      }
      const campo = campoDoErro<Campo>(e, comConvite ? ['senha', 'email', 'nome'] : ['nomeFazenda', 'senha', 'email', 'nome']);
      if (campo) setErros({ [campo]: mensagemDoErro(e) });
      else setErroGeral(mensagemDoErro(e));
      setEnviando(false);
      return;
    }
    // A conta já existe: a foto é um extra (sem ela, fica a letra)
    if (fotoUri) {
      await enviarAvatar(fotoUri).catch((e: unknown) => {
        Alert.alert('Foto', `A conta foi criada, mas a foto não foi enviada. ${mensagemDoErro(e)}`);
      });
    }
    setEnviando(false);
    router.replace('/fazendas');
  };

  return {
    comConvite,
    comLink,
    codigoConvite,
    setCodigoConvite: (valor: string) => {
      setCodigoConvite(valor.toUpperCase());
      limparErro('codigoConvite');
    },
    nome,
    setNome: (valor: string) => {
      setNome(valor);
      limparErro('nome');
    },
    setCredencial: (valor: Credencial) => {
      setCredencial(valor);
      limparErro('email');
      limparErro('senha');
    },
    nomeFazenda,
    setNomeFazenda: (valor: string) => {
      setNomeFazenda(valor);
      limparErro('nomeFazenda');
    },
    fotoUri,
    escolherFoto,
    tirarFoto: () => setFotoUri(null),
    erros,
    erroGeral,
    enviando,
    concluir,
  };
}
