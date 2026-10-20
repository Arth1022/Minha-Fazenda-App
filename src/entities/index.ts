import Talhao from './Talhao';
import Animal from './Animal';
import Tratamento from './Tratamento';
import EstoqueItem from './EstoqueItem';
import Maquina from './Maquina';
import Ordenha from './Ordenha';

export { Talhao, Animal, Tratamento, EstoqueItem, Maquina, Ordenha };
export type { PeriodoOrdenha } from './Ordenha';

export const modelClasses = [
  Talhao,
  Animal,
  Tratamento,
  EstoqueItem,
  Maquina,
  Ordenha,
];
