import { eq } from 'drizzle-orm';

// As features importam `@/database`; o tsconfig.test.json aponta esse caminho para
// ./support/database (sql.js em memória com o mesmo schema e migrations do app).
import { salvarOrdenha, todasOrdenhas } from '@/features/home/ordenhas';
import {
  animalPorId,
  createAnimal,
  todosAnimais,
} from '@/features/rebanho/data/animais';
import {
  createTratamento,
  toggleDiaConfirmado,
  tratamentosDoAnimal,
} from '@/features/rebanho/data/tratamentos';
import {
  animais,
  coberturas,
  db,
  initTestDatabase,
  sqlite,
  tratamentos,
} from './support/database';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function check(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPersistenceTest() {
  console.log('=========================================================');
  console.log('🌾 MINHA FAZENDA - TESTE DE PERSISTÊNCIA (Drizzle + SQLite)');
  console.log('=========================================================\n');

  await initTestDatabase();

  // 1. Animal + coberturas numa transação
  const animal = await createAnimal(
    { brinco: '#201', nome: 'Mimosa', raca: 'Holandesa', pesoKg: 510 },
    [
      { data: new Date(2026, 5, 1), tipo: 'inseminacao', touroSemen: 'Sêmen A' },
      { data: new Date(2026, 2, 1), tipo: 'monta_natural' },
    ]
  );
  check(UUID_V4.test(animal.id), `id do animal é UUID v4 (${animal.id})`);
  check(animal.crias === 0, 'crias padrão = 0');
  check(
    animal.createdAt instanceof Date && animal.updatedAt instanceof Date,
    'created_at / updated_at preenchidos como Date'
  );

  const comRelacoes = await db.query.animais.findFirst({
    where: eq(animais.id, animal.id),
    with: { coberturas: true, tratamentos: true },
  });
  check(comRelacoes?.coberturas.length === 2, 'relação animal → coberturas');

  // Falha no meio da transação: nada pode ficar gravado
  let falhou = false;
  try {
    await createAnimal({ brinco: '#202' }, [
      { data: new Date(), tipo: null as unknown as 'inseminacao' },
    ]);
  } catch {
    falhou = true;
  }
  const brinco202 = await db.select().from(animais).where(eq(animais.brinco, '#202'));
  check(falhou && brinco202.length === 0, 'transação desfeita quando uma cobertura é inválida');

  const lido = await animalPorId(animal.id);
  check(
    lido?.brinco === '#201' && lido.pesoKg === 510,
    'animalPorId encontra o animal com os campos mapeados'
  );
  check((await todosAnimais()).length === 1, 'todosAnimais lista o rebanho');

  // 2. Tratamentos
  const antigo = await createTratamento({
    animalId: animal.id,
    medicamento: 'Vermífugo',
    dataInicio: new Date(2026, 9, 1),
    dataFim: new Date(2026, 9, 5),
  });
  const recente = await createTratamento({
    animalId: animal.id,
    medicamento: 'Antibiótico',
    dataInicio: new Date(2026, 9, 10),
    dataFim: new Date(2026, 9, 19),
  });
  check(
    recente.diasConfirmados.length === 0 && recente.notificacaoAtiva,
    'tratamento começa sem dias confirmados e com notificação ativa'
  );

  const doAnimal = await tratamentosDoAnimal(animal.id);
  check(
    doAnimal[0].id === recente.id && doAnimal[1].id === antigo.id,
    'tratamentos ordenados do início mais recente para o mais antigo'
  );

  await sleep(5);
  await toggleDiaConfirmado(recente, 3);
  let [atual] = await tratamentosDoAnimal(animal.id);
  await toggleDiaConfirmado(atual, 1);
  [atual] = await tratamentosDoAnimal(animal.id);
  check(atual.diasConfirmados.join(',') === '1,3', 'marcar dias mantém a lista ordenada');
  await toggleDiaConfirmado(atual, 3);
  [atual] = await tratamentosDoAnimal(animal.id);
  check(atual.diasConfirmados.join(',') === '1', 'desmarcar dia remove da lista');
  check(
    atual.updatedAt.getTime() > recente.updatedAt.getTime() &&
      atual.createdAt.getTime() === recente.createdAt.getTime(),
    'update renova updated_at e preserva created_at'
  );

  const [bruto] = sqlite.exec(
    `select data_inicio, dias_confirmados from tratamentos where id = '${recente.id}'`
  )[0].values;
  check(
    bruto[0] === new Date(2026, 9, 10).getTime() && bruto[1] === '[1]',
    'datas gravadas em epoch ms e arrays em JSON'
  );

  let fkRejeitada = false;
  try {
    await createTratamento({ animalId: 'nao-existe', medicamento: 'X', dataInicio: new Date() });
  } catch {
    fkRejeitada = true;
  }
  check(fkRejeitada, 'chave estrangeira rejeita tratamento de animal inexistente');

  // 3. Ordenha
  await salvarOrdenha({
    periodo: 'manha',
    horarioPrevisto: '05:30',
    horarioNotificacao: '05:15',
    dataRegistro: new Date(),
  });
  const [ordenha] = await todasOrdenhas();
  await salvarOrdenha(
    {
      periodo: 'manha',
      horarioPrevisto: '06:00',
      horarioNotificacao: '05:45',
      dataRegistro: new Date(),
    },
    ordenha.id
  );
  const ordenhasSalvas = await todasOrdenhas();
  check(
    ordenhasSalvas.length === 1 && ordenhasSalvas[0].horarioPrevisto === '06:00',
    'salvarOrdenha atualiza o registro existente do turno'
  );

  // 4. Exclusão em cascata (ON DELETE CASCADE)
  await db.delete(animais).where(eq(animais.id, animal.id));
  const coberturasRestantes = await db.select().from(coberturas);
  const tratamentosRestantes = await db.select().from(tratamentos);
  check(
    coberturasRestantes.length === 0 && tratamentosRestantes.length === 0,
    'apagar o animal apaga coberturas e tratamentos em cascata'
  );

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
}

runPersistenceTest().catch((error) => {
  console.error('❌ Falha nos testes de persistência:', error);
  process.exit(1);
});
