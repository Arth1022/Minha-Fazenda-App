/** O que o módulo do rebanho expõe para o resto do app (ex.: leitor de QR Code global). */
export {
  LeituraBrincoModais,
  type LeituraBrincoModaisProps,
} from './components/LeituraBrincoModais';
export { useLeituraBrinco, type EstadoLeituraBrinco } from './hooks/useLeituraBrinco';
export { useQrCodeAnimal } from './hooks/useQrCodeAnimal';
