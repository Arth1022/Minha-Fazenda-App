/** O que o módulo de máquinas expõe para o resto do app (ex.: leitor de QR Code global, trajetos no mapa). */
export { AcoesMaquinaModal, type AcoesMaquinaModalProps } from './components/AcoesMaquinaModal';
export { CardUsoAtual } from './components/CardUsoAtual';
export { TempoDecorrido } from './components/TempoDecorrido';
export { reabrirUso } from './data/usos';
export {
  sessaoCompleta,
  segundosNaAreaDesde,
  TABELAS_POSICOES,
  TABELAS_SESSAO,
  TABELAS_TRAJETOS,
  TABELAS_USOS_AREA,
  trajetosDoPeriodo,
  ultimasPosicoes,
  usosDaArea,
  type AreaDaSessao,
  type PosicaoDaMaquina,
  type SessaoCompleta,
  type TrajetoDoPeriodo,
  type UsoNaArea,
} from './data/trajetos';
export { useOperacaoMaquina } from './hooks/useOperacaoMaquina';
export { useQrCodeMaquina } from './hooks/useQrCodeMaquina';
export { useUsoAtual, type UsoAtual } from './hooks/useUsoAtual';
export { inicializarMaquinas, ouvirRespostasDeAviso } from './rastro/inicializacao';
export { iniciarRastro } from './rastro/localizacao';
export { simplificarLinha } from './services/geo';
export { formatarDuracao } from './services/uso';
