import * as SecureStore from 'expo-secure-store';

/**
 * Sessão guardada no SecureStore (nunca em AsyncStorage/kv-store): os tokens,
 * o usuário logado e o modo da conta. Fica também em memória para o cliente da
 * API ler o token sem esperar. Tokens nunca vão para o log.
 */

export interface UsuarioDaSessao {
  id: string;
  nome: string;
  avatarUrl: string | null;
}

export type ModoConta = 'logado' | 'sem-conta';

export interface SessaoSalva {
  accessToken: string | null;
  refreshToken: string | null;
  usuario: UsuarioDaSessao | null;
  modo: ModoConta | null;
}

const CHAVES = {
  access: 'minhafazenda.access_token',
  refresh: 'minhafazenda.refresh_token',
  usuario: 'minhafazenda.usuario',
  modo: 'minhafazenda.modo',
} as const;

const memoria: SessaoSalva = { accessToken: null, refreshToken: null, usuario: null, modo: null };

function lerUsuario(bruto: string | null): UsuarioDaSessao | null {
  if (!bruto) return null;
  try {
    const lido = JSON.parse(bruto) as Partial<UsuarioDaSessao>;
    return typeof lido.id === 'string' && typeof lido.nome === 'string'
      ? { id: lido.id, nome: lido.nome, avatarUrl: lido.avatarUrl ?? null }
      : null;
  } catch {
    return null;
  }
}

export async function carregarSessao(): Promise<SessaoSalva> {
  const [accessToken, refreshToken, usuario, modo] = await Promise.all([
    SecureStore.getItemAsync(CHAVES.access),
    SecureStore.getItemAsync(CHAVES.refresh),
    SecureStore.getItemAsync(CHAVES.usuario),
    SecureStore.getItemAsync(CHAVES.modo),
  ]);
  memoria.accessToken = accessToken;
  memoria.refreshToken = refreshToken;
  memoria.usuario = lerUsuario(usuario);
  memoria.modo = modo === 'logado' || modo === 'sem-conta' ? modo : null;
  return { ...memoria };
}

export function sessaoEmMemoria(): SessaoSalva {
  return { ...memoria };
}

export function accessTokenAtual(): string | null {
  return memoria.accessToken;
}

export function refreshTokenAtual(): string | null {
  return memoria.refreshToken;
}

export async function salvarTokens(accessToken: string, refreshToken: string): Promise<void> {
  memoria.accessToken = accessToken;
  memoria.refreshToken = refreshToken;
  await Promise.all([
    SecureStore.setItemAsync(CHAVES.access, accessToken),
    SecureStore.setItemAsync(CHAVES.refresh, refreshToken),
  ]);
}

export async function salvarUsuario(usuario: UsuarioDaSessao): Promise<void> {
  memoria.usuario = usuario;
  await SecureStore.setItemAsync(CHAVES.usuario, JSON.stringify(usuario));
}

export async function salvarModo(modo: ModoConta): Promise<void> {
  memoria.modo = modo;
  await SecureStore.setItemAsync(CHAVES.modo, modo);
}

/** Sessão encerrada pela API: tira só os tokens (o usuário fica para comparar no próximo login). */
export async function limparTokens(): Promise<void> {
  memoria.accessToken = null;
  memoria.refreshToken = null;
  memoria.modo = null;
  await Promise.all([
    SecureStore.deleteItemAsync(CHAVES.access),
    SecureStore.deleteItemAsync(CHAVES.refresh),
    SecureStore.deleteItemAsync(CHAVES.modo),
  ]);
}

/** Saída: apaga tudo. */
export async function limparSessao(): Promise<void> {
  await limparTokens();
  memoria.usuario = null;
  await SecureStore.deleteItemAsync(CHAVES.usuario);
}
