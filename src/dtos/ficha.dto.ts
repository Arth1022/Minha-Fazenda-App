import type { Animal, Fase, SituacaoLeite } from './animal.dto';
import type { Pesagem, PesoAtual } from './pesagem.dto';
import type { Reproducao } from './reproducao.dto';
import type { Tratamento } from './tratamento.dto';

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
  /** Crias, da mais nova para a mais velha */
  crias: Animal[];
  reproducao: ReproducaoFicha;
  /** Coberturas e inseminações, da mais recente para a mais antiga */
  reproducoes: Reproducao[];
  /** Tratamentos, do início mais recente para o mais antigo */
  tratamentos: Tratamento[];
}
