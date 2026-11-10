import type { Maquina, UsoMaquina } from '@/database';

// Linhas da tabela: inferidas pelo Drizzle no schema, só reexportadas
export type {
  Abastecimento,
  AnotacaoMaquina,
  AtividadeUso,
  CategoriaMaquina,
  CategoriaProblema,
  Combustivel,
  LeituraHorimetro,
  Maquina,
  MotivoFimUso,
  MotivoParada,
  NovaMaquina,
  OcorrenciaMaquina,
  OrigemAbastecimento,
  OrigemHorimetro,
  OrigemUso,
  ParadaUso,
  PontoGps,
  PontoRastro,
  StatusMaquina,
  TipoMaquina,
  UsoMaquina,
  UsoNoTalhao,
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
  /** Horímetro estimado: última leitura (ou o do cadastro) + horas de uso no app; null sem referência */
  horimetroAtual: number | null;
  /** KM andados na semana (usos com GPS); null se nenhum uso teve GPS */
  kmSemana: number | null;
  /** Hectares estimados na semana (com implemento); null sem área */
  haSemana: number | null;
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
