import { useEffect, useState } from 'react';
import Talhao from '@/entities/Talhao';
import { CreateTalhaoDTO, talhaoRepository } from './TalhaoRepository';

export function useTalhoes() {
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);

  useEffect(() => {
    const subscription = talhaoRepository.observeAll().subscribe(setTalhoes);
    return () => subscription.unsubscribe();
  }, []);

  const createTalhao = async (dto: CreateTalhaoDTO) => {
    return await talhaoRepository.createTalhao(dto);
  };

  return {
    talhoes,
    createTalhao,
  };
}
