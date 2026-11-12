import { estadoDaConta, usuarioAtual, type Usuario } from './usuarioAtual';

/**
 * Esconder botão não é segurança: quem garante as regras é a API, sempre pelo
 * papel em `fazenda_membros`. Aqui o app decide o que mostrar e aplica as regras locais.
 * O produtor sozinho (modo sem-conta, quando o usuário não tem papel explícito)
 * tem todas as permissões de admin (owner).
 */
function ehAdmin(usuario: Usuario = usuarioAtual()): boolean {
  if (usuario.papel !== undefined) return usuario.papel === 'owner';
  const atual = usuarioAtual();
  return usuario.id === atual.id && estadoDaConta() === 'sem-conta';
}

/**
 * Desenhar, redesenhar e excluir áreas (e a divisa) é só do dono: evita duas
 * edições offline do mesmo polígono, o conflito de sync mais difícil (RN-012).
 */
export function podeEditarGeometria(usuario: Usuario = usuarioAtual()): boolean {
  return ehAdmin(usuario);
}

/**
 * Admin (owner ou produtor sozinho): organiza e atribui/reatribui tarefas
 * a outras pessoas (RF-067, RF-T14). Colaboradores não atribuem a terceiros.
 */
export function podeAtribuirTarefas(usuario: Usuario = usuarioAtual()): boolean {
  return ehAdmin(usuario);
}

/** Criar tarefa manual (origem = 'manual') é exclusivo do admin (RF-T11). */
export function podeCriarTarefaManual(usuario: Usuario = usuarioAtual()): boolean {
  return ehAdmin(usuario);
}

/**
 * Iniciar e concluir tarefa (RF-T16, RN-T03):
 * Admin pode iniciar/concluir qualquer tarefa; colaborador apenas as suas.
 */
export function podeIniciarOuConcluirTarefa(
  tarefa: { responsavelId: string | null },
  usuario: Usuario = usuarioAtual()
): boolean {
  return ehAdmin(usuario) || (Boolean(usuario.id) && tarefa.responsavelId === usuario.id);
}

/**
 * Soltar uma tarefa que está consigo mesmo (RF-T15, RN-T04):
 * Tanto admin quanto colaborador podem soltar uma tarefa aberta ou em andamento atribuída a si.
 */
export function podeSoltarTarefa(
  tarefa: { status: string; responsavelId: string | null },
  usuario: Usuario = usuarioAtual()
): boolean {
  return (
    (tarefa.status === 'aberta' || tarefa.status === 'em_andamento') &&
    Boolean(usuario.id) &&
    tarefa.responsavelId === usuario.id
  );
}

/**
 * Cancelar ou editar categoria/local/vínculos da tarefa (RF-T19, Tabela de Permissões):
 * Admin pode em qualquer tarefa aberta ou em andamento;
 * colaborador apenas nas que ele mesmo relatou, enquanto estiverem abertas.
 */
export function podeCancelarOuEditarTarefa(
  tarefa: { status: string; createdBy: string | null },
  usuario: Usuario = usuarioAtual()
): boolean {
  if (tarefa.status !== 'aberta' && tarefa.status !== 'em_andamento') return false;
  if (ehAdmin(usuario)) return true;
  return tarefa.status === 'aberta' && Boolean(usuario.id) && tarefa.createdBy === usuario.id;
}

