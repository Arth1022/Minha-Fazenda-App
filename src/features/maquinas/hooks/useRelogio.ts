import { useEffect, useState } from 'react';

/**
 * Hora atual renovada a cada `intervaloMs`; com null o relógio fica parado na
 * última leitura. Ao (re)começar, atualiza logo em seguida, sem esperar o
 * primeiro intervalo. Use no menor componente possível: só ele renderiza a cada tique.
 */
export function useRelogio(intervaloMs: number | null): Date {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    if (intervaloMs === null) return;
    const atualizar = () => setAgora(new Date());
    const imediato = setTimeout(atualizar, 0);
    const timer = setInterval(atualizar, intervaloMs);
    return () => {
      clearTimeout(imediato);
      clearInterval(timer);
    };
  }, [intervaloMs]);

  return agora;
}
