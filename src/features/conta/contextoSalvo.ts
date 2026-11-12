import { fazendaDoContexto, usuarioDoContexto } from '@/database';
import { carregarFazendaAtiva } from '@/features/fazenda';
import { definirUsuarioAtual } from '@/services/usuario';
import { lerPerfilLocal } from './perfilLocal';
import { carregarSessao } from './sessao';

/**
 * Tarefa de segundo plano (GPS do uso da máquina) roda sem nenhuma tela
 * montada: restaura quem está no celular e a fazenda ativa a partir do que
 * está guardado. Com o app aberto, o contexto já está pronto e nada muda.
 * Devolve se há usuário e fazenda para gravar.
 */
export async function restaurarContextoSalvo(): Promise<boolean> {
  if (fazendaDoContexto() && usuarioDoContexto()) return true;
  carregarFazendaAtiva();
  const sessao = await carregarSessao().catch(() => null);
  if (sessao?.modo === 'logado' && sessao.usuario) {
    definirUsuarioAtual(sessao.usuario);
  } else if (sessao?.modo === 'sem-conta') {
    const perfil = await lerPerfilLocal().catch(() => null);
    if (perfil) definirUsuarioAtual({ id: perfil.id, nome: perfil.nome, avatarUrl: perfil.fotoPath });
  }
  return Boolean(fazendaDoContexto() && usuarioDoContexto());
}
