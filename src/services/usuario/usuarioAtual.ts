/**
 * Quem está usando o app neste celular. Ainda não há login: por enquanto é um
 * usuário fixo ("Beta"), como se viesse do login. Quando o login existir, só
 * esta função muda; quem chama continua igual.
 */

export interface Usuario {
  id: string;
  nome: string;
}

const USUARIO_SIMULADO: Usuario = { id: 'usuario-beta', nome: 'Beta' };

export function usuarioAtual(): Usuario {
  return USUARIO_SIMULADO;
}
