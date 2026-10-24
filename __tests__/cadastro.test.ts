import {
  cadastrarAnimal,
  createAnimal,
  registrarParto,
} from '@/features/rebanho/data/animais';
import { pesagensDoAnimal } from '@/features/rebanho/data/pesagens';
import { createReproducao } from '@/features/rebanho/data/reproducoes';
import { createTratamento, nomesDeMedicamentos } from '@/features/rebanho/data/tratamentos';
import { inicioDoDia } from '@/utils/date';
import { animais, db, initTestDatabase, pesagens } from './support/database';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

async function rejeita(acao: () => Promise<unknown>): Promise<boolean> {
  try {
    await acao();
    return false;
  } catch {
    return true;
  }
}

const dia = (d: number, m: number, a = 2026) => new Date(a, m - 1, d);
const total = async () => ({
  animais: (await db.select().from(animais)).length,
  pesagens: (await db.select().from(pesagens)).length,
});

async function runCadastroTest() {
  console.log('=========================================================');
  console.log('🐮 MINHA FAZENDA - CADASTRO, PARTO E MEDICAMENTOS');
  console.log('=========================================================\n');

  await initTestDatabase();

  // cadastrarAnimal: animal + peso de entrada na mesma transação
  const comprado = await cadastrarAnimal(
    { brinco: '#10', origem: 'comprado', dataEntrada: dia(5, 10) },
    { pesoInicialKg: 320.5 }
  );
  const [pesoEntrada] = await pesagensDoAnimal(comprado.id);
  check(pesoEntrada?.pesoKg === 320.5 && pesoEntrada.data.getTime() === dia(5, 10).getTime(), 'peso inicial gravado na data de entrada');

  const comData = await cadastrarAnimal({ brinco: '#11', dataEntrada: dia(5, 10) }, { pesoInicialKg: 200, dataPesagem: dia(7, 10) });
  check((await pesagensDoAnimal(comData.id))[0].data.getTime() === dia(7, 10).getTime(), 'dataPesagem informada tem prioridade');

  const semData = await cadastrarAnimal({ brinco: '#12' }, { pesoInicialKg: 90 });
  const [pesoHoje] = await pesagensDoAnimal(semData.id);
  check(inicioDoDia(pesoHoje.data).getTime() === inicioDoDia(new Date()).getTime(), 'sem data de entrada, a pesagem é de hoje');

  const semPeso = await cadastrarAnimal({ brinco: '#13' });
  check((await pesagensDoAnimal(semPeso.id)).length === 0, 'sem peso inicial não cria pesagem');

  const antes = await total();
  check(await rejeita(() => cadastrarAnimal({ brinco: '#14' }, { pesoInicialKg: 0 })), 'peso zero é recusado');
  check(await rejeita(() => cadastrarAnimal({ brinco: '#15' }, { pesoInicialKg: Number.NaN })), 'peso inválido é recusado');

  const touro = await createAnimal({ brinco: '#900', sexo: 'M' });
  const vaca = await createAnimal({ brinco: '#201', sexo: 'F', jaPariu: true });
  check(await rejeita(() => cadastrarAnimal({ brinco: '#16', maeId: touro.id })), 'mãe precisa ser fêmea');
  check(await rejeita(() => cadastrarAnimal({ brinco: '#17', paiId: vaca.id })), 'pai precisa ser macho');
  check(await rejeita(() => cadastrarAnimal({ brinco: '#18', paiId: 'nao-existe' })), 'pai fora do rebanho é recusado');
  const depois = await total();
  check(depois.animais === antes.animais + 2 && depois.pesagens === antes.pesagens, 'cadastros recusados não gravam nada');

  const filho = await cadastrarAnimal({ brinco: '#19', maeId: vaca.id, paiId: touro.id });
  check(filho.maeId === vaca.id && filho.paiId === touro.id, 'cadastro grava mãe e pai');

  // Parto: o pai da cria vem do touro da cobertura
  await createReproducao({ animalId: vaca.id, tipo: 'cobertura', data: dia(1, 1), touroId: touro.id });
  const cria = await registrarParto(vaca.id, { data: dia(10, 10), sexo: 'F', brinco: '#301' });
  check(cria.paiId === touro.id, 'parto: a cria herda o touro da cobertura como pai');

  await createReproducao({ animalId: vaca.id, tipo: 'inseminacao', data: dia(1, 2), touroDescricao: 'Sêmen Gir 123' });
  const cria2 = await registrarParto(vaca.id, { data: dia(15, 11), sexo: 'M', brinco: '#302' });
  check(cria2.paiId === null && cria2.paiDescricao === 'Sêmen Gir 123', 'parto: sêmen de fora vira a descrição do pai');

  const cria3 = await registrarParto(vaca.id, { data: dia(20, 11), sexo: 'M', brinco: '#303', paiDescricao: 'Touro do vizinho' });
  check(cria3.paiId === null && cria3.paiDescricao === 'Touro do vizinho', 'parto: pai informado na hora vale mais que a cobertura');

  // Nomes de medicamentos
  check((await nomesDeMedicamentos()).join() === 'Brucelose', 'sem uso anterior, Brucelose aparece sempre');
  await createTratamento({ animalId: vaca.id, medicamento: 'antibiótico', dataInicio: dia(1, 9) });
  await createTratamento({ animalId: vaca.id, medicamento: 'Ivermectina', dataInicio: dia(1, 10) });
  await createTratamento({ animalId: vaca.id, medicamento: 'Antibiótico ', dataInicio: dia(20, 10) });
  await createTratamento({ animalId: vaca.id, medicamento: 'BRUCELOSE', dataInicio: dia(2, 9) });
  const nomes = await nomesDeMedicamentos(['Raiva', 'Ivermectina']);
  check(
    nomes.join() === 'Antibiótico,Ivermectina,BRUCELOSE,Raiva',
    `usados do mais recente ao mais antigo, sem repetir, depois as sugestões (${nomes.join(', ')})`
  );

  console.log('\n🎉 CADASTRO OK!\n');
}

runCadastroTest().catch((error) => {
  console.error('❌ Falha nos testes de cadastro:', error);
  process.exit(1);
});
