import type { Animal, Sexo, StatusAnimal } from '@/database';

import type { Reproducao } from './reproducao.dto';
import type { DoseConfirmada, Tratamento } from './tratamento.dto';

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
  /** Total de crias: as cadastradas com ela como mãe + `criasAnteriores` */
  crias: number;
}

/** Entrada de `registrarParto`: a cria que nasceu. */
export interface DadosParto {
  data: Date;
  sexo: Sexo;
  brinco: string;
  /** Pai da cria; sem informar, vem do touro da cobertura em aberto */
  paiId?: string | null;
  paiDescricao?: string | null;
}

/** Opções de `cadastrarAnimal`: peso de entrada, gravado na mesma transação. */
export interface OpcoesCadastroAnimal {
  pesoInicialKg?: number | null;
  /** Data da pesagem inicial; padrão: data de entrada, ou hoje */
  dataPesagem?: Date | null;
}

export type StatusSaida = Exclude<StatusAnimal, 'ativo'>;

/** Entrada de `registrarSaida`. */
export interface DadosSaida {
  status: StatusSaida;
  data: Date;
  motivo?: string;
}

export type TipoAlerta = 'carencia' | 'dose' | 'parto' | 'novilha';

/** Saída de `alertaPrincipal`: o alerta mais importante do animal. */
export interface AlertaAnimal {
  tipo: TipoAlerta;
  texto: string;
  /** Data de referência (fim da carência, hora da dose, previsão de parto); null se não há */
  data: Date | null;
}

/** Entrada de `alertaPrincipal`, montada pelo hook com as consultas do animal. */
export interface DadosAlerta {
  animal: Pick<Animal, 'dataNascimento'>;
  fase: Fase;
  tratamentos: Tratamento[];
  /** Dias aplicados dos tratamentos (`diasConfirmadosDoAnimal`) */
  dosesConfirmadas: DoseConfirmada[];
  /** Cobertura sem parto registrado (null se não há) */
  coberturaAberta: Pick<Reproducao, 'previsaoParto'> | null;
  produzLeite: boolean;
}

/** Linha de `criasPorMae`: quantas crias cada mãe tem. */
export type CriasDaMae = Pick<Animal, 'maeId'> & { total: number };
