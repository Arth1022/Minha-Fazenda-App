import type { Maquina, UsoMaquina } from '@/database';

// Linhas da tabela: inferidas pelo Drizzle no schema, só reexportadas
export type {
  AnotacaoMaquina,
  Combustivel,
  Maquina,
  NovaMaquina,
  StatusMaquina,
  TipoMaquina,
  UsoMaquina,
} from '@/database';

/** Máquina da lista com o uso em aberto já cruzado (`useMaquinas`). */
export interface MaquinaComUso extends Maquina {
  /** Uso em andamento (máquina ligada); null quando está parada */
  usoAtual: UsoMaquina | null;
}

/** Horas de uso de um dia, para o gráfico semanal da ficha. */
export interface UsoDoDia {
  /** Meia-noite local do dia */
  dia: Date;
  /** Tempo de uso no dia, em milissegundos */
  duracaoMs: number;
}

/** Tudo que a Ficha Máquina mostra, já calculado (`useFichaMaquina`). */
export interface FichaMaquina {
  maquina: Maquina;
  usoAtual: UsoMaquina | null;
  /** Últimos 7 dias (do mais antigo até hoje) */
  usoSemanal: UsoDoDia[];
  /** Soma dos 7 dias, em milissegundos */
  totalSemanaMs: number;
  /** Tempo total registrado no app (usos encerrados), em milissegundos */
  totalRegistradoMs: number;
  /** Horímetro estimado: inicial + horas registradas; null sem horímetro inicial */
  horimetroAtual: number | null;
  /** Usos mais recentes, do mais novo para o mais antigo */
  usosRecentes: UsoMaquina[];
}

/** Evento enviado à API quando a máquina liga ou desliga. */
export interface EventoStatusMaquina {
  maquinaId: string;
  codigo: string;
  emUso: boolean;
  em: Date;
}
