import { usuarioAtual, type Usuario } from './usuarioAtual';

/**
 * Pessoas da fazenda que recebem tarefas (M6). Ainda não há o sistema online
 * de colaboradores (API): a lista é de EXEMPLO e fica no app. Quando a API
 * existir, só esta função muda; quem chama continua igual. Quem está com o
 * celular entra primeiro, para dar para testar a ida e a volta de uma tarefa
 * num aparelho só.
 */
const COLABORADORES_EXEMPLO: readonly Usuario[] = [
  { id: 'colaborador-joao', nome: 'João', papel: 'colaborador' },
  { id: 'colaborador-carlos', nome: 'Carlos', papel: 'colaborador' },
  { id: 'colaborador-maria', nome: 'Maria', papel: 'colaborador' },
];

export function listarColaboradores(): Usuario[] {
  const eu = usuarioAtual();
  return [eu, ...COLABORADORES_EXEMPLO.filter((c) => c.id !== eu.id)];
}
