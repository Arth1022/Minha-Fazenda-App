/**
 * Notificações locais do app (expo-notifications). Telas e features importam daqui.
 *
 * Inicialização do app: `configurarNotificacoes()` e `sincronizarVinculos()`.
 * Permissão: `pedirPermissaoNotificacoes()` no primeiro tratamento ou cobertura registrado.
 */
export { CANAIS, type CanalId } from './canais';
export { parseHorario, type DiaSemana, type Quando } from './gatilhos';
export {
  HORARIO_PADRAO_LEMBRETE,
  TIPOS_LEMBRETE,
  cancelarLembretesDoAnimal,
  reagendarLembreteOrdenha,
  reagendarLembretesDoAnimal,
  type Lembrete,
  type TipoLembrete,
} from './lembretes';
export {
  agendarNotificacao,
  alarmeExatoPermitido,
  aoTocarNotificacao,
  cancelarNotificacao,
  cancelarTodasNotificacoes,
  configurarNotificacoes,
  listarNotificacoesAgendadas,
  notificacoesDisponiveis,
  pedirAlarmeExato,
  pedirPermissaoNotificacoes,
  statusPermissaoNotificacoes,
  type DadosNotificacao,
  type NotificacaoAgendada,
  type NovaNotificacao,
  type StatusPermissao,
} from './notificacoes';
export {
  cancelarNotificacoesDe,
  notificacoesDe,
  sincronizarVinculos,
  substituirNotificacoesDe,
  type Vinculo,
} from './vinculos';
