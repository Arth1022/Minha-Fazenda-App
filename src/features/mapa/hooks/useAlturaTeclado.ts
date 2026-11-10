import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Altura do teclado aberto (0 fechado). No Android edge-to-edge a janela não
 * encolhe com o teclado (guia de teclado do Expo): o painel preso no rodapé
 * sobe essa altura para o campo de busca não ficar coberto.
 */
export function useAlturaTeclado(): number {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    const aoAbrir = Keyboard.addListener('keyboardDidShow', (evento) => setAltura(evento.endCoordinates.height));
    const aoFechar = Keyboard.addListener('keyboardDidHide', () => setAltura(0));
    return () => {
      aoAbrir.remove();
      aoFechar.remove();
    };
  }, []);
  return altura;
}
