/**
 * Notificações locais do app (expo-notifications). Telas e features importam daqui;
 * os tipos (Lembrete, Quando, NovaNotificacao...) vêm de `@/dtos`.
 *
 * Inicialização do app: `configurarNotificacoes()` e `sincronizarVinculos()`.
 * Permissão: `pedirPermissaoNotificacoes()` no primeiro tratamento ou cobertura registrado.
 */
export { CANAIS } from './canais';
export { parseHorario } from './gatilhos';
export {
  HORARIO_PADRAO_LEMBRETE,
  cancelarLembretesDoAnimal,
  reagendarLembreteOrdenha,
  reagendarLembretesDoAnimal,
} from './lembretes';
export { cancelarLembretesDoCiclo, lembretesDoCiclo, reagendarLembretesDoCiclo } from './lavoura';
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
} from './notificacoes';
export {
  cancelarNotificacoesDe,
  notificacoesDe,
  sincronizarVinculos,
  substituirNotificacoesDe,
} from './vinculos';
