import Animal from '@/entities/Animal';

export type CategoriaAnimal = 'bezerro' | 'novilha' | 'vaca';

/** Até esta idade (exclusive) o animal é bezerro. */
export const IDADE_MAX_BEZERRO_MESES = 12;
/** Até esta idade (exclusive), sem crias, o animal é novilha. */
export const IDADE_MAX_NOVILHA_MESES = 24;

export const CATEGORIA_LABEL: Record<CategoriaAnimal, string> = {
  bezerro: 'Bezerro',
  novilha: 'Novilha',
  vaca: 'Vaca',
};

/**
 * Regras de negócio para classificar o rebanho em bezerro, novilha e vaca.
 */
export class CategoriaService {
  idadeEmMeses(dataNascimento: Date, hoje = new Date()): number {
    const meses =
      (hoje.getFullYear() - dataNascimento.getFullYear()) * 12 +
      (hoje.getMonth() - dataNascimento.getMonth()) -
      (hoje.getDate() < dataNascimento.getDate() ? 1 : 0);
    return Math.max(0, meses);
  }

  /** Data de nascimento aproximada a partir da idade em meses. */
  dataNascimentoPorIdade(idadeMeses: number, hoje = new Date()): Date {
    const nascimento = new Date(hoje);
    nascimento.setMonth(nascimento.getMonth() - idadeMeses);
    return nascimento;
  }

  /**
   * Regra padrão de categoria por idade:
   * - menos de 12 meses → bezerro
   * - de 12 a 23 meses → novilha
   * - 24 meses ou mais → vaca
   * Acima da idade de bezerro, animal que já teve cria é sempre vaca.
   */
  categoriaPorIdade(idadeMeses: number, crias = 0): CategoriaAnimal {
    if (idadeMeses < IDADE_MAX_BEZERRO_MESES) return 'bezerro';
    if (crias > 0) return 'vaca';
    if (idadeMeses < IDADE_MAX_NOVILHA_MESES) return 'novilha';
    return 'vaca';
  }

  getCategoriaAnimal(animal: Animal): CategoriaAnimal {
    const crias = animal.crias ?? 0;
    if (animal.dataNascimento) {
      return this.categoriaPorIdade(
        this.idadeEmMeses(animal.dataNascimento),
        crias
      );
    }
    // Sem idade cadastrada: estimativa por crias e peso
    if (crias > 0) return 'vaca';
    if ((animal.pesoKg ?? 0) >= 200) return 'novilha';
    return 'bezerro';
  }
}

export const categoriaService = new CategoriaService();
