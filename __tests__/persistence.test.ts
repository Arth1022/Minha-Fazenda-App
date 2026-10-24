import { eq } from 'drizzle-orm';

// As features importam `@/database`; o tsconfig.test.json aponta esse caminho para
// ./support/database (sql.js em memória com o mesmo schema e migrations do app).
import type { CriasDaMae, UltimaPesagem, UltimoParto } from '@/dtos';
import { salvarOrdenha, todasOrdenhas } from '@/features/home/ordenhas';
import {
  animalPorId,
  createAnimal,
  criasDe,
  criasPorMae,
  listarAnimais,
  registrarParto,
  registrarSaida,
  ultimosPartos,
} from '@/features/rebanho/data/animais';
import { createPesagem, pesagensDoAnimal, pesosAtuais } from '@/features/rebanho/data/pesagens';
import { createReproducao, reproducoesDoAnimal } from '@/features/rebanho/data/reproducoes';
import {
  createTratamento,
  toggleDiaConfirmado,
  tratamentosComCarencia,
  tratamentosDoAnimal,
  ultimoUsoDoMedicamento,
} from '@/features/rebanho/data/tratamentos';
import { calcularFase } from '@/features/rebanho/services/fase';
import { salvarTipoProducao } from '@/providers/FazendaProvider';
import {
  animais,
  db,
  fazendaConfig,
  initTestDatabase,
  lotes,
  reproducoes,
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
const dia = (d: number, m: number, a = 2026) => new Date(a, m - 1, d);

async function rejeita(acao: () => Promise<unknown>): Promise<boolean> {
  try {
    await acao();
    return false;
  } catch {
    return true;
  }
}

async function runPersistenceTest() {
  console.log('=========================================================');
  console.log('🌾 MINHA FAZENDA - TESTE DE PERSISTÊNCIA (Drizzle + SQLite)');
  console.log('=========================================================\n');

  await initTestDatabase();

  // 1. Configuração da fazenda: uma única linha, alterável
  await salvarTipoProducao('corte');
  await salvarTipoProducao('misto');
  const configs = await db.select().from(fazendaConfig);
  check(configs.length === 1 && configs[0].tipoProducao === 'misto', 'tipo de produção gravado e alterado numa única linha');

  // 2. Cadastro com valores padrão
  const [lote] = await db.insert(lotes).values({ nome: 'Maternidade' }).returning();
  const vaca = await createAnimal({
    brinco: '#201',
    nome: 'Mimosa',
    raca: 'Girolando',
    dataNascimento: dia(1, 1, 2021),
    loteId: lote.id,
  });
  check(UUID_V4.test(vaca.id), `id do animal é UUID v4 (${vaca.id})`);
  check(vaca.sexo === 'F' && vaca.status === 'ativo' && !vaca.nascimentoAproximado, 'padrões: fêmea, ativa, nascimento exato');
  check(vaca.createdAt instanceof Date && vaca.updatedAt instanceof Date, 'created_at / updated_at preenchidos como Date');
  check((await animalPorId(vaca.id))?.raca === 'Girolando', 'animalPorId encontra o animal com os campos mapeados');
  check(vaca.jaPariu === false, 'ja_pariu começa false (sem backfill por idade)');
  const compradaParida = await createAnimal({ brinco: '#205', origem: 'comprado', dataNascimento: dia(1, 1, 2020), jaPariu: true });
  check((await animalPorId(compradaParida.id))?.jaPariu === true, 'createAnimal grava ja_pariu (vaca comprada já parida)');
  check(vaca.criasAnteriores === 0, 'crias_anteriores começa 0');
  const pariuAntes = await createAnimal({ brinco: '#206', criasAnteriores: 3, jaPariu: true });
  check((await animalPorId(pariuAntes.id))?.criasAnteriores === 3, 'createAnimal grava crias_anteriores');
  check(
    calcularFase({ ...compradaParida, ultimoParto: null }, dia(24, 10)) === 'vaca',
    'comprada com ja_pariu é vaca sem cria registrada'
  );
  check(vaca.producaoLeiteL === null && vaca.racaoKgDia === null, 'leite estimado e ração são opcionais (null)');
  const leiteira = await createAnimal({ brinco: '#206', producaoLeiteL: 18.5, racaoKgDia: 6 });
  const gravada = await animalPorId(leiteira.id);
  check(gravada?.producaoLeiteL === 18.5 && gravada.racaoKgDia === 6, 'createAnimal grava leite estimado e ração por dia');

  // 3. Cobertura com previsão de parto
  const cobertura = await createReproducao({ animalId: vaca.id, tipo: 'inseminacao', data: dia(1, 1) });
  check(cobertura.previsaoParto?.getTime() === dia(11, 10).getTime(), 'cobertura grava a previsão de parto (+283 dias)');

  // 4. Parto: cria o bezerro ligado à mãe e fecha a cobertura
  const cria = await registrarParto(vaca.id, { data: dia(10, 10), sexo: 'M', brinco: '#301' });
  check(
    cria.maeId === vaca.id && cria.origem === 'nascido' && cria.dataNascimento?.getTime() === dia(10, 10).getTime(),
    'parto cria o bezerro com mãe, origem e nascimento preenchidos'
  );
  check(cria.loteId === lote.id, 'bezerro nasce no lote da mãe');
  const [coberturaFechada] = await reproducoesDoAnimal(vaca.id);
  check(
    coberturaFechada.criaId === cria.id && coberturaFechada.dataParto?.getTime() === dia(10, 10).getTime(),
    'parto fecha a cobertura em aberto da vaca'
  );
  check((await criasDe(vaca.id)).length === 1, 'crias = animais com mae_id da vaca');
  // Tipar com o DTO faz o tsc acusar se a consulta e o contrato divergirem
  const partos: UltimoParto[] = await ultimosPartos();
  check(
    partos.length === 1 && partos[0].maeId === vaca.id && partos[0].data instanceof Date,
    'último parto de cada mãe sai do nascimento da cria'
  );
  check(
    calcularFase({ ...vaca, ultimoParto: partos[0].data }, dia(24, 10)) === 'vaca',
    'fêmea com cria registrada é vaca sem ja_pariu (caso da Mimosa do seed)'
  );
  const crias: CriasDaMae[] = await criasPorMae();
  check(
    crias.length === 1 && crias[0].maeId === vaca.id && crias[0].total === 1,
    'criasPorMae conta as crias de cada mãe numa consulta só'
  );

  const comCrias = await db.query.animais.findFirst({
    where: eq(animais.id, vaca.id),
    with: { crias: true, lote: true, reproducoes: true },
  });
  check(
    comCrias?.crias.length === 1 && comCrias.lote?.nome === 'Maternidade' && comCrias.reproducoes.length === 1,
    'relações animal → crias, lote e reproduções'
  );

  // 5. Pesagens
  await createPesagem({ animalId: cria.id, data: dia(10, 10), pesoKg: 35 });
  await createPesagem({ animalId: cria.id, data: dia(24, 10), pesoKg: 42.5 });
  const pesos = await pesagensDoAnimal(cria.id);
  check(pesos[0].pesoKg === 42.5 && pesos[1].pesoKg === 35, 'pesagens da mais recente para a mais antiga');
  // A mais antiga gravada por último: o peso atual tem de vir da data, não da ordem de gravação
  await createPesagem({ animalId: vaca.id, data: dia(20, 10), pesoKg: 500 });
  await createPesagem({ animalId: vaca.id, data: dia(5, 10), pesoKg: 480 });
  const ultimas: UltimaPesagem[] = await pesosAtuais();
  const atuais = new Map(ultimas.map((p) => [p.animalId, p]));
  check(atuais.size === 2, 'pesosAtuais traz uma linha por animal pesado');
  check(
    atuais.get(vaca.id)?.pesoKg === 500 && atuais.get(vaca.id)?.data?.getTime() === dia(20, 10).getTime(),
    'peso atual é o da pesagem mais recente, com a data dela'
  );
  check(atuais.get(cria.id)?.pesoKg === 42.5, 'peso atual da cria');

  // 6. Tratamentos, dias e último uso do remédio
  const tratamento = await createTratamento({
    animalId: vaca.id,
    medicamento: 'Antibiótico',
    dose: '20 ml',
    dataInicio: dia(20, 10),
    carenciaLeiteDias: 4,
    carenciaCarneDias: 21,
  });
  check(tratamento.diasConfirmados.length === 0 && tratamento.notificacaoAtiva, 'tratamento começa sem dias confirmados');
  await sleep(5);
  await toggleDiaConfirmado(tratamento, 3);
  let [atual] = await tratamentosDoAnimal(vaca.id);
  await toggleDiaConfirmado(atual, 1);
  [atual] = await tratamentosDoAnimal(vaca.id);
  check(atual.diasConfirmados.join(',') === '1,3', 'marcar dias mantém a lista ordenada');
  check(
    atual.updatedAt.getTime() > tratamento.updatedAt.getTime() &&
      atual.createdAt.getTime() === tratamento.createdAt.getTime(),
    'update renova updated_at e preserva created_at'
  );

  const ultimoUso = await ultimoUsoDoMedicamento('  ANTIBIOTICO ');
  check(
    ultimoUso?.dose === '20 ml' && ultimoUso.carenciaLeiteDias === 4 && ultimoUso.carenciaCarneDias === 21,
    'mesmo remédio (sem acento/maiúsculas) traz dose e carências do último uso'
  );
  check((await ultimoUsoDoMedicamento('Vermífugo')) === null, 'remédio nunca usado não preenche nada');
  check((await tratamentosComCarencia()).length === 1, 'lista tratamentos com carência para os alertas');

  const [bruto] = sqlite.exec(
    `select data_inicio, dias_confirmados from tratamentos where id = '${tratamento.id}'`
  )[0].values;
  check(bruto[0] === dia(20, 10).getTime() && bruto[1] === '[1,3]', 'datas gravadas em epoch ms e arrays em JSON');

  check(
    await rejeita(() => createTratamento({ animalId: 'nao-existe', medicamento: 'X', dataInicio: new Date() })),
    'chave estrangeira rejeita tratamento de animal inexistente'
  );

  // 7. Saída: muda o status, nunca apaga
  const vendido = await createAnimal({ brinco: '#202', sexo: 'M' });
  await registrarSaida(vendido.id, { status: 'vendido', data: dia(23, 10), motivo: 'Venda para recria' });
  const ativos = await listarAnimais();
  const todos = await listarAnimais({ incluirInativos: true });
  check(!ativos.some((a) => a.id === vendido.id) && todos.some((a) => a.id === vendido.id), 'lista padrão mostra só ativos; o vendido continua gravado');
  const saida = todos.find((a) => a.id === vendido.id);
  check(saida?.status === 'vendido' && saida.motivoSaida === 'Venda para recria', 'saída grava status, data e motivo');

  // 8. Ordenha
  await salvarOrdenha({ periodo: 'manha', horarioPrevisto: '05:30', horarioNotificacao: '05:15', dataRegistro: new Date() });
  const [ordenha] = await todasOrdenhas();
  await salvarOrdenha(
    { periodo: 'manha', horarioPrevisto: '06:00', horarioNotificacao: '05:45', dataRegistro: new Date() },
    ordenha.id
  );
  const ordenhasSalvas = await todasOrdenhas();
  check(ordenhasSalvas.length === 1 && ordenhasSalvas[0].horarioPrevisto === '06:00', 'salvarOrdenha atualiza o registro existente do turno');

  // 9. Integridade ao apagar (o app não apaga animais; o banco protege as referências)
  await db.delete(lotes).where(eq(lotes.id, lote.id));
  check((await animalPorId(vaca.id))?.loteId === null, 'apagar lote limpa o lote dos animais');
  await db.delete(animais).where(eq(animais.id, vaca.id));
  check((await animalPorId(cria.id))?.maeId === null, 'apagar a mãe mantém a cria, sem mãe');
  check((await db.select().from(tratamentos)).length === 0, 'apagar o animal apaga os tratamentos dele');
  check((await db.select().from(reproducoes)).length === 0, 'apagar o animal apaga as reproduções dele');

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
}

runPersistenceTest().catch((error) => {
  console.error('❌ Falha nos testes de persistência:', error);
  process.exit(1);
});
