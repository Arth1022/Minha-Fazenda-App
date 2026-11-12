import { and, eq } from 'drizzle-orm';

import { animais, atualizar, daFazenda, db, maquinas, tarefas } from '@/database';
import { cadastrarMaquina, maquinaPorId } from '@/features/maquinas/data/maquinas';
import { cadastrarAnimal } from '@/features/rebanho/data/animais';
import {
  adicionarObservacaoOcorrencia,
  atribuirOcorrencia,
  cancelarOcorrencia,
  concluirOcorrencia,
  criarOcorrencia,
  editarOcorrencia,
  garantirSeedOcorrencias,
  identificarAreaNoPonto,
  iniciarOcorrencia,
  listarEventosDaTarefa,
  listarFotosDaTarefa,
  listarMinhasTarefas,
  listarOcorrenciasNoMapa,
  listarTodasTarefas,
  pegarTarefa,
  resolverQrCodeParaOcorrencia,
  soltarTarefa,
} from '@/services/ocorrenciaService';
import { criarTalhao } from '@/services/talhaoService';
import { listarColaboradores, usuarioAtual } from '@/services/usuario';
import { FAZENDA_TESTE, fazendaMembros, initTestDatabase, usuarios } from './support/database';

async function equipeDaFazenda() {
  const pessoas = [
    { id: 'usuario-beta', nome: 'Beta', papel: 'owner' as const },
    { id: 'colaborador-joao', nome: 'João', papel: 'collaborator' as const },
    { id: 'colaborador-maria', nome: 'Maria', papel: 'collaborator' as const },
  ];
  for (const p of pessoas) {
    await db.insert(usuarios).values({ id: p.id, nome: p.nome });
    await db.insert(fazendaMembros).values({ id: `m-${p.id}`, fazendaId: FAZENDA_TESTE, usuarioId: p.id, papel: p.papel });
  }
}

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
  await equipeDaFazenda();
  const eu = usuarioAtual();
  const colaboradores = await listarColaboradores();
  const joao = colaboradores[1];

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
  await equipeDaFazenda();
  await garantirSeedOcorrencias();
  const todasDoSeed = await listarTodasTarefas();
  check(
    todasDoSeed.length === 3,
    'garantirSeedOcorrencias popula 3 ocorrências de exemplo quando o banco está vazio'
  );

  // 6. Fase 2 — GPS, identificação automática de área pelo polígono e título padrão
  await initTestDatabase();
  await equipeDaFazenda();
  const pasto2 = await criarTalhao({
    nome: 'Pasto 2',
    tipo: 'pasto',
    coordenadas: [
      [-47.1, -22.9],
      [-47.09, -22.9],
      [-47.09, -22.89],
      [-47.1, -22.89],
    ],
  });

  const areaDetectada = await identificarAreaNoPonto(-22.895, -47.095);
  check(
    areaDetectada !== null && areaDetectada.id === pasto2.id && areaDetectada.nome === 'Pasto 2',
    'identificarAreaNoPonto encontra o polígono (Pasto 2) onde caiu a coordenada GPS'
  );

  const ocorrenciaComGps = await criarOcorrencia({
    categoria: 'cerca',
    pontoLat: -22.895,
    pontoLng: -47.095,
    urgente: true,
    fotos: [
      'file:///data/user/0/app/fotos/foto_1.jpg',
      'file:///data/user/0/app/fotos/foto_2.jpg',
      'data:image/jpeg;base64,/9j/4AAQSkZJRg==', // deve ser ignorada (nunca salvar base64 no SQLite)
    ],
  });

  check(
    ocorrenciaComGps.areaId === pasto2.id && ocorrenciaComGps.titulo === 'Cerca — Pasto 2',
    'criarOcorrencia com GPS dentro do polígono preenche areaId e gera título padrão "Cerca — Pasto 2"'
  );

  const ocorrenciaPorTalhaoSelecionado = await criarOcorrencia({
    categoria: 'pasto',
    areaId: pasto2.id,
  });
  check(
    ocorrenciaPorTalhaoSelecionado.titulo === 'Pasto/Lavoura — Pasto 2' &&
      ocorrenciaPorTalhaoSelecionado.pontoLat === pasto2.centroLat &&
      ocorrenciaPorTalhaoSelecionado.pontoLng === pasto2.centroLng,
    'selecionar talhão manualmente gera título padrão e usa centro do talhão no mapa quando sem GPS'
  );
  await concluirOcorrencia(ocorrenciaPorTalhaoSelecionado.id);

  // 7. Fase 2 — Fotos locais: múltiplos caminhos preservados na ordem correta
  await concluirOcorrencia(ocorrenciaComGps.id, {
    observacao: 'Cerca esticada.',
    fotos: ['file:///data/user/0/app/fotos/foto_3_conclusao.jpg'],
  });

  const fotosSalvas = await listarFotosDaTarefa(ocorrenciaComGps.id);
  check(
    fotosSalvas.length === 3 &&
      fotosSalvas[0] === 'file:///data/user/0/app/fotos/foto_1.jpg' &&
      fotosSalvas[1] === 'file:///data/user/0/app/fotos/foto_2.jpg' &&
      fotosSalvas[2] === 'file:///data/user/0/app/fotos/foto_3_conclusao.jpg',
    'salvar múltiplos caminhos de fotos preserva os registros na ordem exata e bloqueia base64'
  );

  // 8. Fase 2 — Marcadores no Mapa: exclui concluídas, canceladas e sem coordenadas
  const abertaMapaNormal = await criarOcorrencia({
    titulo: 'Bebedouro vazando',
    categoria: 'agua',
    urgente: false,
    pontoLat: -22.896,
    pontoLng: -47.096,
  });
  const emAndamentoMapaUrgente = await criarOcorrencia({
    titulo: 'Animal preso na cerca',
    categoria: 'animal',
    urgente: true,
    pontoLat: -22.894,
    pontoLng: -47.094,
  });
  await iniciarOcorrencia(emAndamentoMapaUrgente.id, eu);

  const paraCancelarNoMapa = await criarOcorrencia({
    titulo: 'Ocorrência cancelada no mapa',
    categoria: 'pasto',
    pontoLat: -22.893,
    pontoLng: -47.093,
  });
  await cancelarOcorrencia(paraCancelarNoMapa.id, 'Alarme falso', eu);

  await criarOcorrencia({
    titulo: 'Ocorrência sem GPS',
    categoria: 'maquina',
  });

  const noMapa = await listarOcorrenciasNoMapa();
  check(
    noMapa.length === 2 &&
      noMapa[0].id === emAndamentoMapaUrgente.id &&
      noMapa[1].id === abertaMapaNormal.id &&
      !noMapa.some((o) => o.id === ocorrenciaComGps.id || o.id === paraCancelarNoMapa.id),
    'listarOcorrenciasNoMapa exclui concluídas/canceladas/sem GPS e destaca urgentes primeiro'
  );

  // 9. Fase 3 — Teste de ciclo de máquina: QR Code, nota de voz e "Máquina parada"
  const trator = await cadastrarMaquina({
    nome: 'Trator Valtra A950',
    tipo: 'trator',
    codigo: 'TR-99',
  });
  check(trator.status === 'ativa', 'máquina recém-cadastrada inicia com status "ativa"');

  const qrMaquina = await resolverQrCodeParaOcorrencia('TR-99');
  check(
    qrMaquina !== null &&
      qrMaquina.tipo === 'maquina' &&
      qrMaquina.maquinaId === trator.id &&
      qrMaquina.categoria === 'maquina',
    'resolverQrCodeParaOcorrencia identifica QR Code de trator e retorna maquinaId'
  );

  const ocorrenciaMaquinaParada = await criarOcorrencia({
    categoria: 'maquina',
    maquinaId: trator.id,
    maquinaParada: true,
    audioUri: 'file:///data/user/0/app/audios/voz-15s-1.m4a',
    descricao: 'Mangueira hidráulica rompida.',
  });

  const tratorAposAbertura = await maquinaPorId(trator.id);
  check(
    ocorrenciaMaquinaParada.maquinaId === trator.id &&
      ocorrenciaMaquinaParada.maquinaParada === true &&
      ocorrenciaMaquinaParada.audioUri === 'file:///data/user/0/app/audios/voz-15s-1.m4a' &&
      ocorrenciaMaquinaParada.titulo === 'Máquina — Trator Valtra A950 (TR-99)' &&
      tratorAposAbertura?.status === 'manutencao',
    'abrir ocorrência com máquina parada atualiza status na tabela de máquinas para "manutencao" e salva nota de voz local'
  );

  await concluirOcorrencia(ocorrenciaMaquinaParada.id, {
    autor: eu,
    observacao: 'Mangueira substituída.',
  });
  const tratorAposConclusao = await maquinaPorId(trator.id);
  check(
    tratorAposConclusao?.status === 'ativa',
    'concluir ocorrência de máquina parada restaura status da máquina para "ativa"'
  );

  // RN-T11: Cancelar ocorrência de máquina parada mantém a máquina em manutenção até liberação explícita
  const outraOcorrenciaParada = await criarOcorrencia({
    categoria: 'maquina',
    maquinaId: trator.id,
    maquinaParada: true,
    descricao: 'Vazamento suspeito',
  });
  await cancelarOcorrencia(outraOcorrenciaParada.id, 'Engano, mangueira seca', eu);
  const tratorAposCancelamento = await maquinaPorId(trator.id);
  check(
    tratorAposCancelamento?.status === 'manutencao',
    'cancelar ocorrência de máquina parada mantém a máquina em manutenção (RN-T11)'
  );
  // Libera a máquina de volta para ativa no banco
  await db
    .update(maquinas)
    .set(atualizar({ status: 'ativa' }))
    .where(and(daFazenda(maquinas), eq(maquinas.id, trator.id)));

  // 10. Fase 3 — Teste de vínculo: QR Code de animal e integridade referencial
  const vaca = await cadastrarAnimal({
    brinco: '104',
    nome: 'Estrela',
    sexo: 'F',
  });

  const qrAnimal = await resolverQrCodeParaOcorrencia('104');
  check(
    qrAnimal !== null &&
      qrAnimal.tipo === 'animal' &&
      qrAnimal.animalId === vaca.id &&
      qrAnimal.categoria === 'animal',
    'resolverQrCodeParaOcorrencia identifica QR Code de animal e retorna animalId'
  );

  const erroAnimalInexistente = await rejeita(() =>
    criarOcorrencia({
      categoria: 'animal',
      animalId: 'animal-inexistente-999',
    })
  );
  check(
    erroAnimalInexistente !== null,
    'mantém integridade referencial bloqueando vínculo com animal_id inexistente'
  );

  const ocorrenciaAnimal = await criarOcorrencia({
    categoria: 'animal',
    animalId: vaca.id,
    urgente: true,
  });
  check(
    ocorrenciaAnimal.animalId === vaca.id &&
      ocorrenciaAnimal.titulo === 'Animal — Estrela (#104)',
    'ocorrência vinculada ao animal preenche animal_id e título padrão do brinco'
  );

  // Desvinculação do animal preserva a ocorrência e limpa animalId
  await db
    .update(tarefas)
    .set(atualizar({ animalId: null }))
    .where(and(daFazenda(tarefas), eq(tarefas.id, ocorrenciaAnimal.id)));
  const [ocorrenciaAposDelete] = await db
    .select()
    .from(tarefas)
    .where(and(daFazenda(tarefas), eq(tarefas.id, ocorrenciaAnimal.id)));
  check(
    ocorrenciaAposDelete !== undefined && ocorrenciaAposDelete.animalId === null,
    'preserva ocorrência e limpa animal_id ao desvincular animal'
  );

  // 11. Matriz de Permissões (Admin vs. Colaborador — Requisitos PDF pág. 2-3, 6, 8-9)
  const equipe = await listarColaboradores();
  const admin = equipe.find((u) => u.papel === 'owner')!;
  const colabJoao = equipe.find((u) => u.id === 'colaborador-joao')!;
  const colabMaria = equipe.find((u) => u.id === 'colaborador-maria')!;

  // RF-T11: Colaborador não cria tarefa manual; Admin cria
  const erroColabManual = await rejeita(() =>
    criarOcorrencia({
      titulo: 'Revisar cerca sul',
      categoria: 'cerca',
      origem: 'manual',
      autor: colabJoao,
    })
  );
  check(erroColabManual !== null, 'bloqueia colaborador de criar tarefa manual (RF-T11)');

  const tarefaManualAdmin = await criarOcorrencia({
    titulo: 'Revisar cerca sul',
    categoria: 'cerca',
    origem: 'manual',
    autor: admin,
  });
  check(tarefaManualAdmin.origem === 'manual', 'admin pode criar tarefa manual (RF-T11)');

  // RF-T14: Colaborador não pode atribuir tarefa a outra pessoa na criação nem depois
  const erroColabAtribuirCriacao = await rejeita(() =>
    criarOcorrencia({
      categoria: 'agua',
      responsavelId: colabMaria.id,
      autor: colabJoao,
    })
  );
  const erroColabAtribuirDepois = await rejeita(() =>
    atribuirOcorrencia(tarefaManualAdmin.id, colabMaria.id, colabJoao)
  );
  check(
    erroColabAtribuirCriacao !== null && erroColabAtribuirDepois !== null,
    'bloqueia colaborador de atribuir ou reatribuir tarefa a outra pessoa (RF-T14)'
  );

  // RN-T03 / RF-T16: Colaborador só inicia ou conclui tarefa que está com ele; Admin pode em qualquer uma
  const erroColabIniciarSemPegar = await rejeita(() =>
    iniciarOcorrencia(tarefaManualAdmin.id, colabJoao)
  );
  const erroColabConcluirSemPegar = await rejeita(() =>
    concluirOcorrencia(tarefaManualAdmin.id, { autor: colabJoao })
  );
  check(
    erroColabIniciarSemPegar !== null && erroColabConcluirSemPegar !== null,
    'bloqueia colaborador de iniciar ou concluir tarefa sem responsável antes de pegá-la (RN-T03)'
  );

  // RF-T18: Qualquer membro (colaborador ou admin) pode adicionar observação em tarefa aberta/em andamento
  await adicionarObservacaoOcorrencia(tarefaManualAdmin.id, {
    texto: 'Passei perto e vi dois mourões bambos.',
    autor: colabMaria,
  });
  const eventosComObs = await listarEventosDaTarefa(tarefaManualAdmin.id);
  check(
    eventosComObs.some((e) => e.tipo === 'observacao' && e.autorId === colabMaria.id),
    'qualquer colaborador pode adicionar observação em tarefa aberta (RF-T18)'
  );

  // RF-T19 / RN-T09: Colaborador edita/cancela apenas o que relatou enquanto aberta
  const relatoJoao = await criarOcorrencia({
    categoria: 'pasto',
    descricao: 'Formigueiro perto da porteira',
    autor: colabJoao,
  });

  const erroMariaEditarRelatoJoao = await rejeita(() =>
    editarOcorrencia(relatoJoao.id, { categoria: 'outro' }, colabMaria)
  );
  const erroMariaCancelarRelatoJoao = await rejeita(() =>
    cancelarOcorrencia(relatoJoao.id, 'Não precisa mais', colabMaria)
  );
  check(
    erroMariaEditarRelatoJoao !== null && erroMariaCancelarRelatoJoao !== null,
    'bloqueia colaborador de editar ou cancelar ocorrência relatada por outra pessoa (RF-T19)'
  );

  const editadaPorJoao = await editarOcorrencia(
    relatoJoao.id,
    { categoria: 'outro', urgente: true },
    colabJoao
  );
  check(
    editadaPorJoao.categoria === 'outro' && editadaPorJoao.urgente === true,
    'colaborador pode editar categoria e urgência da ocorrência que ele mesmo relatou enquanto aberta'
  );

  // Quando entra em andamento, colaborador não pode mais cancelar nem editar; Admin continua podendo
  await pegarTarefa(relatoJoao.id, colabJoao.id);
  await iniciarOcorrencia(relatoJoao.id, colabJoao);
  const erroJoaoCancelarEmAndamento = await rejeita(() =>
    cancelarOcorrencia(relatoJoao.id, 'Desisti', colabJoao)
  );
  check(
    erroJoaoCancelarEmAndamento !== null,
    'bloqueia colaborador de cancelar ocorrência depois que já entrou em andamento (RF-T19)'
  );

  const canceladaPeloAdmin = await cancelarOcorrencia(
    relatoJoao.id,
    'Admin cancelou durante andamento',
    admin
  );
  check(
    canceladaPeloAdmin.status === 'cancelada',
    'admin pode cancelar qualquer tarefa aberta ou em andamento (RF-T19)'
  );

  console.log('\n🎉 TODOS OS TESTES DE OCORRÊNCIAS PASSARAM COM 100% DE SUCESSO!\n');
}

runOcorrenciasTest()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error('❌ Falha nos testes de ocorrências:', erro);
    process.exit(1);
  });
