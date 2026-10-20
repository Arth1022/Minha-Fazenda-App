import { useEffect, useState } from 'react';
import Maquina from '@/entities/Maquina';
import { maquinaRepository } from './MaquinaRepository';

export function useMaquinas() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);

  useEffect(() => {
    const subscription = maquinaRepository.observeAll().subscribe(setMaquinas);
    return () => subscription.unsubscribe();
  }, []);

  return { maquinas };
}
