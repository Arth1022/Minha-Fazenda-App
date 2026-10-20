import { useEffect, useState } from 'react';
import Animal from '@/entities/Animal';
import Ordenha from '@/entities/Ordenha';
import Tratamento from '@/entities/Tratamento';
import { animalRepository, CreateAnimalDTO } from './AnimalRepository';
import { CreateOrdenhaDTO, ordenhaRepository } from './OrdenhaRepository';
import { CreateTratamentoDTO, tratamentoRepository } from './TratamentoRepository';

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

  const totalVolumeL = ordenhas.reduce(
    (acc: number, o: Ordenha) => acc + (o.volumeLitros || 0),
    0
  );

  const createAnimal = async (dto: CreateAnimalDTO) => {
    return await animalRepository.createAnimal(dto);
  };

  const createTratamento = async (dto: CreateTratamentoDTO) => {
    return await tratamentoRepository.createTratamento(dto);
  };

  const createOrdenha = async (dto: CreateOrdenhaDTO) => {
    return await ordenhaRepository.createOrdenha(dto);
  };

  const toggleDiaTratamento = async (tratamento: Tratamento, dia: number) => {
    const atuais = Array.isArray(tratamento.diasConfirmados)
      ? tratamento.diasConfirmados
      : [];
    const existe = atuais.includes(dia);
    const novosDias = existe
      ? atuais.filter((d) => d !== dia)
      : [...atuais, dia].sort((a, b) => a - b);

    return await tratamentoRepository.updateTratamento(tratamento.id, {
      diasConfirmados: novosDias,
    });
  };

  return {
    animais,
    tratamentos,
    ordenhas,
    totalVolumeL,
    createAnimal,
    createTratamento,
    createOrdenha,
    toggleDiaTratamento,
  };
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

export function useAnimalTratamentos(animalId?: string) {
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);

  useEffect(() => {
    if (!animalId) return;
    const subscription = tratamentoRepository
      .observeByAnimal(animalId)
      .subscribe({
        next: setTratamentos,
        error: () => setTratamentos([]),
      });
    return () => subscription.unsubscribe();
  }, [animalId]);

  return tratamentos;
}
