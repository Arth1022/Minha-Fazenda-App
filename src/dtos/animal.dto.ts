import type { Animal, Sexo, StatusAnimal } from '@/database';

// Linhas da tabela: inferidas pelo Drizzle no schema ($inferSelect/$inferInsert), só reexportadas
export type { Animal, NovoAnimal, Origem, Sexo, StatusAnimal } from '@/database';

export type FaseFemea = 'bezerra' | 'novilha' | 'vaca';
export type FaseMacho = 'bezerro' | 'garrote' | 'touro';
export type Fase = FaseFemea | FaseMacho;
export type SituacaoLeite = 'lactacao' | 'seca';

/** Entrada de `calcularFase`. */
export interface DadosFase {
  sexo: Sexo;
  dataNascimento: Date | null;
  /** Data do parto mais recente registrado no app (null se não há) */
  ultimoParto: Date | null;
  /** Já pariu antes de entrar no app (coluna `ja_pariu`); padrão false */
  jaPariu?: boolean;
}

/** Animal da lista do rebanho com fase, alerta, peso e crias já calculados (`useRebanho`). */
export interface AnimalComFase extends Animal {
  fase: Fase;
  /** Parto mais recente (nascimento da cria mais nova), null se nunca pariu */
  ultimoParto: Date | null;
  /** Alerta principal do animal (no máximo um) */
  alerta: string | null;
  /** Peso da pesagem mais recente, null se nunca foi pesado */
  pesoKg: number | null;
  /** Quantidade de crias registradas */
  crias: number;
}

/** Entrada de `registrarParto`: a cria que nasceu. */
export interface DadosParto {
  data: Date;
  sexo: Sexo;
  brinco: string;
}

export type StatusSaida = Exclude<StatusAnimal, 'ativo'>;

/** Entrada de `registrarSaida`. */
export interface DadosSaida {
  status: StatusSaida;
  data: Date;
  motivo?: string;
}

/** Linha de `criasPorMae`: quantas crias cada mãe tem. */
export type CriasDaMae = Pick<Animal, 'maeId'> & { total: number };
