/** O que o módulo do mapa expõe para o resto do app (ex.: rebanho movendo animais de pasto). */
export { MoverParaPastoSheet, type MoverParaPastoSheetProps } from './components/MoverParaPastoSheet';
export { CaixaMarcar } from './components/painel/elementosPainel';
export { usePastosComOcupacao } from './hooks/usePastosComOcupacao';
export {
  foraDoPastoDoLote,
  formatarLotacao,
  identificacaoAnimal,
  lotacao,
  textoDias,
  type OcupacaoArea,
} from './services/ocupacao';
