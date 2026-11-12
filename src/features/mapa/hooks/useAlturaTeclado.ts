import { createContext, useContext, useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Onde o mapa termina na tela (y da borda de baixo). A aba Mapa fica acima da
 * barra de abas: o painel só precisa subir o que o teclado cobre do mapa.
 */
export const FimDoMapaContext = createContext<number | null>(null);

/**
 * Quanto o painel preso no rodapé do mapa sobe com o teclado aberto (0 fechado).
 * No Android edge-to-edge a janela não encolhe com o teclado (guia de teclado do
 * Expo): sem subir, o campo do painel ficaria coberto.
 */
export function useAlturaTeclado(): number {
  const fimDoMapa = useContext(FimDoMapaContext);
  const [teclado, setTeclado] = useState<{ altura: number; topo: number } | null>(null);
  useEffect(() => {
    const aoAbrir = Keyboard.addListener('keyboardDidShow', (evento) =>
      setTeclado({ altura: evento.endCoordinates.height, topo: evento.endCoordinates.screenY })
    );
    const aoFechar = Keyboard.addListener('keyboardDidHide', () => setTeclado(null));
    return () => {
      aoAbrir.remove();
      aoFechar.remove();
    };
  }, []);
  if (!teclado) return 0;
  return fimDoMapa === null ? teclado.altura : Math.max(0, fimDoMapa - teclado.topo);
}
