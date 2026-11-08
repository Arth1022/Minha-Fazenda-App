import type { AgendaDoTratamento } from '@/dtos';
import { createAnimal } from '@/features/rebanho/data/animais';
import {
  confirmarDia,
  desfazerDia,
  diasConfirmados,
  diasConfirmadosDoAnimal,
  todasDosesConfirmadas,
} from '@/features/rebanho/data/doses';
import { alterarFimDoTratamento, createTratamento } from '@/features/rebanho/data/tratamentos';
import {
  diasComDose,
  ehDiaDeDose,
  errosDaAgenda,
  minutosDasDoses,
  proximaDosePendente,
  proximasDoses,
  tratamentosAtivos,
} from '@/features/rebanho/services/doses';
import { db, initTestDatabase, tratamentos } from './support/database';

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

// 19/10/2026 é segunda-feira. Dias da semana: 1 = domingo ... 7 = sábado.
const dia = (d: number, m = 10, h = 0, min = 0) => new Date(2026, m - 1, d, h, min);
const SEG_QUA_SEX = [2, 4, 6];
const TODOS = [1, 2, 3, 4, 5, 6, 7];
const datas = (lista: { dia: Date }[]) => lista.map((d) => d.dia.getDate()).join(',');

function agenda(parcial: Partial<AgendaDoTratamento>): AgendaDoTratamento {
  return {
    dataInicio: dia(19),
    dataFim: null,
    diasSemana: TODOS,
    horario: null,
    intervaloHoras: null,
    avisoMinutosAntes: 0,
    ...parcial,
  };
}

async function runDosesTest() {
  console.log('=========================================================');
  console.log('💉 MINHA FAZENDA - DOSES DO TRATAMENTO');
  console.log('=========================================================\n');

  // ---------- funções puras ----------
  const segQuaSex = agenda({ diasSemana: SEG_QUA_SEX, dataFim: dia(30) });
  check(
    diasComDose(segQuaSex).map((d) => d.indice).join(',') === '1,3,5,8,10,12',
    'seg/qua/sex começando na segunda: dias 1, 3, 5, 8, 10, 12'
  );
  check(datas(diasComDose(segQuaSex)) === '19,21,23,26,28,30', 'e as datas são 19, 21, 23, 26, 28 e 30/10');
  check(datas(diasComDose(agenda({ dataFim: dia(19) }))) === '19', 'dose única: fim igual ao início');
  check(datas(diasComDose(agenda({}), dia(22, 10, 15))) === '19,20,21,22', 'sem fim é contínuo: os dias vão até hoje');
  check(
    ehDiaDeDose(agenda({ diasSemana: SEG_QUA_SEX }), dia(30, 11)) && !ehDiaDeDose(agenda({ diasSemana: SEG_QUA_SEX }), dia(1, 12)),
    'sem fim: segunda 30/11 é dia de dose, terça 1/12 não'
  );
  check(!ehDiaDeDose(agenda({}), dia(18)), 'antes do início não é dia de dose');
  check(datas(diasComDose(agenda({ dataFim: dia(21) }))) === '19,20,21', 'todos os dias: um por dia, fim incluído');
  check(
    diasComDose(agenda({ dataInicio: dia(20), dataFim: dia(26), diasSemana: [2] })).map((d) => d.indice).join() === '7',
    'começando fora do dia da semana, o índice conta dias corridos (segunda 26/10 = dia 7)'
  );

  check(minutosDasDoses({ horario: '06:00', intervaloHoras: null }).join() === '360', 'uma dose por dia no horário');
  check(minutosDasDoses({ horario: '20:00', intervaloHoras: 8 }).join() === '240,720,1200', '20:00 de 8 em 8 h → 04:00, 12:00 e 20:00');
  check(minutosDasDoses({ horario: null, intervaloHoras: null }).length === 0, 'sem horário não há minutos');

  check(errosDaAgenda(segQuaSex).length === 0, 'agenda válida não tem erros');
  check(errosDaAgenda(agenda({ horario: '06:00', intervaloHoras: 5 })).length === 1, 'intervalo que não divide o dia é recusado');
  check(errosDaAgenda(agenda({ intervaloHoras: 8 })).length === 1, 'intervalo sem horário é recusado');
  check(
    errosDaAgenda(agenda({ horario: '06:00', intervaloHoras: 8, diasSemana: SEG_QUA_SEX, dataFim: dia(30) })).length === 1,
    'intervalo só vale com todos os dias'
  );
  check(errosDaAgenda(agenda({ diasSemana: [] })).length === 1, 'sem dias da semana é recusado');
  check(errosDaAgenda(agenda({ horario: '25:00' })).length === 1, 'horário inválido é recusado');
  check(errosDaAgenda(agenda({ dataFim: dia(18) })).length === 1, 'fim antes do início é recusado');
  check(errosDaAgenda(agenda({ diasSemana: [3], dataFim: dia(19) })).length === 1, 'período sem nenhum dia de dose é recusado');
  check(errosDaAgenda(agenda({ diasSemana: [3] })).length === 0, 'sem fim sempre tem dia de dose pela frente');

  const dozeEmDoze = agenda({ dataFim: dia(21), horario: '06:00', intervaloHoras: 12 });
  const proximas = proximasDoses(dozeEmDoze, dia(19, 10, 10), 3);
  check(
    proximas.map((d) => `${d.momento.getDate()} ${d.momento.getHours()}h`).join(', ') === '19 18h, 20 6h, 20 18h',
    'próximas doses a partir das 10h: 19 às 18h, 20 às 6h e 20 às 18h'
  );
  check(proximas[1].indice === 2 && !proximas[1].semHorario, 'cada dose traz o dia N e o horário');
  const semHorario = proximasDoses(agenda({ dataFim: dia(22) }), dia(20, 10, 15), 5);
  check(
    semHorario.length === 3 && semHorario[0].dia.getDate() === 20 && semHorario[0].semHorario,
    'sem horário, a dose de hoje continua na lista à tarde'
  );

  const pendente = proximaDosePendente(segQuaSex, [dia(19), dia(21)], dia(21, 10, 20));
  check(pendente?.indice === 5 && pendente.dia.getDate() === 23, 'pendente: hoje (21) já confirmado → sexta 23, dia 5');
  check(
    proximaDosePendente(segQuaSex, [dia(19)], dia(21, 10, 20))?.dia.getDate() === 21,
    'pendente: a dose de hoje ainda vale depois do horário'
  );
  check(
    proximaDosePendente(agenda({ dataFim: dia(20), horario: '07:00' }), [], dia(20))?.horarios[0].getHours() === 7,
    'pendente traz os horários do dia'
  );
  check(proximaDosePendente(segQuaSex, [], dia(31)) === null, 'depois do fim não há dose pendente');
  const continuo = proximaDosePendente(agenda({}), [dia(10, 12)], dia(10, 12, 9));
  check(continuo?.dia.getDate() === 11 && continuo.indice === 54, 'sem fim: hoje confirmado → amanhã (dia 54)');
  const proximasSemFim = proximasDoses(agenda({ diasSemana: SEG_QUA_SEX }), dia(1, 12), 3);
  check(datas(proximasSemFim) === '2,4,7', 'sem fim: próximas doses seguem adiante (2, 4 e 7/12)');

  const semFim = agenda({ dataInicio: dia(1) });
  const ativos = tratamentosAtivos(
    [segQuaSex, agenda({ dataInicio: dia(1), dataFim: dia(5) }), semFim, agenda({ dataInicio: dia(25) })],
    dia(24, 10, 12)
  );
  check(
    ativos.length === 2 && ativos[0] === segQuaSex && ativos[1] === semFim,
    'tratamentosAtivos: entre início e fim; sem fim continua ativo; o que não começou fica de fora'
  );

  // ---------- banco ----------
  await initTestDatabase();
  const vaca = await createAnimal({ brinco: '#1' });
  const tratamento = await createTratamento({
    animalId: vaca.id,
    medicamento: 'Antibiótico',
    dataInicio: dia(19),
    dataFim: dia(30),
    diasSemana: SEG_QUA_SEX,
    horario: '07:00',
  });
  check(tratamento.diasSemana.join() === '2,4,6' && tratamento.horario === '07:00', 'createTratamento grava a agenda');
  const padrao = await createTratamento({ animalId: vaca.id, medicamento: 'Vermífugo', dataInicio: dia(19) });
  check(padrao.diasSemana.length === 7 && padrao.avisoMinutosAntes === 15, 'sem agenda: todos os dias, aviso 15 min antes');

  const antes = (await db.select().from(tratamentos)).length;
  check(
    await rejeita(() =>
      createTratamento({ animalId: vaca.id, medicamento: 'X', dataInicio: dia(19), horario: '06:00', intervaloHoras: 7 })
    ),
    'createTratamento recusa agenda inválida'
  );
  check((await db.select().from(tratamentos)).length === antes, 'e não grava nada');

  const fimDe = async (id: string) =>
    (await db.select().from(tratamentos)).find((t) => t.id === id)?.dataFim?.getTime();
  await alterarFimDoTratamento(padrao, dia(25, 10, 15));
  check((await fimDe(padrao.id)) === dia(25).getTime(), 'alterarFimDoTratamento grava a meia-noite do novo fim');
  check(
    await rejeita(() => alterarFimDoTratamento(padrao, dia(18))),
    'alterarFimDoTratamento recusa fim antes do início'
  );
  check((await fimDe(padrao.id)) === dia(25).getTime(), 'e mantém o fim anterior');

  await confirmarDia(tratamento.id, dia(21, 10, 9));
  await confirmarDia(tratamento.id, dia(21, 10, 18));
  await confirmarDia(tratamento.id, dia(19));
  const confirmados = await diasConfirmados(tratamento.id);
  check(datas(confirmados) === '19,21', 'confirmarDia é idempotente e guarda a meia-noite do dia');
  check(confirmados[0].dia.getHours() === 0, 'o dia gravado é a meia-noite local');
  check(await rejeita(() => confirmarDia(tratamento.id, dia(20))), 'confirmar terça num tratamento seg/qua/sex é recusado');
  check(await rejeita(() => confirmarDia('nao-existe', dia(19))), 'confirmar em tratamento inexistente é recusado');

  await desfazerDia(tratamento.id, dia(21, 10, 15));
  await desfazerDia(tratamento.id, dia(21));
  check(datas(await diasConfirmados(tratamento.id)) === '19', 'desfazerDia remove o dia e é idempotente');

  await confirmarDia(padrao.id, dia(19));
  const doAnimal = await diasConfirmadosDoAnimal(vaca.id);
  check(
    doAnimal.length === 2 && doAnimal.every((d) => d.dia.getDate() === 19) &&
      new Set(doAnimal.map((d) => d.tratamentoId)).size === 2,
    'diasConfirmadosDoAnimal junta os tratamentos do animal numa consulta'
  );
  const todas = await todasDosesConfirmadas();
  check(todas.length === 2, 'todasDosesConfirmadas traz todas as doses do rebanho numa consulta');

  console.log('\n🎉 DOSES OK!\n');
}

runDosesTest().catch((error) => {
  console.error('❌ Falha nos testes de doses:', error);
  process.exit(1);
});
