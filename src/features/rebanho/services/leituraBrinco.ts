import type { Animal } from '@/dtos';

/**
 * Leitura do número do brinco por foto (OCR no aparelho). O texto lido vem
 * "sujo": letras no lugar de números, espaços no meio, prefixo da fazenda. Aqui
 * se tiram os números possíveis e se compara com os brincos do rebanho, que o
 * app já conhece: é essa comparação que faz a leitura acertar na maioria das vezes.
 *
 * A mesma foto é lida mais de uma vez (recortes diferentes): o número que aparece
 * em mais leituras é o mais confiável, e desempata quando há mais de um candidato.
 */

/** Letras que o OCR costuma confundir com números (fonte de brinco, plástico gasto). */
const PARECE_NUMERO: Record<string, string> = {
  O: '0', o: '0', Q: '0', D: '0', U: '0', Ø: '0', ø: '0',
  I: '1', i: '1', l: '1', L: '1', '|': '1', '!': '1',
  Z: '2', z: '2',
  A: '4',
  S: '5', s: '5',
  G: '6', b: '6',
  T: '7',
  B: '8',
  g: '9', q: '9',
};

/** Brinco brasileiro (SISBOV) tem até 15 dígitos; acima disso é outra coisa. */
const MAX_DIGITOS = 15;
/** Abaixo disso, um dígito diferente já é outro animal (ex.: 12 e 13). */
const MIN_DIGITOS_PARECIDO = 3;
/** Opções mostradas quando a leitura não é exata */
const MAX_PARECIDOS = 5;
/** A partir daqui, dois dígitos trocados por parecidos (6/8, 1/7) ainda contam como o mesmo brinco. */
const MIN_DIGITOS_DUAS_TROCAS = 5;

/**
 * Dígitos que o OCR troca entre si (traço gasto, sujeira, reflexo). Trocar um
 * deles pesa metade de uma troca qualquer: 106 lido por 108 é "mais perto".
 */
const DIGITOS_CONFUNDIDOS = new Set(
  ['08', '06', '09', '17', '38', '56', '68', '89', '27'].flatMap(([a, b]) => [a + b, b + a])
);

/** "0104" e "104" são o mesmo número. */
function semZerosAEsquerda(numero: string): string {
  return numero.replace(/^0+(?=\d)/, '');
}

/** Os dígitos do brinco cadastrado ("#104" → "104", "BR-0104" → "104"); null sem dígitos. */
export function chaveDoBrinco(brinco: string): string | null {
  const digitos = brinco.replace(/\D/g, '');
  return digitos ? semZerosAEsquerda(digitos) : null;
}

/**
 * Pedaço de texto como número, trocando as letras parecidas. Precisa ter ao
 * menos metade de dígitos de verdade: "SOL" não vira "501", mas "1O4" vira "104".
 */
function comoNumero(pedaco: string): string | null {
  const caracteres = [...pedaco];
  const reais = caracteres.filter((c) => /\d/.test(c)).length;
  if (reais === 0 || reais * 2 < caracteres.length) return null;
  const trocados = caracteres.map((c) => (/\d/.test(c) ? c : PARECE_NUMERO[c]));
  if (trocados.some((c) => c === undefined)) return null;
  const numero = semZerosAEsquerda(trocados.join(''));
  return numero.length <= MAX_DIGITOS ? numero : null;
}

/** Números possíveis numa linha: cada pedaço numérico e os pedaços seguidos juntos ("10 4", "076 1234"). */
function numerosDaLinha(linha: string): string[] {
  const numeros: string[] = [];
  const pedacos = linha.split(/[\s.,;:/\\\-–_()[\]#°ºª*+]+/).filter(Boolean);
  let emSequencia: string[] = [];
  const fecharSequencia = () => {
    if (emSequencia.length > 1) {
      const junto = semZerosAEsquerda(emSequencia.join(''));
      if (junto.length <= MAX_DIGITOS) numeros.push(junto);
    }
    emSequencia = [];
  };
  for (const pedaco of pedacos) {
    const numero = comoNumero(pedaco);
    if (numero === null) {
      fecharSequencia();
      continue;
    }
    numeros.push(numero);
    emSequencia.push(numero);
  }
  fecharSequencia();
  return numeros;
}

/**
 * Números possíveis no texto lido da foto, com quantos blocos de texto trazem
 * cada um (o mesmo número lido em recortes diferentes soma votos).
 */
export function votosDosNumeros(textos: string[]): Map<string, number> {
  const votos = new Map<string, number>();
  for (const bloco of textos) {
    const doBloco = new Set(bloco.split(/\r?\n/).flatMap(numerosDaLinha));
    for (const numero of doBloco) votos.set(numero, (votos.get(numero) ?? 0) + 1);
  }
  return votos;
}

/** Números possíveis no texto lido da foto, sem repetir, do mais confiável ao menos. */
export function numerosLidos(textos: string[]): string[] {
  const votos = votosDosNumeros(textos);
  // Mais votos primeiro; empate: o mais comprido (os curtos costumam ser sujeira, "BR", "1")
  return [...votos.keys()].sort((a, b) => votos.get(b)! - votos.get(a)! || b.length - a.length);
}

/**
 * Quantas trocas, inclusões ou exclusões de dígito separam os dois números.
 * Com `pesarConfundidos`, trocar dígitos parecidos (6/8, 1/7...) custa meia troca.
 */
function distancia(a: string, b: string, pesarConfundidos = false): number {
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(
        anterior[j] + 1,
        atual[j - 1] + 1,
        anterior[j - 1] + custoDaTroca(a[i - 1], b[j - 1], pesarConfundidos)
      );
    }
    anterior = atual;
  }
  return anterior[b.length];
}

function custoDaTroca(a: string, b: string, pesarConfundidos: boolean): number {
  if (a === b) return 0;
  return pesarConfundidos && DIGITOS_CONFUNDIDOS.has(a + b) ? 0.5 : 1;
}

/** Quão perto o número lido está do brinco (menor é melhor); null se não serve. */
function proximidade(lido: string, chave: string): number | null {
  if (chave.length < MIN_DIGITOS_PARECIDO) return null;
  if (lido.length > chave.length) {
    // Prefixo da fazenda ou do país antes do número ("12 104" → "12104")
    if (lido.endsWith(chave)) return 1;
    // Número no meio de um código maior (SISBOV com dígito verificador no fim)
    if (lido.includes(chave)) return 1.5;
  }
  // Um dígito lido errado, a mais ou a menos (dígito parecido pesa menos)
  const pesada = distancia(lido, chave, true);
  if (pesada > 1) return null;
  // Em número curto, só uma mudança: duas trocas já são outro animal
  if (chave.length < MIN_DIGITOS_DUAS_TROCAS && distancia(lido, chave) > 1) return null;
  return 2 + pesada;
}

export interface ResultadoLeituraBrinco<T> {
  /** Animais cujo brinco é exatamente um dos números lidos */
  exatos: T[];
  /** Sem exato: os brincos mais parecidos com o que foi lido (para a pessoa escolher) */
  parecidos: T[];
  /** Número mais provável, para já vir preenchido se for preciso digitar */
  melhorLido: string | null;
}

/**
 * Compara o texto lido na foto com os brincos do rebanho. Um exato abre a ficha;
 * vários exatos ou só parecidos pedem para escolher; nada encontrado pede para digitar.
 */
export function encontrarPorBrinco<T extends Pick<Animal, 'brinco'>>(
  animais: T[],
  textos: string[]
): ResultadoLeituraBrinco<T> {
  const votos = votosDosNumeros(textos);
  const lidos = numerosLidos(textos);
  const melhorLido = lidos[0] ?? null;
  const comChave = animais
    .map((animal) => ({ animal, chave: chaveDoBrinco(animal.brinco) }))
    .filter((item): item is { animal: T; chave: string } => item.chave !== null);

  const exatos = maisVotados(
    comChave.filter(({ chave }) => votos.has(chave)),
    ({ chave }) => votos.get(chave)!
  )
    // Na ordem de confiança da leitura
    .sort((a, b) => lidos.indexOf(a.chave) - lidos.indexOf(b.chave))
    .map(({ animal }) => animal);
  if (exatos.length > 0) return { exatos, parecidos: [], melhorLido };

  const parecidos = comChave
    .map(({ animal, chave }) => {
      let nota: number | null = null;
      let apoio = 0;
      for (const lido of lidos) {
        const deste = proximidade(lido, chave);
        if (deste === null) continue;
        if (nota === null || deste < nota || (deste === nota && votos.get(lido)! > apoio)) {
          nota = deste;
          apoio = votos.get(lido)!;
        }
      }
      return { animal, nota, apoio };
    })
    .filter((item): item is { animal: T; nota: number; apoio: number } => item.nota !== null)
    .sort((a, b) => a.nota - b.nota || b.apoio - a.apoio)
    .slice(0, MAX_PARECIDOS)
    .map(({ animal }) => animal);

  return { exatos: [], parecidos, melhorLido };
}

/**
 * Brincos exatos lidos em mais leituras que os outros: o número do brinco
 * aparece nos dois recortes, a sujeira em volta só num. Empate fica tudo,
 * para a pessoa escolher.
 */
function maisVotados<I>(itens: I[], votosDe: (item: I) => number): I[] {
  const maximo = Math.max(0, ...itens.map(votosDe));
  return itens.filter((item) => votosDe(item) === maximo);
}
