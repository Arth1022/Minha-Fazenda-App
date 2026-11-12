import { usuarioAtual, type Usuario } from './usuarioAtual';

/**
 * Esconder botão não é segurança: quem garante as regras é a API, sempre pelo
 * papel em `fazenda_membros`. Aqui o app só decide o que mostrar.
 */

/**
 * Desenhar, redesenhar e excluir áreas (e a divisa) é só do dono: evita duas
 * edições offline do mesmo polígono, o conflito de sync mais difícil (RN-012).
 */
export function podeEditarGeometria(usuario: Usuario = usuarioAtual()): boolean {
  return usuario.papel === 'owner';
}

/** Atribuir etapas do plantio como tarefa de alguém é do dono (RF-067). */
export function podeAtribuirTarefas(usuario: Usuario = usuarioAtual()): boolean {
  return usuario.papel === 'owner';
}
