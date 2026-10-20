import { talhaoRepository } from '@/features/mapa/TalhaoRepository';
import { animalRepository } from '@/features/rebanho/AnimalRepository';
import { tratamentoRepository } from '@/features/rebanho/TratamentoRepository';
import { ordenhaRepository } from '@/features/rebanho/OrdenhaRepository';
import { estoqueRepository } from '@/features/estoque/EstoqueRepository';
import { maquinaRepository } from '@/features/maquinas/MaquinaRepository';

/**
 * Seed opcional de desenvolvimento para popular dados de demonstração.
 * Executa exclusivamente em ambiente de desenvolvimento (__DEV__).
 */
export async function runDevSeed(): Promise<void> {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return;
  }

  const existingTalhoes = await talhaoRepository.count();
  if (existingTalhoes > 0) {
    return;
  }

  const pasto1 = await talhaoRepository.createTalhao({
    nome: 'Pasto 1',
    tipo: 'pastagem',
    areaHa: 15.2,
    possuiCerca: true,
  });

  await talhaoRepository.createTalhao({
    nome: 'Lavoura 2',
    tipo: 'lavoura',
    areaHa: 28.0,
    possuiCerca: true,
  });

  const bessie = await animalRepository.createAnimal({
    brinco: '#101',
    nome: 'Bessie',
    raca: 'Holandesa',
    pesoKg: 512,
    producaoLeiteL: 22.1,
    crias: 3,
    racaoKgDia: 6.5,
    talhaoId: pasto1.id,
  });

  await animalRepository.createAnimal({
    brinco: '#102',
    nome: 'Estrela',
    raca: 'Nelore',
    pesoKg: 480,
    producaoLeiteL: 0,
    crias: 2,
    racaoKgDia: 5.0,
    talhaoId: pasto1.id,
  });

  await tratamentoRepository.createTratamento({
    animalId: bessie.id,
    medicamento: 'Antibiótico X',
    dataInicio: new Date(),
    diasConfirmados: [1, 2, 3, 4, 5, 6, 7],
    notificacaoAtiva: true,
  });

  await estoqueRepository.createItem({
    categoria: 'insumo',
    nome: 'Ração',
    quantidade: 4200,
    unidade: 'kg',
    estoqueMinimo: 500,
  });

  await maquinaRepository.createMaquina({
    nome: 'Trator JD 6110J',
    statusPercentual: 100,
    manutencaoDevida: false,
  });

  await ordenhaRepository.createOrdenha({
    periodo: 'manha',
    horarioPrevisto: '05:30',
    horarioNotificacao: '05:15',
    volumeLitros: 155,
    dataRegistro: new Date(),
  });
}
