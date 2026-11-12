import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { mensagemDoErro } from '@/shared/api';
import { entrar, type Credencial } from './servicoConta';
import { campoDoErro, validarEmail, validarSenhaInformada } from './validacao';

/** Login: credencial → `POST /auth/login` → lista de fazendas (aceitando o convite guardado, se houver). */
export function useEntrar() {
  const router = useRouter();
  const [credencial, setCredencial] = useState<Credencial>({ tipo: 'senha', email: '', senha: '' });
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const concluir = async () => {
    const erro = validarEmail(credencial.email);
    const erroDaSenha = validarSenhaInformada(credencial.senha);
    setErroEmail(erro);
    setErroSenha(erroDaSenha);
    setErroGeral(null);
    if (erro || erroDaSenha) return;
    setEnviando(true);
    try {
      const convite = await entrar(credencial);
      if (convite === 'expirado') Alert.alert('Convite', 'Convite expirado, peça um novo ao dono da fazenda');
      if (convite === 'erro') Alert.alert('Convite', 'Não foi possível entrar na fazenda do convite agora.');
      router.replace('/fazendas');
    } catch (e) {
      // CREDENCIAL_INVALIDA: "E-mail ou senha incorretos." (a API não diz qual)
      const campo = campoDoErro(e, ['senha', 'email']);
      if (campo === 'senha') setErroSenha(mensagemDoErro(e));
      else if (campo === 'email') setErroEmail(mensagemDoErro(e));
      else setErroGeral(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return {
    setCredencial: (valor: Credencial) => {
      setCredencial(valor);
      setErroEmail(null);
      setErroSenha(null);
    },
    erroEmail,
    erroSenha,
    erroGeral,
    enviando,
    concluir,
  };
}
