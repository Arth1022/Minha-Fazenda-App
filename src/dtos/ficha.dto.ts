import type { AlertaAnimal, Animal, Fase, SituacaoLeite } from './animal.dto';
import type { Pesagem, PesoAtual } from './pesagem.dto';
import type {
  AnotacaoAnimal,
  AvaliacaoCorporal,
  Cio,
  ControleLeiteiro,
  Exame,
  IndicesReprodutivos,
  Mastite,
  ResumoLeite,
} from './registros.dto';
import type { Reproducao } from './reproducao.dto';
import type { DiaDeDose, DosePendente, Tratamento } from './tratamento.dto';

/** Um dia da trilha do tratamento, com a confirmação da dose. */
export interface DiaDaTrilha extends DiaDeDose {
  /** "Dei a dose" registrado neste dia */
  confirmado: boolean;
  /** Dia depois de hoje: ainda não dá para confirmar */
  futuro: boolean;
}

/** Tratamento em andamento hoje, pronto para a aba Saúde da ficha. */
export interface TratamentoAtivo {
  tratamento: Tratamento;
  /** Dias com dose, do primeiro ao último */
  trilha: DiaDaTrilha[];
  /** O dia de hoje na trilha; null se hoje não tem dose */
  hoje: DiaDaTrilha | null;
  /** Próximo dia com dose ainda não confirmada (null se acabou) */
  proximaDose: DosePendente | null;
}

/** Reprodução da fêmea na ficha: a cobertura que ainda espera o parto. */
export interface ReproducaoFicha {
  /** Cobertura/inseminação mais recente sem parto e sem prenhez descartada (null se não há) */
  coberturaAberta: Reproducao | null;
  /** Previsão de parto da cobertura em aberto (null se não há) */
  previsaoParto: Date | null;
}

/** Tudo que a Ficha Animal mostra, já calculado (`useFichaAnimal`). */
export interface FichaAnimal {
  animal: Animal;
  fase: Fase;
  /** Texto curto de idade ("8 meses"), null sem data de nascimento */
  idade: string | null;
  /** Lactação ou seca; null fora de fazenda de leite ou se não é vaca */
  situacaoLeite: SituacaoLeite | null;
  /** Parto mais recente (nascimento da cria mais nova), null se nunca pariu no app */
  ultimoParto: Date | null;
  /** Fêmea que pode registrar cobertura e parto (novilha ou vaca) */
  podeReproduzir: boolean;
  /** Última pesagem e o ganho desde a anterior, null se nunca foi pesado */
  peso: PesoAtual | null;
  /** Pesagens, da mais recente para a mais antiga */
  pesagens: Pesagem[];
  /** Crias cadastradas no app, da mais nova para a mais velha */
  crias: Animal[];
  /** Total de crias: as cadastradas + as que teve antes de entrar no app */
  totalCrias: number;
  reproducao: ReproducaoFicha;
  /** Coberturas e inseminações, da mais recente para a mais antiga */
  reproducoes: Reproducao[];
  /** Tratamentos, do início mais recente para o mais antigo */
  tratamentos: Tratamento[];
  /** Tratamentos em andamento hoje, com a trilha de doses */
  tratamentosAtivos: TratamentoAtivo[];
  /** Escores corporais, do mais recente para o mais antigo */
  avaliacoes: AvaliacaoCorporal[];
  /** Controles leiteiros, do mais recente para o mais antigo */
  controlesLeiteiros: ControleLeiteiro[];
  /** Lactação atual (só vaca em fazenda de leite; null nos outros casos) */
  leite: ResumoLeite | null;
  /** Casos de mastite, do mais recente para o mais antigo */
  mastites: Mastite[];
  /** Cios observados, do mais recente para o mais antigo */
  cios: Cio[];
  /** Próximo cio previsto (21 dias), só se está vazia; null sem previsão */
  proximoCio: Date | null;
  /** Índices reprodutivos (só fêmea que pode reproduzir) */
  indices: IndicesReprodutivos | null;
  /** Exames, do mais recente para o mais antigo */
  exames: Exame[];
  /** Anotações livres, da mais recente para a mais antiga */
  anotacoes: AnotacaoAnimal[];
  /** Alerta mais importante do animal (carência, dose, parto ou novilha); null se não há */
  alerta: AlertaAnimal | null;
}
