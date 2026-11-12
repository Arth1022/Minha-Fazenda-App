import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { conviteGuardado, MENSAGEM_CODIGO_INVALIDO, pareceCodigo } from '@/features/convite';
import { validarNomeFazenda } from '@/features/fazenda';
import type { OrigemFoto } from '@/services/fotos';
import { ehErroApi, mensagemDoErro } from '@/shared/api';
import { enviarAvatar, escolherFotoDoAvatar } from './avatarEPerfil';
import { registrar } from './servicoConta';
import { campoDoErro, validarEmail, validarNome, validarSenha } from './validacao';

type Campo = 'nome' | 'email' | 'senha' | 'nomeFazenda' | 'codigoConvite';
/** Passo 2: criar a própria fazenda (vira dono) ou entrar na de alguém com o código */
export type EscolhaFazenda = 'criar' | 'codigo';

const CAMPOS_DO_PASSO_1: readonly Campo[] = ['nome', 'email', 'senha'];

/**
 * Cadastro em dois passos: 1) foto opcional, nome, e-mail e senha; 2) a
 * fazenda (criar ou código). Com link de convite guardado, o passo 2 só
 * confirma a fazenda do convite. Ao concluir: registro, foto e a fazenda devolvida.
 */
export function useCadastro() {
  const router = useRouter();
  const [comLink] = useState(() => conviteGuardado() !== null);
  const [passo, setPasso] = useState<1 | 2>(1);
  const [escolha, setEscolha] = useState<EscolhaFazenda>('criar');
  const [codigoConvite, setCodigoConvite] = useState('');
  const comCodigo = !comLink && escolha === 'codigo';
  const comConvite = comLink || comCodigo;
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeFazenda, setNomeFazenda] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const limparErro = (campo: Campo) => setErros((atual) => ({ ...atual, [campo]: undefined }));

  const escolherFoto = async (origem: OrigemFoto) => {
    try {
      const uri = await escolherFotoDoAvatar(origem);
      if (uri) setFotoUri(uri);
    } catch (e) {
      setErroGeral(mensagemDoErro(e, 'Não foi possível abrir a câmera ou a galeria.'));
    }
  };

  /** Passo 1 → 2: confere nome, e-mail e senha antes (o e-mail repetido só a API sabe). */
  const avancar = () => {
    const novos: Partial<Record<Campo, string>> = {
      nome: validarNome(nome) ?? undefined,
      email: validarEmail(email) ?? undefined,
      senha: validarSenha(senha) ?? undefined,
    };
    setErros(novos);
    setErroGeral(null);
    if (!Object.values(novos).some(Boolean)) setPasso(2);
  };

  const concluir = async () => {
    const codigoVazio = comCodigo && codigoConvite.trim().length === 0;
    const novos: Partial<Record<Campo, string>> = {
      nomeFazenda: comConvite ? undefined : (validarNomeFazenda(nomeFazenda) ?? undefined),
      codigoConvite: codigoVazio
        ? 'Digite o código que o dono da fazenda passou.'
        : comCodigo && !pareceCodigo(codigoConvite)
          ? 'O código tem 6 letras e números.'
          : undefined,
    };
    setErros(novos);
    setErroGeral(null);
    if (Object.values(novos).some(Boolean)) return;

    setEnviando(true);
    try {
      await registrar({
        nome,
        credencial: { tipo: 'senha', email: email.trim(), senha },
        nomeFazenda,
        codigoConvite: comCodigo ? codigoConvite : null,
      });
    } catch (e) {
      setEnviando(false);
      if (comCodigo && ehErroApi(e) && e.status === 410) {
        setErros({ codigoConvite: MENSAGEM_CODIGO_INVALIDO });
        return;
      }
      const campo = campoDoErro<Campo>(e, comConvite ? ['senha', 'email', 'nome'] : ['nomeFazenda', 'senha', 'email', 'nome']);
      if (campo) {
        setErros({ [campo]: mensagemDoErro(e) });
        // E-mail já cadastrado, por exemplo: volta para o passo do campo
        if (CAMPOS_DO_PASSO_1.includes(campo)) setPasso(1);
      } else {
        setErroGeral(mensagemDoErro(e));
      }
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
    passo,
    avancar,
    voltar: () => {
      setErroGeral(null);
      setPasso(1);
    },
    comLink,
    escolha,
    setEscolha: (valor: EscolhaFazenda) => {
      setEscolha(valor);
      limparErro('nomeFazenda');
      limparErro('codigoConvite');
    },
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
    email,
    setEmail: (valor: string) => {
      setEmail(valor);
      limparErro('email');
    },
    senha,
    setSenha: (valor: string) => {
      setSenha(valor);
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
