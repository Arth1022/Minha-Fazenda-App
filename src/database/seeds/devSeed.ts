import { talhaoRepository } from '@/features/mapa/TalhaoRepository';
import { animalRepository } from '@/features/rebanho/AnimalRepository';
import { tratamentoRepository } from '@/features/rebanho/TratamentoRepository';
import { ordenhaRepository } from '@/features/rebanho/OrdenhaRepository';
import { estoqueRepository } from '@/features/estoque/EstoqueRepository';
import { maquinaRepository } from '@/features/maquinas/MaquinaRepository';

/**
 * Seed de desenvolvimento para popular os dados idênticos ao protótipo do Figma.
 * Executa exclusivamente em ambiente de desenvolvimento (__DEV__).
 */
export async function runDevSeed(): Promise<void> {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return;
  }

  // 1. Talhões (Pasto 1: 15.2 Ha, Lavoura 2: 28 Ha)
  let pasto1Id: string | undefined;
  const existingTalhoes = await talhaoRepository.getAll();
  if (existingTalhoes.length === 0) {
    const pasto1 = await talhaoRepository.createTalhao({
      nome: 'Pasto 1',
      tipo: 'pastagem',
      areaHa: 15.2,
      possuiCerca: true,
    });
    pasto1Id = pasto1.id;

    await talhaoRepository.createTalhao({
      nome: 'Lavoura 2',
      tipo: 'lavoura',
      areaHa: 28.0,
      possuiCerca: true,
    });
  } else {
    pasto1Id = existingTalhoes[0]?.id;
  }

  // 2. Animais (Brinco #101, Brinco #102, Bessie)
  const existingAnimais = await animalRepository.getAll();
  let animal101Id = existingAnimais[0]?.id;

  if (existingAnimais.length === 0) {
    const a101 = await animalRepository.createAnimal({
      brinco: '#101',
      nome: 'Brinco #101',
      raca: 'Holandesa',
      pesoKg: 512,
      producaoLeiteL: 22.1,
      crias: 3,
      racaoKgDia: 6.5,
      talhaoId: pasto1Id,
    });
    animal101Id = a101.id;

    await animalRepository.createAnimal({
      brinco: '#102',
      nome: 'Brinco #102',
      raca: 'Nelore',
      pesoKg: 480,
      producaoLeiteL: 18.5,
      crias: 2,
      racaoKgDia: 5.0,
      talhaoId: pasto1Id,
    });

    await animalRepository.createAnimal({
      brinco: '#103',
      nome: 'Bessie',
      raca: 'Holandesa',
      pesoKg: 495,
      producaoLeiteL: 20.7,
      crias: 2,
      racaoKgDia: 6.0,
      talhaoId: pasto1Id,
    });
  } else if (existingAnimais.length === 2) {
    await animalRepository.createAnimal({
      brinco: '#103',
      nome: 'Bessie',
      raca: 'Holandesa',
      pesoKg: 495,
      producaoLeiteL: 20.7,
      crias: 2,
      racaoKgDia: 6.0,
      talhaoId: pasto1Id,
    });
  }

  // 3. Tratamentos (Antibiótico X: 10 Out - 19 Out, dias 1..7)
  const existingTratamentos = await tratamentoRepository.count();
  if (existingTratamentos === 0 && animal101Id) {
    await tratamentoRepository.createTratamento({
      animalId: animal101Id,
      medicamento: 'Antibiótico X',
      dataInicio: new Date(2026, 9, 10),
      dataFim: new Date(2026, 9, 19),
      diasConfirmados: [1, 2, 3, 4, 5, 6, 7],
      notificacaoAtiva: true,
    });
  }

  // 4. Estoque Fazenda (Insumos: Ração, Sementes, Adubo; Medicamentos: Vacinas, Antibióticos; Peças: Item)
  const existingEstoque = await estoqueRepository.getAll();
  const nomesEstoque = new Set(existingEstoque.map((i) => i.nome));

  if (!nomesEstoque.has('Ração')) {
    await estoqueRepository.createItem({
      categoria: 'insumo',
      nome: 'Ração',
      quantidade: 4200,
      unidade: 'kg',
      estoqueMinimo: 500,
    });
  }
  if (!nomesEstoque.has('Sementes')) {
    await estoqueRepository.createItem({
      categoria: 'insumo',
      nome: 'Sementes',
      quantidade: 350,
      unidade: 'kg',
      estoqueMinimo: 50,
    });
  }
  if (!nomesEstoque.has('Adubo')) {
    await estoqueRepository.createItem({
      categoria: 'insumo',
      nome: 'Adubo',
      quantidade: 18,
      unidade: 'sacas',
      estoqueMinimo: 5,
    });
  }
  if (!nomesEstoque.has('Vacinas')) {
    await estoqueRepository.createItem({
      categoria: 'medicamento',
      nome: 'Vacinas',
      quantidade: 50,
      unidade: 'doses',
      estoqueMinimo: 15,
    });
  }
  if (!nomesEstoque.has('Antibióticos')) {
    await estoqueRepository.createItem({
      categoria: 'medicamento',
      nome: 'Antibióticos',
      quantidade: 12,
      unidade: 'frascos',
      estoqueMinimo: 5,
    });
  }
  if (existingEstoque.filter((i) => i.categoria === 'peca_maquina').length === 0) {
    await estoqueRepository.createItem({
      categoria: 'peca_maquina',
      nome: 'Item',
      quantidade: 2,
      unidade: 'un',
      estoqueMinimo: 5,
    });
  }

  // 5. Máquinas (Trator JD: 100%, Caminhão: 65% manutenção devida)
  const existingMaquinas = await maquinaRepository.getAll();
  if (existingMaquinas.length === 0) {
    await maquinaRepository.createMaquina({
      nome: 'Trator JD',
      statusPercentual: 100,
      manutencaoDevida: false,
    });
    await maquinaRepository.createMaquina({
      nome: 'Caminhão',
      statusPercentual: 65,
      manutencaoDevida: true,
    });
  } else if (existingMaquinas.length === 1) {
    await maquinaRepository.createMaquina({
      nome: 'Caminhão',
      statusPercentual: 65,
      manutencaoDevida: true,
    });
  }

  // 6. Ordenha (Manhã 05:30 / Notif 05:15 = 155L, Tarde 17:00 / Notif 16:45 = 130L -> Total 285 L)
  const existingOrdenhas = await ordenhaRepository.getAll();
  if (existingOrdenhas.length === 0) {
    await ordenhaRepository.createOrdenha({
      periodo: 'manha',
      horarioPrevisto: '05:30',
      horarioNotificacao: '05:15',
      volumeLitros: 155,
      dataRegistro: new Date(),
    });
    await ordenhaRepository.createOrdenha({
      periodo: 'tarde',
      horarioPrevisto: '17:00',
      horarioNotificacao: '16:45',
      volumeLitros: 130,
      dataRegistro: new Date(),
    });
  } else if (existingOrdenhas.length === 1) {
    await ordenhaRepository.createOrdenha({
      periodo: 'tarde',
      horarioPrevisto: '17:00',
      horarioNotificacao: '16:45',
      volumeLitros: 130,
      dataRegistro: new Date(),
    });
  }
}
