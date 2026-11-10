/**
 * Quem está usando o app neste celular. Ainda não há login: por enquanto é um
 * usuário fixo ("Beta"), como se viesse do login. Quando o login existir, só
 * esta função muda; quem chama continua igual.
 */

/** Dono/gestor (tudo) ou colaborador (usa o mapa, mas não desenha áreas). */
export type PapelUsuario = 'admin' | 'colaborador';

export interface Usuario {
  id: string;
  nome: string;
  /** Sem papel (ex.: operador registrado num uso antigo): tratado como colaborador */
  papel?: PapelUsuario;
}

const USUARIO_SIMULADO: Usuario = { id: 'usuario-beta', nome: 'Beta', papel: 'admin' };

export function usuarioAtual(): Usuario {
  return USUARIO_SIMULADO;
}
