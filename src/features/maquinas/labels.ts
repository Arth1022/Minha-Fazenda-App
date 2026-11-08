import type { Combustivel, StatusMaquina, TipoMaquina } from '@/dtos';

/** Rótulos de tela do módulo (sem assets: pode ser usado nos testes em Node). */
export const TIPO_MAQUINA_LABEL: Record<TipoMaquina, string> = {
  trator: 'Trator',
  colheitadeira: 'Colheitadeira',
  pulverizador: 'Pulverizador',
  plantadeira: 'Plantadeira',
  implemento: 'Implemento',
  caminhao: 'Caminhão',
  utilitario: 'Utilitário',
  ordenhadeira: 'Ordenhadeira',
  outro: 'Outro',
};

export const COMBUSTIVEL_LABEL: Record<Combustivel, string> = {
  diesel: 'Diesel',
  gasolina: 'Gasolina',
  etanol: 'Etanol',
  flex: 'Flex',
  eletrico: 'Elétrico',
  nenhum: 'Sem motor',
};

export const STATUS_MAQUINA_LABEL: Record<StatusMaquina, string> = {
  ativa: 'Ativa',
  manutencao: 'Em manutenção',
  inativa: 'Inativa',
};
