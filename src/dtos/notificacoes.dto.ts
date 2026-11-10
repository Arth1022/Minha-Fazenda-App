import type { EntidadeNotificacao } from '@/database';

export type { EntidadeNotificacao, NotificacaoAgendadaRow } from '@/database';

/** Canais de notificação do Android (ver `CANAIS` em services/notificacoes/canais). */
export type CanalId = 'ordenha' | 'saude' | 'reproducao' | 'maquinas' | 'lavoura';

/** Dia da semana no padrão do expo-notifications: 1 = domingo ... 7 = sábado. */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Quando a notificação dispara. Horários no formato "HH:mm" (ex.: "05:30"). */
export type Quando =
  | { tipo: 'data'; data: Date }
  | { tipo: 'diario'; horario: string }
  | { tipo: 'semanal'; diaSemana: DiaSemana; horario: string };

/** Saída de `parseHorario`. */
export interface Horario {
  hora: number;
  minuto: number;
}

/** Entrada de `agendarNotificacao`. */
export interface NovaNotificacao {
  /** Identificador próprio (para cancelar depois); sem ele o sistema gera um. */
  id?: string;
  titulo: string;
  mensagem?: string;
  quando: Quando;
  canal: CanalId;
  /** Rota do expo-router aberta ao tocar na notificação (ex.: "/animal/123"). */
  url?: string;
  dados?: Record<string, unknown>;
}

/** Dados que chegam no toque da notificação (`aoTocarNotificacao`). */
export interface DadosNotificacao extends Record<string, unknown> {
  url?: string;
}

/** Saída de `listarNotificacoesAgendadas`. */
export interface NotificacaoAgendada {
  id: string;
  titulo: string | null;
  mensagem: string | null;
  dados: DadosNotificacao;
}

export type StatusPermissao = 'concedida' | 'pendente' | 'negada';

/** O registro dono das notificações (um animal, um turno de ordenha...). */
export interface Vinculo {
  entidade: EntidadeNotificacao;
  entidadeId: string;
}

export const TIPOS_LEMBRETE = ['dose', 'fim_carencia', 'parto', 'vacina'] as const;
export type TipoLembrete = (typeof TIPOS_LEMBRETE)[number];

/** Lembrete de um animal; a lista vem de `calcularLembretes` (regra do rebanho). */
export interface Lembrete {
  id: string;
  tipo: TipoLembrete;
  data: Date;
  titulo: string;
  animalId: string;
}
