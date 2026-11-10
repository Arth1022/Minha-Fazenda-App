import { usuarioAtual, type Usuario } from './usuarioAtual';

/**
 * Desenhar, redesenhar e excluir áreas (e a divisa) é só do admin: evita duas
 * edições offline do mesmo polígono, o conflito de sync mais difícil (RN-012).
 */
export function podeEditarGeometria(usuario: Usuario = usuarioAtual()): boolean {
  return usuario.papel === 'admin';
}
