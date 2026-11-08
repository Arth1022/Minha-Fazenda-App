/** Logo desenhado em vetor (react-native-svg): leve e nítido em qualquer tamanho. */
export interface LogoVetorial {
  formato: 'vetor';
  nome: string;
  viewBox: string;
  /** Cor da marca (preenchimento) */
  cor: string;
  /** Fundo do círculo quando a cor da marca some no branco (ex.: amarelo) */
  fundo?: string;
  paths: string[];
}

/** Logo em imagem (PNG pequeno em assets/images/marcas), quando não há vetor livre. */
export interface LogoImagem {
  formato: 'imagem';
  nome: string;
  /** Retorno do require() da imagem local */
  fonte: number;
  fundo?: string;
}

export type LogoMarca = LogoVetorial | LogoImagem;
