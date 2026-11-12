/**
 * Cliente da API (Spring Boot). Toda rota fora de `/auth/*` vai com
 * `Authorization: Bearer <accessToken>`. Num `401 TOKEN_INVALIDO` faz um único
 * refresh (chamadas simultâneas esperam o mesmo) e repete a chamada uma vez.
 * Tokens nunca vão para o log.
 */

const URL_BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

/** Sem resposta em 20 s: trata como sem conexão (sinal fraco no campo). */
const TEMPO_LIMITE_MS = 20_000;

export const SEM_CONEXAO = 'SEM_CONEXAO';

/** Erro no formato do contrato: `{ erro: "<CODIGO>", mensagem: "<texto para o usuário>" }`. */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string
  ) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}

export function ehErroApi(erro: unknown, codigo?: string): erro is ErroApi {
  return erro instanceof ErroApi && (codigo === undefined || erro.codigo === codigo);
}

/** Textos do app para os códigos em que o contrato pede uma explicação própria. */
const MENSAGEM_POR_CODIGO: Record<string, string> = {
  ULTIMO_OWNER: 'A fazenda precisa de pelo menos um dono. Promova outra pessoa a dono antes.',
  CONVITE_INVALIDO: 'Convite expirado, peça um novo ao dono da fazenda',
  APP_DESATUALIZADO: 'Atualize o app para continuar sincronizando',
};

/**
 * Mensagem para mostrar ao usuário: a explicação do app para os códigos do
 * contrato que pedem uma, senão a `mensagem` que veio da API.
 */
export function mensagemDoErro(erro: unknown, padrao = 'Não deu certo. Tente de novo.'): string {
  if (erro instanceof ErroApi && MENSAGEM_POR_CODIGO[erro.codigo]) return MENSAGEM_POR_CODIGO[erro.codigo];
  if (erro instanceof Error && erro.message) return erro.message;
  return padrao;
}

/**
 * O que o cliente precisa da sessão (quem implementa é a conta): o token
 * atual, como renovar e o que fazer quando a sessão acaba.
 */
export interface SessaoDaApi {
  accessToken(): string | null;
  /** Troca o refresh token por um par novo; lança ErroApi se não der */
  renovar(): Promise<void>;
  /** `401 SESSAO_ENCERRADA`: limpar os tokens e voltar para o login */
  aoEncerrarSessao(): void;
}

let sessao: SessaoDaApi | null = null;
let renovacao: Promise<void> | null = null;

export function configurarSessaoDaApi(nova: SessaoDaApi | null): void {
  sessao = nova;
}

export interface OpcoesApi {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Corpo em JSON */
  corpo?: unknown;
  /** Corpo multipart (ex.: avatar no campo "arquivo") */
  formulario?: FormData;
  /** Rotas de `/auth/*` (menos logout e powersync-token) vão sem token */
  autenticado?: boolean;
}

async function enviar(caminho: string, opcoes: OpcoesApi, token: string | null): Promise<Response> {
  if (!URL_BASE) throw new ErroApi(0, 'SEM_API', 'Endereço da API não configurado (EXPO_PUBLIC_API_URL).');
  const cabecalhos: Record<string, string> = { Accept: 'application/json' };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  let corpo: BodyInit | undefined;
  if (opcoes.formulario) {
    corpo = opcoes.formulario;
  } else if (opcoes.corpo !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
    corpo = JSON.stringify(opcoes.corpo);
  }
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    return await fetch(`${URL_BASE}${caminho}`, {
      method: opcoes.metodo ?? 'GET',
      headers: cabecalhos,
      body: corpo,
      signal: controle.signal,
    });
  } catch {
    throw new ErroApi(0, SEM_CONEXAO, 'Sem conexão com a internet. Tente de novo quando tiver sinal.');
  } finally {
    clearTimeout(limite);
  }
}

async function lerErro(resposta: Response): Promise<ErroApi> {
  let corpo: { erro?: unknown; mensagem?: unknown } = {};
  try {
    corpo = await resposta.json();
  } catch {
    // Corpo vazio ou fora do formato: fica a mensagem padrão
  }
  const codigo = typeof corpo.erro === 'string' ? corpo.erro : `HTTP_${resposta.status}`;
  const mensagem =
    typeof corpo.mensagem === 'string' && corpo.mensagem
      ? corpo.mensagem
      : resposta.status >= 500
        ? 'O servidor não respondeu direito. Tente de novo daqui a pouco.'
        : 'Não deu certo. Tente de novo.';
  return new ErroApi(resposta.status, codigo, mensagem);
}

/** Um refresh por vez: quem chega durante um em andamento espera o mesmo. */
function renovarUmaVez(): Promise<void> {
  if (!sessao) return Promise.reject(new ErroApi(401, 'SESSAO_ENCERRADA', 'Entre de novo na sua conta.'));
  if (!renovacao) {
    renovacao = sessao.renovar().finally(() => {
      renovacao = null;
    });
  }
  return renovacao;
}

/** Chama a API e devolve o corpo em JSON (undefined no 204). */
export async function api<T = unknown>(caminho: string, opcoes: OpcoesApi = {}): Promise<T> {
  const autenticado = opcoes.autenticado ?? true;
  const tokenUsado = autenticado ? (sessao?.accessToken() ?? null) : null;
  let resposta = await enviar(caminho, opcoes, tokenUsado);

  if (resposta.status === 401 && autenticado) {
    const erro = await lerErro(resposta);
    if (erro.codigo === 'TOKEN_INVALIDO') {
      // Se outra chamada já renovou enquanto esta ia e voltava, só repete
      if (renovacao || sessao?.accessToken() === tokenUsado) await renovarUmaVez();
      resposta = await enviar(caminho, opcoes, sessao?.accessToken() ?? null);
    } else {
      if (erro.codigo === 'SESSAO_ENCERRADA') sessao?.aoEncerrarSessao();
      throw erro;
    }
  }

  if (!resposta.ok) {
    const erro = await lerErro(resposta);
    if (erro.status === 401 && erro.codigo === 'SESSAO_ENCERRADA' && autenticado) sessao?.aoEncerrarSessao();
    throw erro;
  }
  if (resposta.status === 204) return undefined as T;
  const texto = await resposta.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}
