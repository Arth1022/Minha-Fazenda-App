import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  alterarNome,
  atualizarPerfilLocal,
  enviarAvatar,
  escolherFotoDoAvatar,
  removerAvatar,
  useConta,
  validarNome,
} from '@/features/conta';
import { limparFazendaAtiva } from '@/features/fazenda';
import { contarPendentes } from '@/features/sync';
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

  const escolherDaGaleria = async () => {
    try {
      const uri = await escolherFotoDoAvatar();
      if (uri) await trocarFoto(uri);
    } catch (e) {
      setErro(mensagemDoErro(e, 'Não foi possível abrir a galeria.'));
    }
  };

  /** Toque no avatar: Escolher da galeria e, com foto, Remover foto. */
  const abrirOpcoesDaFoto = () => {
    Alert.alert('Foto do perfil', undefined, [
      { text: 'Escolher da galeria', onPress: () => void escolherDaGaleria() },
      ...(temFoto ? [{ text: 'Remover foto', style: 'destructive' as const, onPress: () => void trocarFoto(null) }] : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  const salvarNome = async () => {
    const invalido = validarNome(nome);
    setErroNome(invalido);
    setErro(null);
    setAviso(null);
    if (invalido) return;
    setSalvandoNome(true);
    try {
      if (semConta) {
        const perfil = await atualizarPerfilLocal(usuario.id, { nome });
        definirUsuarioAtual({ id: perfil.id, nome: perfil.nome, avatarUrl: perfil.fotoPath });
      } else {
        await alterarNome(nome);
      }
      setAviso('Nome salvo.');
    } catch (e) {
      const mensagem = semInternet(e, 'mudar o nome');
      if (ehErroApi(e, 'VALIDACAO')) setErroNome(mensagem);
      else setErro(mensagem);
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
    semConta,
    nome,
    setNome: (valor: string) => {
      setNome(valor);
      setErroNome(null);
    },
    erroNome,
    erro,
    aviso,
    enviandoFoto,
    salvandoNome,
    abrirOpcoesDaFoto,
    salvarNome,
    sairDaConta,
    trocarDeFazenda: () => {
      limparFazendaAtiva();
      router.replace({ pathname: '/fazendas', params: { trocar: '1' } });
    },
    abrirMembros: () => router.push('/membros'),
  };
}
