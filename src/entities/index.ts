import Talhao from './Talhao';
import Animal from './Animal';
import Tratamento from './Tratamento';
import Cobertura from './Cobertura';
import EstoqueItem from './EstoqueItem';
import Maquina from './Maquina';
import Ordenha from './Ordenha';

export { Talhao, Animal, Tratamento, Cobertura, EstoqueItem, Maquina, Ordenha };
export type { PeriodoOrdenha } from './Ordenha';
export type { CategoriaEstoque } from './EstoqueItem';
export type { TipoTalhao } from './Talhao';
export type { TipoCobertura } from './Cobertura';

export const modelClasses = [
  Talhao,
  Animal,
  Tratamento,
  Cobertura,
  EstoqueItem,
  Maquina,
  Ordenha,
];
