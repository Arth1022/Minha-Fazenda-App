import { useEffect, useState } from 'react';
import Animal from '@/entities/Animal';
import Ordenha from '@/entities/Ordenha';
import Tratamento from '@/entities/Tratamento';
import { animalRepository } from './AnimalRepository';
import { ordenhaRepository } from './OrdenhaRepository';
import { tratamentoRepository } from './TratamentoRepository';

export function useRebanho() {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [ordenhas, setOrdenhas] = useState<Ordenha[]>([]);

  useEffect(() => {
    const subAnimais = animalRepository.observeAll().subscribe(setAnimais);
    const subTratamentos = tratamentoRepository.observeAll().subscribe(setTratamentos);
    const subOrdenhas = ordenhaRepository.observeAll().subscribe(setOrdenhas);

    return () => {
      subAnimais.unsubscribe();
      subTratamentos.unsubscribe();
      subOrdenhas.unsubscribe();
    };
  }, []);

  const totalVolumeL = ordenhas.reduce((acc, o) => acc + (o.volumeLitros || 0), 0);

  return { animais, tratamentos, ordenhas, totalVolumeL };
}

export function useAnimal(id?: string) {
  const [animal, setAnimal] = useState<Animal | null>(null);

  useEffect(() => {
    if (!id) return;
    const subscription = animalRepository.observeById(id).subscribe({
      next: setAnimal,
      error: () => setAnimal(null),
    });
    return () => subscription.unsubscribe();
  }, [id]);

  return animal;
}
