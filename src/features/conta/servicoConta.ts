import { conviteGuardado, esquecerConvite, aceitarConvite } from '@/features/convite';
import {
  carregarFazendaAtiva,
  criarFazendaLocal,
  definirFazendaAtiva,
  limparFazendaAtiva,
} from '@/features/fazenda';
import { conectarSync, desconectarELimpar, desconectarSync } from '@/features/sync';
import { definirEstadoDaConta, definirUsuarioAtual, estadoDaConta } from '@/services/usuario';
import { api, configurarSessaoDaApi, ehErroApi, ErroApi } from '@/shared/api';
import { obterDeviceId } from '@/shared/deviceId';
import { criarPerfilLocal, lerPerfilLocal } from './perfilLocal';
import {
  accessTokenAtual,
  carregarSessao,
  limparSessao,
  limparTokens,
  refreshTokenAtual,
  salvarModo,
  salvarTokens,
  salvarUsuario,
  sessaoEmMemoria,
  type UsuarioDaSessao,
} from './sessao';

/**
 * Conta: cadastro, login, refresh, saída e o modo sem conta. As funções mudam
 * o estado guardado em `services/usuario` (o AuthContext só lê e repassa).
 */

/**
 * Credencial do login. Só a versão dev (e-mail) por enquanto.
 * TODO(decisao): método de login (o "code"): e-mail + código, Google ou Firebase.
 */
export type Credencial = { tipo: 'dev'; email: string };

interface RespostaTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RespostaLogin extends RespostaTokens {
  usuario: UsuarioDaSessao;
}

interface RespostaRegistro extends RespostaLogin {
  fazendaId: string;
}

export interface DadosCadastro {
  nome: string;
  credencial: Credencial;
  /** Obrigatório sem convite; ignorado com convite */
  nomeFazenda: string;
}

/** Como ficou o convite guardado depois de entrar. */
export type ResultadoConvite = 'aceito' | 'expirado' | 'erro' | null;

function comoUsuario(u: UsuarioDaSessao): UsuarioDaSessao {
  return { id: u.id, nome: u.nome, avatarUrl: u.avatarUrl ?? null };
}

/** `401 SESSAO_ENCERRADA`: limpa os tokens e vai para o login, sem apagar o que está na fila. */
export async function encerrarSessao(): Promise<void> {
  if (estadoDaConta() !== 'logado') return;
  definirEstadoDaConta('deslogado');
  await desconectarSync().catch(() => undefined);
  await limparTokens().catch(() => undefined);
}

/** Troca o refresh token por um par novo (`POST /auth/refresh`). */
export async function renovarSessao(): Promise<void> {
  const refreshToken = refreshTokenAtual();
  if (!refreshToken) throw new ErroApi(401, 'SESSAO_ENCERRADA', 'Entre de novo na sua conta.');
  try {
    const tokens = await api<RespostaTokens>('/auth/refresh', {
      metodo: 'POST',
      corpo: { refreshToken, deviceId: await obterDeviceId() },
      autenticado: false,
    });
    await salvarTokens(tokens.accessToken, tokens.refreshToken);
  } catch (erro) {
    // Refresh recusado (expirou, revogado ou reusado): a sessão acabou
    if (ehErroApi(erro) && erro.status === 401) {
      await encerrarSessao();
      throw new ErroApi(401, 'SESSAO_ENCERRADA', erro.message);
    }
    throw erro;
  }
}

/** Liga o cliente da API à sessão (token, refresh e fim da sessão). */
export function ligarApiASessao(): void {
  configurarSessaoDaApi({
    accessToken: accessTokenAtual,
    renovar: renovarSessao,
    aoEncerrarSessao: () => {
      void encerrarSessao();
    },
  });
}

let iniciada: Promise<void> | null = null;

/**
 * Abertura do app: lê a sessão guardada e a fazenda ativa. Logado (mesmo sem
 * internet ou com o token vencido) abre direto: o token só importa para o sync.
 */
export function iniciarConta(): Promise<void> {
  if (iniciada) return iniciada;
  iniciada = (async () => {
    ligarApiASessao();
    carregarFazendaAtiva();
    const sessao = await carregarSessao().catch(() => sessaoEmMemoria());
    if (sessao.modo === 'logado' && sessao.refreshToken && sessao.usuario) {
      definirUsuarioAtual(sessao.usuario);
      definirEstadoDaConta('logado');
      conectarSync();
      return;
    }
    if (sessao.modo === 'sem-conta') {
      const perfil = await lerPerfilLocal().catch(() => null);
      if (perfil) {
        definirUsuarioAtual({ id: perfil.id, nome: perfil.nome, avatarUrl: perfil.fotoPath });
        definirEstadoDaConta('sem-conta');
        return;
      }
    }
    definirEstadoDaConta('deslogado');
  })();
  return iniciada;
}

/**
 * Depois do login ou do cadastro: guarda a sessão e liga o sync. Se outra
 * pessoa usava o celular, os dados dela saem antes (cada conta vê só as fazendas dela).
 */
async function aplicarLogin(resposta: RespostaLogin): Promise<void> {
  const usuario = comoUsuario(resposta.usuario);
  const anterior = sessaoEmMemoria().usuario;
  if (anterior && anterior.id !== usuario.id) {
    await desconectarELimpar().catch(() => undefined);
    limparFazendaAtiva();
  }
  await salvarTokens(resposta.accessToken, resposta.refreshToken);
  await salvarUsuario(usuario);
  await salvarModo('logado');
  definirUsuarioAtual(usuario);
  definirEstadoDaConta('logado');
  conectarSync();
}

/**
 * `POST /auth/registro`. Com convite guardado, entra na fazenda dele (como
 * colaborador) e o nome da fazenda não vai; sem convite, cria a fazenda.
 * Abre a fazenda devolvida em `fazendaId`.
 */
export async function registrar(dados: DadosCadastro): Promise<RespostaRegistro> {
  const conviteToken = conviteGuardado();
  const resposta = await api<RespostaRegistro>('/auth/registro', {
    metodo: 'POST',
    autenticado: false,
    corpo: {
      nome: dados.nome.trim(),
      credencial: dados.credencial,
      deviceId: await obterDeviceId(),
      nomeFazenda: conviteToken ? null : dados.nomeFazenda.trim(),
      conviteToken: conviteToken ?? null,
    },
  });
  await aplicarLogin(resposta);
  if (conviteToken) esquecerConvite();
  if (resposta.fazendaId) definirFazendaAtiva(resposta.fazendaId);
  return resposta;
}

/** `POST /auth/login`; com convite guardado, aceita logo depois e abre a fazenda dele. */
export async function entrar(credencial: Credencial): Promise<ResultadoConvite> {
  const resposta = await api<RespostaLogin>('/auth/login', {
    metodo: 'POST',
    autenticado: false,
    corpo: { credencial, deviceId: await obterDeviceId() },
  });
  await aplicarLogin(resposta);

  const token = conviteGuardado();
  if (!token) return null;
  try {
    const { fazendaId } = await aceitarConvite(token);
    esquecerConvite();
    definirFazendaAtiva(fazendaId);
    return 'aceito';
  } catch (erro) {
    if (ehErroApi(erro) && erro.status === 410) {
      esquecerConvite();
      return 'expirado';
    }
    return 'erro';
  }
}

/**
 * Modo sem conta: perfil local e a primeira fazenda local, sem nenhuma
 * requisição à API. `connect()` nunca é chamado neste modo.
 */
export async function entrarSemConta(dados: { nome: string; fotoUri: string | null; nomeFazenda: string }) {
  const perfil = await criarPerfilLocal(dados.nome, dados.fotoUri);
  definirUsuarioAtual({ id: perfil.id, nome: perfil.nome, avatarUrl: perfil.fotoPath });
  const fazendaId = await criarFazendaLocal(dados.nomeFazenda);
  await salvarModo('sem-conta');
  definirFazendaAtiva(fazendaId);
  definirEstadoDaConta('sem-conta');
}

/**
 * Saída: revoga a sessão na API (se der), para o sync e apaga os dados locais.
 * O próximo login baixa tudo de novo.
 */
export async function sair(): Promise<void> {
  const refreshToken = refreshTokenAtual();
  if (refreshToken) {
    await api('/auth/logout', { metodo: 'POST', corpo: { refreshToken } }).catch(() => undefined);
  }
  limparFazendaAtiva();
  await desconectarELimpar().catch(() => undefined);
  await limparSessao();
  definirUsuarioAtual(null);
  definirEstadoDaConta('deslogado');
}

/** Nome ou foto mudou: atualiza o `usuario` da sessão (os colegas recebem pelo sync). */
export async function atualizarUsuarioDaSessao(usuario: UsuarioDaSessao): Promise<void> {
  await salvarUsuario(comoUsuario(usuario));
  definirUsuarioAtual(comoUsuario(usuario));
}
