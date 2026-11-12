import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { mensagemDoErro } from '@/shared/api';
import { entrar, type Credencial } from './servicoConta';
import { campoDoErro, validarEmail } from './validacao';

/** Login: credencial → `POST /auth/login` → lista de fazendas (aceitando o convite guardado, se houver). */
export function useEntrar() {
  const router = useRouter();
  const [credencial, setCredencial] = useState<Credencial>({ tipo: 'dev', email: '' });
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const concluir = async () => {
    const erro = validarEmail(credencial.email);
    setErroEmail(erro);
    setErroGeral(null);
    if (erro) return;
    setEnviando(true);
    try {
      const convite = await entrar(credencial);
      if (convite === 'expirado') Alert.alert('Convite', 'Convite expirado, peça um novo ao dono da fazenda');
      if (convite === 'erro') Alert.alert('Convite', 'Não foi possível entrar na fazenda do convite agora.');
      router.replace('/fazendas');
    } catch (e) {
      if (campoDoErro(e, ['email'])) setErroEmail(mensagemDoErro(e));
      else setErroGeral(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return {
    setCredencial: (valor: Credencial) => {
      setCredencial(valor);
      setErroEmail(null);
    },
    erroEmail,
    erroGeral,
    enviando,
    concluir,
  };
}
