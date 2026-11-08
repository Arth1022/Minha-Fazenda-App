import type { EventoStatusMaquina } from '@/dtos';

/**
 * Ponto único para avisar fora do aparelho que a máquina ligou ou desligou.
 * Hoje não faz nada (o app é offline); quando a API existir, a chamada entra
 * aqui e as telas não mudam. Nunca deve lançar erro: o uso já foi gravado.
 */
export async function publicarStatusMaquina(_evento: EventoStatusMaquina): Promise<void> {
  // TODO(API): enviar o evento para o servidor (com fila offline para reenvio).
}
