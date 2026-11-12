import {
  atribuirOcorrencia,
  cancelarOcorrencia,
  concluirOcorrencia,
  criarOcorrencia,
  garantirSeedOcorrencias,
  iniciarOcorrencia,
  listarEventosDaTarefa,
  listarMinhasTarefas,
  listarTodasTarefas,
  pegarTarefa,
  soltarTarefa,
} from '@/services/ocorrenciaService';
import { listarColaboradores, usuarioAtual } from '@/services/usuario';
import { initTestDatabase } from './support/database';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

async function rejeita(acao: () => Promise<unknown>): Promise<string | null> {
  try {
    await acao();
    return null;
  } catch (erro) {
    return erro instanceof Error ? erro.message : String(erro);
  }
}

async function runOcorrenciasTest() {
  console.log('=========================================================');
  console.log('📋 MINHA FAZENDA - TESTE DE TAREFAS E OCORRÊNCIAS');
  console.log('=========================================================\n');

  await initTestDatabase();
  const eu = usuarioAtual();
  const [, joao] = listarColaboradores();

  // 1. Criação de ocorrência e gravação correta do evento inicial 'criada'
  const cerca = await criarOcorrencia({
    titulo: 'Cerca quebrada no Pasto 2',
    categoria: 'cerca',
    descricao: 'Mourão caído após chuva forte.',
    urgente: false,
    autorId: eu.id,
  });

  check(
    cerca.status === 'aberta' &&
      cerca.categoria === 'cerca' &&
      cerca.responsavelId === null &&
      cerca.syncStatus === 'pendente',
    'ocorrência criada nasce aberta, sem responsável e com sync pendente'
  );

  const eventosIniciais = await listarEventosDaTarefa(cerca.id);
  check(
    eventosIniciais.length === 1 &&
      eventosIniciais[0].tipo === 'criada' &&
      eventosIniciais[0].autorId === eu.id &&
      eventosIniciais[0].texto === 'Mourão caído após chuva forte.',
    'evento inicial "criada" gravado em tarefa_eventos na mesma transação'
  );

  // 2. Assumir ("pegar") e transições de estado válidas (Aberta -> Em andamento -> Concluída)
  const assumida = await pegarTarefa(cerca.id, joao.id);
  check(
    assumida.responsavelId === joao.id && assumida.status === 'aberta',
    'colaborador assume tarefa aberta e sem dono'
  );

  const emAndamento = await iniciarOcorrencia(cerca.id, joao);
  check(
    emAndamento.status === 'em_andamento',
    'transição válida: Aberta -> Em andamento'
  );

  const concluida = await concluirOcorrencia(cerca.id, {
    autor: joao,
    observacao: 'Mourão trocado e arame esticado.',
  });
  check(
    concluida.status === 'concluida',
    'transição válida: Em andamento -> Concluída'
  );

  const historicoCompleto = await listarEventosDaTarefa(cerca.id);
  check(
    historicoCompleto.map((e) => e.tipo).join(',') === 'criada,assumida,iniciada,concluida',
    'histórico append-only registra toda a linha do tempo na ordem correta'
  );

  // 3. Bloqueio de regras: pegar exige aberta e sem dono; cancelar exige motivo
  const erroPegarConcluida = await rejeita(() => pegarTarefa(cerca.id, eu.id));
  check(
    erroPegarConcluida !== null,
    'bloqueia "pegar" tarefa que já tem dono ou não está aberta'
  );

  const comDono = await criarOcorrencia({
    categoria: 'maquina',
    responsavelId: eu.id,
  });
  const erroPegarComDono = await rejeita(() => pegarTarefa(comDono.id, joao.id));
  check(
    erroPegarComDono !== null,
    'bloqueia "pegar" tarefa que já possui responsável'
  );

  const erroCancelarSemMotivo = await rejeita(() =>
    cancelarOcorrencia(comDono.id, '   ', eu)
  );
  check(
    erroCancelarSemMotivo !== null,
    'bloqueia cancelamento sem motivo (RN-T08)'
  );

  const cancelada = await cancelarOcorrencia(comDono.id, 'Duplicada por engano', eu);
  check(
    cancelada.status === 'cancelada',
    'cancela tarefa quando motivo válido é informado'
  );

  // Soltar tarefa devolve para aberta e sem responsável
  const paraSoltar = await criarOcorrencia({
    categoria: 'agua',
    responsavelId: joao.id,
  });
  await iniciarOcorrencia(paraSoltar.id, joao);
  const solta = await soltarTarefa(paraSoltar.id, joao.id);
  check(
    solta.status === 'aberta' && solta.responsavelId === null,
    'soltar tarefa em andamento devolve para Aberta e sem responsável (RN-T04)'
  );

  // Atribuição pelo admin
  await atribuirOcorrencia(paraSoltar.id, eu.id, eu);

  // 4. Consulta de "Minhas tarefas": urgentes primeiro, depois por prazo
  const hoje = new Date();
  const prazoDistante = new Date(hoje.getTime() + 10 * 24 * 60 * 60 * 1000);
  const prazoProximo = new Date(hoje.getTime() + 1 * 24 * 60 * 60 * 1000);

  const normalPrazoProximo = await criarOcorrencia({
    titulo: 'Normal prazo próximo',
    categoria: 'pasto',
    urgente: false,
    responsavelId: eu.id,
    prazo: prazoProximo,
  });

  const urgentePrazoDistante = await criarOcorrencia({
    titulo: 'Urgente prazo distante',
    categoria: 'animal',
    urgente: true,
    responsavelId: eu.id,
    prazo: prazoDistante,
  });

  const minhas = await listarMinhasTarefas(eu.id);
  check(
    minhas[0].id === urgentePrazoDistante.id &&
      minhas[1].id === normalPrazoProximo.id,
    'listarMinhasTarefas traz urgentes no topo e depois ordena por prazo (RF-T21)'
  );

  // Filtros em "Todas as tarefas"
  const semDono = await criarOcorrencia({
    titulo: 'Sem dono aberta',
    categoria: 'outro',
    responsavelId: null,
  });
  const filtradasSemDono = await listarTodasTarefas({ semResponsavel: true });
  check(
    filtradasSemDono.length === 1 && filtradasSemDono[0].id === semDono.id,
    'listarTodasTarefas filtra corretamente por "sem responsável" (RF-T22)'
  );

  // 5. Seed inicial num banco vazio
  await initTestDatabase();
  await garantirSeedOcorrencias();
  const todasDoSeed = await listarTodasTarefas();
  check(
    todasDoSeed.length === 3,
    'garantirSeedOcorrencias popula 3 ocorrências de exemplo quando o banco está vazio'
  );

  console.log('\n🎉 TODOS OS TESTES DE OCORRÊNCIAS PASSARAM COM 100% DE SUCESSO!\n');
}

runOcorrenciasTest().catch((erro) => {
  console.error('❌ Falha nos testes de ocorrências:', erro);
  process.exit(1);
});
