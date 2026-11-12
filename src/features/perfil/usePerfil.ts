import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  alterarNome,
  atualizarPerfilLocal,
  enviarAvatar,
  escolherFotoDoAvatar,
  removerAvatar,
  sessaoEmMemoria,
  useConta,
  validarNome,
} from '@/features/conta';
import { contarPendentes } from '@/features/sync';
import type { OrigemFoto } from '@/services/fotos';
import { definirUsuarioAtual } from '@/services/usuario';
import { ehErroApi, mensagemDoErro, SEM_CONEXAO } from '@/shared/api';

const AVISO_PENDENTES =
  'Você tem alterações não enviadas. Conecte-se à internet antes de sair ou elas serão perdidas';
const AVISO_SEM_CONTA =
  'Sem conta, os dados ficam só neste celular. Ao sair, o seu perfil, as fazendas, os animais, as fotos e todos os registros serão apagados e não dá para recuperar.';

function perguntar(titulo: string, mensagem: string, confirmar: string): Promise<boolean> {
  return new Promise((resolver) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: confirmar, style: 'destructive', onPress: () => resolver(true) },
    ]);
  });
}

/**
 * Perfil: foto, nome e saída. Com conta, foto e nome mudam pela API (precisa
 * de internet) e a sessão é atualizada; sem conta, ficam no perfil local.
 */
export function usePerfil() {
  const router = useRouter();
  const { estado, usuario, sair } = useConta();
  const semConta = estado === 'sem-conta';
  const [nome, setNome] = useState(usuario.nome);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const temFoto = Boolean(usuario.avatarUrl);

  const semInternet = (e: unknown, acao: string) =>
    ehErroApi(e, SEM_CONEXAO) ? `Conecte-se à internet para ${acao}` : mensagemDoErro(e);

  const trocarFoto = async (uri: string | null) => {
    setEnviandoFoto(true);
    setErro(null);
    setAviso(null);
    try {
      if (semConta) {
        const perfil = await atualizarPerfilLocal(usuario.id, { fotoUri: uri });
        definirUsuarioAtual({ id: perfil.id, nome: perfil.nome, avatarUrl: perfil.fotoPath });
      } else if (uri) {
        await enviarAvatar(uri);
      } else {
        await removerAvatar();
      }
    } catch (e) {
      setErro(semInternet(e, uri ? 'trocar a foto' : 'remover a foto'));
    } finally {
      setEnviandoFoto(false);
    }
  };

  /** Câmera ou galeria (escolhida na folha "Foto do perfil") e já envia. */
  const escolherFoto = async (origem: OrigemFoto) => {
    try {
      const uri = await escolherFotoDoAvatar(origem);
      if (uri) await trocarFoto(uri);
    } catch (e) {
      setErro(mensagemDoErro(e, 'Não foi possível abrir a câmera ou a galeria.'));
    }
  };

  /** Devolve se o nome foi salvo (a folha de editar fecha). */
  const salvarNome = async (): Promise<boolean> => {
    const invalido = validarNome(nome);
    setErroNome(invalido);
    setErro(null);
    setAviso(null);
    if (invalido) return false;
    setSalvandoNome(true);
    try {
      if (semConta) {
        const perfil = await atualizarPerfilLocal(usuario.id, { nome });
        definirUsuarioAtual({ id: perfil.id, nome: perfil.nome, avatarUrl: perfil.fotoPath });
      } else {
        await alterarNome(nome);
      }
      setAviso('Nome salvo.');
      return true;
    } catch (e) {
      // O erro aparece no campo da folha de editar, que continua aberta
      setErroNome(semInternet(e, 'mudar o nome'));
      return false;
    } finally {
      setSalvandoNome(false);
    }
  };

  /**
   * Sair: com escritas na fila de upload, avisa que elas se perdem e pede
   * confirmação. Sem conta, sempre pede: os dados só existem neste celular.
   */
  const sairDaConta = async () => {
    if (semConta) {
      if (!(await perguntar('Sair e apagar tudo', AVISO_SEM_CONTA, 'Apagar e sair'))) return;
    } else {
      const pendentes = await contarPendentes().catch(() => 0);
      if (pendentes > 0 && !(await perguntar('Sair', AVISO_PENDENTES, 'Sair mesmo assim'))) return;
    }
    try {
      await sair();
    } catch (e) {
      setErro(mensagemDoErro(e));
    }
  };

  return {
    usuario,
    /** E-mail digitado ao entrar (a API não devolve); null sem conta */
    email: semConta ? null : sessaoEmMemoria().email,
    semConta,
    nome,
    setNome: (valor: string) => {
      setNome(valor);
      setErroNome(null);
    },
    /** Abre a edição do nome com o nome atual */
    comecarEdicaoDoNome: () => {
      setNome(usuario.nome);
      setErroNome(null);
    },
    erroNome,
    erro,
    aviso,
    enviandoFoto,
    salvandoNome,
    temFoto,
    escolherFoto,
    removerFoto: () => void trocarFoto(null),
    salvarNome,
    sairDaConta,
    // A fazenda atual fica aberta (marcada na lista) até a pessoa escolher outra
    trocarDeFazenda: () => router.push({ pathname: '/fazendas', params: { trocar: '1' } }),
    abrirMembros: () => router.push('/membros'),
  };
}
