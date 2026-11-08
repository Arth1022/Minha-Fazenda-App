import type {
  AtividadeUso,
  CategoriaProblema,
  Combustivel,
  MotivoFimUso,
  OrigemAbastecimento,
  StatusMaquina,
  TipoMaquina,
} from '@/dtos';
import type { CondicaoMaquina } from './services/registros';

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

export const ATIVIDADE_LABEL: Record<AtividadeUso, string> = {
  plantio: 'Plantio',
  pulverizacao: 'Pulverização',
  gradagem: 'Gradagem',
  transporte: 'Transporte',
  trato: 'Trato do gado',
  parado: 'Trabalho parado (TDP)',
  outro: 'Outro',
};

export const CATEGORIA_PROBLEMA_LABEL: Record<CategoriaProblema, string> = {
  motor: 'Motor',
  hidraulico: 'Hidráulico',
  pneu: 'Pneu',
  eletrico: 'Elétrico',
  vazamento: 'Vazamento',
  outro: 'Outro',
};

export const ORIGEM_ABASTECIMENTO_LABEL: Record<OrigemAbastecimento, string> = {
  fazenda: 'Tanque da fazenda',
  posto: 'Posto',
};

/** Marcas que o dono vê no histórico: como o uso terminou ou foi registrado. */
export const MOTIVO_FIM_LABEL: Partial<Record<MotivoFimUso, string>> = {
  parada: 'Encerrada pelo app',
  pausa: 'Encerrada pelo app',
  velocidade: 'Encerrada pelo app',
  assumida: 'Assumida por outra pessoa',
};

export const CONDICAO_LABEL: Record<CondicaoMaquina, string> = {
  ok: 'Ativa',
  atencao: 'Atenção',
  paradaPorProblema: 'Parada por problema',
  manutencao: 'Em manutenção',
  inativa: 'Inativa',
};
