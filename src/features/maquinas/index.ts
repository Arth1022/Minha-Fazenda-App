/** O que o módulo de máquinas expõe para o resto do app (ex.: leitor de QR Code global). */
export { AcoesMaquinaModal, type AcoesMaquinaModalProps } from './components/AcoesMaquinaModal';
export { CardUsoAtual } from './components/CardUsoAtual';
export { useQrCodeMaquina } from './hooks/useQrCodeMaquina';
export { inicializarMaquinas, ouvirRespostasDeAviso } from './rastro/inicializacao';
