import { useEffect, useState } from 'react';
import Maquina from '@/entities/Maquina';
import {
  CreateMaquinaDTO,
  maquinaRepository,
  UpdateMaquinaDTO,
} from './MaquinaRepository';

export function useMaquinas() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);

  useEffect(() => {
    const subscription = maquinaRepository.observeAll().subscribe(setMaquinas);
    return () => subscription.unsubscribe();
  }, []);

  const createMaquina = async (dto: CreateMaquinaDTO) => {
    return await maquinaRepository.createMaquina(dto);
  };

  const updateMaquina = async (id: string, dto: UpdateMaquinaDTO) => {
    return await maquinaRepository.updateMaquina(id, dto);
  };

  return { maquinas, createMaquina, updateMaquina };
}
