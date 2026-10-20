import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import { modelClasses } from '../src/entities';
import { migrations } from '../src/database/migrations';
import { schema } from '../src/database/schema';
import { TalhaoRepository } from '../src/features/mapa/TalhaoRepository';
import { AnimalRepository } from '../src/features/rebanho/AnimalRepository';
import { TratamentoRepository } from '../src/features/rebanho/TratamentoRepository';
import { OrdenhaRepository } from '../src/features/rebanho/OrdenhaRepository';
import { EstoqueRepository } from '../src/features/estoque/EstoqueRepository';
import { MaquinaRepository } from '../src/features/maquinas/MaquinaRepository';

function createTestDatabase(): Database {
  const testAdapter = new LokiJSAdapter({
    schema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });

  return new Database({
    adapter: testAdapter,
    modelClasses,
  });
}

async function runPersistenceTest() {
  console.log('=========================================================');
  console.log('🌾 MINHA FAZENDA - TESTE DE PERSISTÊNCIA E TIMESTAMPS');
  console.log('=========================================================\n');

  const testDb = createTestDatabase();
  const talhaoRepository = new TalhaoRepository(testDb);
  const animalRepository = new AnimalRepository(testDb);
  const tratamentoRepository = new TratamentoRepository(testDb);
  const ordenhaRepository = new OrdenhaRepository(testDb);
  const estoqueRepository = new EstoqueRepository(testDb);
  const maquinaRepository = new MaquinaRepository(testDb);

  const tag = `TEST-${Date.now().toString().slice(-4)}`;

  // 1. Criar Talhão e validar created_at / updated_at automáticos do WatermelonDB
  const talhao = await talhaoRepository.createTalhao({
    nome: `Talhão ${tag}`,
    tipo: 'Pastagem',
    areaHa: 14.5,
    possuiCerca: true,
  });

  if (!talhao.createdAt || talhao.createdAt.getTime() <= 0) {
    throw new Error(`Falha de timestamp: created_at não foi preenchido (${talhao.createdAt})`);
  }
  if (!talhao.updatedAt || talhao.updatedAt.getTime() <= 0) {
    throw new Error(`Falha de timestamp: updated_at não foi preenchido (${talhao.updatedAt})`);
  }
  console.log(`✅ Talhão criado: ${talhao.nome} (created_at=${talhao.createdAt.toISOString()})`);

  // 2. Criar Animal vinculado ao Talhão
  const brinco = `BR-${tag}`;
  const animal = await animalRepository.createAnimal({
    brinco,
    nome: `Mimosa ${tag}`,
    raca: 'Holandesa',
    pesoKg: 510,
    producaoLeiteL: 24.0,
    talhaoId: talhao.id,
  });

  const animalLido = await animalRepository.findByBrinco(brinco);
  if (!animalLido || animalLido.id !== animal.id) {
    throw new Error('Falha ao buscar animal por brinco');
  }
  console.log(`✅ Animal criado e consultado por índice: ${animalLido.brinco}`);

  // 3. Criar Tratamento, Ordenha, Estoque e Máquina
  const tratamento = await tratamentoRepository.createTratamento({
    animalId: animal.id,
    medicamento: 'Vacina Aftosa',
    dataInicio: new Date(),
    notificacaoAtiva: true,
  });

  const ordenha = await ordenhaRepository.createOrdenha({
    periodo: 'manha',
    volumeLitros: 24.0,
    dataRegistro: new Date(),
  });

  const estoque = await estoqueRepository.createItem({
    categoria: 'insumo',
    nome: `Ração ${tag}`,
    quantidade: 200,
    unidade: 'kg',
    estoqueMinimo: 50,
  });

  await estoqueRepository.adjustQuantity(estoque.id, -30);
  const estoqueAtualizado = await estoqueRepository.getById(estoque.id);
  if (estoqueAtualizado.quantidade !== 170) {
    throw new Error(`Saldo incorreto após baixa: esperado 170, obtido ${estoqueAtualizado.quantidade}`);
  }

  const maquina = await maquinaRepository.createMaquina({
    nome: `Trator ${tag}`,
    statusPercentual: 100,
    manutencaoDevida: false,
  });

  console.log('✅ Estoque, Tratamento, Ordenha e Máquina validados com sucesso.');

  // 4. Limpeza dos registros de teste
  await tratamentoRepository.destroyPermanently(tratamento.id);
  await ordenhaRepository.destroyPermanently(ordenha.id);
  await estoqueRepository.destroyPermanently(estoque.id);
  await maquinaRepository.destroyPermanently(maquina.id);
  await animalRepository.destroyPermanently(animal.id);
  await talhaoRepository.destroyPermanently(talhao.id);

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
}

runPersistenceTest().catch((error) => {
  console.error('❌ Falha nos testes de persistência:', error);
  process.exit(1);
});
