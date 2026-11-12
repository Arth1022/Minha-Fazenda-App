import { eq } from 'drizzle-orm';

// As features importam `@/database`, que lê o banco de `@/features/sync/db`; o
// tsconfig.test.json aponta esse caminho para ./support/database (PowerSync em Node).
import type { CriasDaMae, UltimaPesagem, UltimoParto } from '@/dtos';
import { salvarOrdenha, todasOrdenhas } from '@/features/home/ordenhas';
import {
  animalPorId,
  createAnimal,
  criasDe,
  criasPorMae,
  listarAnimais,
  listarTouros,
  registrarParto,
  registrarSaida,
  ultimosPartos,
} from '@/features/rebanho/data/animais';
import { createPesagem, pesagensDoAnimal, pesosAtuais } from '@/features/rebanho/data/pesagens';
import { createReproducao, reproducoesDoAnimal } from '@/features/rebanho/data/reproducoes';
import {
  alterarFimDoTratamento,
  createTratamento,
  tratamentosComCarencia,
  tratamentosDoAnimal,
  ultimoUsoDoMedicamento,
} from '@/features/rebanho/data/tratamentos';
import { calcularFase } from '@/features/rebanho/services/fase';
import { salvarTipoProducao } from '@/features/fazenda/configFazenda';
import { excluirLote } from '@/services/loteService';
import {
  animais,
  db,
  fazendaConfig,
  initTestDatabase,
  FAZENDA_TESTE,
  lotes,
  novoRegistro,
  powersync,
  fecharTestDatabase,
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
  check(configs[0].id === FAZENDA_TESTE && configs[0].fazendaId === FAZENDA_TESTE, 'a configuração é a linha da fazenda ativa (id = fazenda_id)');

  // 2. Cadastro com valores padrão
  const [lote] = await db.insert(lotes).values(novoRegistro({ nome: 'Maternidade' })).returning();
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
  check(vaca.fazendaId === FAZENDA_TESTE && vaca.createdBy === 'usuario-beta' && vaca.deletedAt === null, 'novoRegistro grava a fazenda ativa e quem criou');
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
  check(tratamento.notificacaoAtiva && tratamento.diasSemana.length === 7, 'tratamento começa com aviso e todos os dias');
  await sleep(5);
  await alterarFimDoTratamento(tratamento, dia(30, 10));
  const [atual] = await tratamentosDoAnimal(vaca.id);
  check(atual.dataFim?.getTime() === dia(30, 10).getTime(), 'fim do tratamento alterado');
  check(
    atual.updatedAt!.getTime() > tratamento.updatedAt!.getTime() &&
      atual.createdAt!.getTime() === tratamento.createdAt!.getTime(),
    'atualizar renova updated_at e preserva created_at'
  );

  const ultimoUso = await ultimoUsoDoMedicamento('  ANTIBIOTICO ');
  check(
    ultimoUso?.dose === '20 ml' && ultimoUso.carenciaLeiteDias === 4 && ultimoUso.carenciaCarneDias === 21,
    'mesmo remédio (sem acento/maiúsculas) traz dose e carências do último uso'
  );
  check((await ultimoUsoDoMedicamento('Vermífugo')) === null, 'remédio nunca usado não preenche nada');
  check((await tratamentosComCarencia()).length === 1, 'lista tratamentos com carência para os alertas');

  const [bruto] = await powersync.getAll<{ data_inicio: string; dias_semana: string }>(
    'select data_inicio, dias_semana from tratamentos where id = ?',
    [tratamento.id]
  );
  check(
    bruto.data_inicio === dia(20, 10).toISOString() && bruto.dias_semana === '[1,2,3,4,5,6,7]',
    'datas gravadas em texto ISO 8601 (UTC) e listas em JSON'
  );

  check(
    await rejeita(() => createTratamento({ animalId: 'nao-existe', medicamento: 'X', dataInicio: new Date() })),
    'tratamento de animal inexistente é recusado (sem FK no banco do sync, o app confere)'
  );

  // 7. Saída: muda o status, nunca apaga
  const vendido = await createAnimal({ brinco: '#202', sexo: 'M' });
  check((await listarTouros()).some((a) => a.id === vendido.id), 'listarTouros traz os machos ativos');
  await registrarSaida(vendido.id, { status: 'vendido', data: dia(23, 10), motivo: 'Venda para recria' });
  check(!(await listarTouros()).some((a) => a.id === vendido.id), 'listarTouros ignora machos inativos');
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

  // 9. Apagar = preencher deleted_at (a linha fica para o sync levar a exclusão)
  await excluirLote(lote.id);
  check((await animalPorId(vaca.id))?.loteId === null, 'excluir lote tira o lote dos animais');
  const [loteApagado] = await db.select().from(lotes).where(eq(lotes.id, lote.id));
  check(loteApagado?.deletedAt instanceof Date, 'o lote excluído continua no banco com deleted_at');

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
}

runPersistenceTest().then(fecharTestDatabase).catch((error) => {
  console.error('❌ Falha nos testes de persistência:', error);
  process.exit(1);
});
