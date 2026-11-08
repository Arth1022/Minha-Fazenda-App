import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Animal } from '@/dtos';
import { formatBrinco, normalizarTexto } from '@/utils';
import { listarAnimais } from '../data/animais';
import { encontrarPorBrinco } from '../services/leituraBrinco';

/** O que mostrar depois da leitura do número do brinco. */
export type EstadoLeituraBrinco =
  | { tipo: 'fechado' }
  /** Vários brincos iguais ou só parecidos: a pessoa escolhe */
  | { tipo: 'escolher'; candidatos: Animal[]; lido: string | null }
  /** Nada encontrado: digitar o brinco (vem com o número lido, se houver) */
  | { tipo: 'digitar'; sugestao: string; erro?: string; daFoto: boolean };

/**
 * Leitura do número do brinco pela foto. Um brinco exato abre a ficha direto;
 * vários iguais ou só parecidos pedem para escolher; nada encontrado abre o
 * campo para digitar. Compara só com os animais ativos.
 */
export function useLeituraBrinco() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoLeituraBrinco>({ tipo: 'fechado' });

  const abrirFicha = useCallback(
    (animal: Animal) => {
      setEstado({ tipo: 'fechado' });
      router.push({ pathname: '/animal/[id]', params: { id: animal.id } });
    },
    [router]
  );

  /** Textos lidos na foto (OCR). */
  const tratarTextos = useCallback(
    async (textos: string[]) => {
      const animais = await listarAnimais();
      const { exatos, parecidos, melhorLido } = encontrarPorBrinco(animais, textos);
      if (exatos.length === 1) {
        abrirFicha(exatos[0]);
        return;
      }
      const candidatos = exatos.length > 1 ? exatos : parecidos;
      if (candidatos.length > 0) setEstado({ tipo: 'escolher', candidatos, lido: melhorLido });
      else setEstado({ tipo: 'digitar', sugestao: melhorLido ?? '', daFoto: true });
    },
    [abrirFicha]
  );

  /** Brinco digitado: igual ao cadastrado (com ou sem "#", zeros e letras) ou pelos números. */
  const buscarDigitado = useCallback(
    async (texto: string) => {
      const animais = await listarAnimais();
      const alvo = normalizarTexto(formatBrinco(texto));
      const iguais = animais.filter((animal) => normalizarTexto(animal.brinco) === alvo);
      const exatos = iguais.length > 0 ? iguais : encontrarPorBrinco(animais, [texto]).exatos;
      if (exatos.length === 1) abrirFicha(exatos[0]);
      else if (exatos.length > 1) setEstado({ tipo: 'escolher', candidatos: exatos, lido: texto });
      else
        setEstado({
          tipo: 'digitar',
          sugestao: texto,
          erro: `Nenhum animal ativo com o brinco ${formatBrinco(texto)}.`,
          daFoto: false,
        });
    },
    [abrirFicha]
  );

  const digitar = useCallback(
    (sugestao = '') => setEstado({ tipo: 'digitar', sugestao, daFoto: false }),
    []
  );
  const fechar = useCallback(() => setEstado({ tipo: 'fechado' }), []);

  return { estado, tratarTextos, buscarDigitado, abrirFicha, digitar, fechar };
}
