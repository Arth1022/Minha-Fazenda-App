import { eq } from 'drizzle-orm';

import { atualizar, db, usosMaquina } from '@/database';
import {
  arquivarAvisoFazenda,
  carregarResumoHome,
  listarEventosDoDiaHome,
  listarItensAtencaoHome,
  obterAvisoAtivoHome,
  obterNumerosDoDiaHome,
  publicarAvisoFazenda,
} from '@/features/home/dadosHome';
import { cadastrarMaquina } from '@/features/maquinas/data/maquinas';
import { iniciarUso } from '@/features/maquinas/data/usos';
import { cadastrarAnimal } from '@/features/rebanho/data/animais';
import { confirmarDia } from '@/features/rebanho/data/doses';
import { createTratamento } from '@/features/rebanho/data/tratamentos';
import { criarLote } from '@/services/loteService';
import { moverLote } from '@/services/movimentacaoService';
import { criarOcorrencia, pegarTarefa } from '@/services/ocorrenciaService';
import { criarTalhao } from '@/services/talhaoService';
import { adicionarDias, inicioDoDia } from '@/utils/date';
import type { Coordenada } from '@/utils/geoMath';
import { initTestDatabase, USUARIO_TESTE } from './support/database';

function check(condicao: boolean, mensagem: string) {
  if (!condicao) throw new Error(mensagem);
  console.log(`✅ ${mensagem}`);
}

const COORDENADAS_PASTO: Coordenada[] = [
  [-47.0, -22.0],
  [-47.0, -22.002],
  [-47.002, -22.002],
  [-47.002, -22.0],
  [-47.0, -22.0],
];

async function runHomeTests() {
  console.log('=========================================================');
  console.log('🏠 MINHA FAZENDA - TESTES DO PAINEL INICIAL (HOME)');
  console.log('=========================================================\n');

  await initTestDatabase();

  const hoje = new Date();
  const ontem = adicionarDias(hoje, -1);

  // 1. Avisos da fazenda (nova tabela avisos_fazenda)
  check((await obterAvisoAtivoHome()) === null, 'inicia sem aviso ativo na fazenda');

  const primeiroAviso = await publicarAvisoFazenda(
    'Reunião da equipe hoje às 17h',
    { id: USUARIO_TESTE.id, nome: 'Arthur', papel: 'owner' },
    ontem
  );
  check(primeiroAviso.ativo === true, 'publicarAvisoFazenda grava aviso ativo');

  const segundoAviso = await publicarAvisoFazenda(
    'Vacinação contra aftosa na sexta, 7h, no curral',
    { id: USUARIO_TESTE.id, nome: 'Arthur', papel: 'owner' },
    ontem
  );
  const ativoAtual = await obterAvisoAtivoHome();
  check(
    ativoAtual?.id === segundoAviso.id &&
      ativoAtual.mensagem === 'Vacinação contra aftosa na sexta, 7h, no curral',
    'novo aviso substitui o anterior como único ativo na Home'
  );

  // 2. Tarefas + Doses de tratamento agregadas em "Precisa de atenção" / "Minhas tarefas"
  const loteNovilhas = await criarLote({ nome: 'Novilhas' });
  const a1 = await cadastrarAnimal({
    brinco: '101',
    nome: 'Mimosa',
    sexo: 'F',
    loteId: loteNovilhas.id,
  });
  const a2 = await cadastrarAnimal({
    brinco: '102',
    nome: 'Estrela',
    sexo: 'F',
    loteId: loteNovilhas.id,
  });

  // Tratamento iniciado hoje até amanhã (2 doses), com a 1ª dose já aplicada hoje -> resta a 2ª dose amanhã
  const amanha = adicionarDias(inicioDoDia(hoje), 1);
  const t1 = await createTratamento({
    animalId: a1.id,
    medicamento: 'vermífugo',
    dataInicio: inicioDoDia(hoje),
    dataFim: amanha,
    grupoAplicacaoId: 'grupo-vermifugo-1',
  });
  const t2 = await createTratamento({
    animalId: a2.id,
    medicamento: 'vermífugo',
    dataInicio: inicioDoDia(hoje),
    dataFim: amanha,
    grupoAplicacaoId: 'grupo-vermifugo-1',
  });
  await confirmarDia(t1.id, hoje);
  await confirmarDia(t2.id, hoje);

  const trator = await cadastrarMaquina({ nome: 'Trator 1', tipo: 'trator' });
  const pulverizador = await cadastrarMaquina({ nome: 'Pulverizador', tipo: 'pulverizador' });

  await criarOcorrencia({
    titulo: 'Cerca — Pasto 2',
    categoria: 'cerca',
    urgente: true,
    autor: { id: 'colab-joao', nome: 'João', papel: 'collaborator' },
    agora: hoje,
  });

  const tarefaBebedouro = await criarOcorrencia({
    titulo: 'Bebedouro vazando',
    categoria: 'agua',
    autor: { id: USUARIO_TESTE.id, nome: 'Arthur', papel: 'owner' },
    agora: hoje,
  });
  await pegarTarefa(tarefaBebedouro.id, 'colab-joao', hoje);

  await criarOcorrencia({
    titulo: 'Trator 1 parado',
    categoria: 'maquina',
    descricao: 'Pneu furado',
    maquinaId: trator.id,
    maquinaParada: true,
    urgente: false,
    responsavelId: 'colab-carlos',
    autor: { id: 'colab-carlos', nome: 'Carlos', papel: 'collaborator' },
    agora: hoje,
  });

  const itensAdmin = await listarItensAtencaoHome(
    { id: USUARIO_TESTE.id, nome: 'Arthur', papel: 'owner' },
    hoje
  );
  check(
    itensAdmin.length === 4,
    `admin vê 3 tarefas abertas + 1 dose agrupada de lote (total=${itensAdmin.length})`
  );
  check(
    itensAdmin[0].titulo === 'Cerca — Pasto 2' &&
      itensAdmin[0].urgente &&
      itensAdmin[0].subtitulo === 'ninguém pegou ainda',
    'item urgente sem responsável vem no topo de Precisa de atenção'
  );
  const itemDose = itensAdmin.find((i) => i.tipo === 'dose');
  check(
    itemDose?.titulo === '2ª dose de vermífugo' &&
      itemDose.subtitulo === 'Lote Novilhas · amanhã' &&
      itemDose.destinoHref === `/lote/${loteNovilhas.id}`,
    `dose de lote é agregada corretamente (${itemDose?.titulo} — ${itemDose?.subtitulo})`
  );

  const itensJoao = await listarItensAtencaoHome(
    { id: 'colab-joao', nome: 'João', papel: 'collaborator' },
    hoje
  );
  check(
    itensJoao.some((i) => i.titulo === 'Bebedouro vazando') &&
      !itensJoao.some((i) => i.titulo === 'Cerca — Pasto 2'),
    'colaborador vê apenas suas tarefas atribuídas + doses pendentes em Minhas tarefas'
  );

  // 3. Números do dia (cabeças, tarefas abertas, máquinas em uso)
  const usoPulverizador = await iniciarUso(
    pulverizador.id,
    { operador: { id: 'colab-joao', nome: 'João' } },
    new Date(hoje.getTime() - 30 * 60_000)
  );
  const numeros = await obterNumerosDoDiaHome();
  check(
    numeros.cabecas === 2 &&
      numeros.tarefasAbertas === 3 &&
      numeros.maquinasEmUso === 1 &&
      numeros.totalMaquinas === 2,
    `números do dia corretos: ${numeros.cabecas} cabeças, ${numeros.tarefasAbertas} tarefas, ${numeros.maquinasEmUso} de ${numeros.totalMaquinas} máquinas`
  );

  // 4. Feed "Na fazenda" limitado aos eventos do dia (tarefas, máquinas e movimentações)
  await db
    .update(usosMaquina)
    .set(atualizar({ fim: hoje, kmTotal: 8.4 }))
    .where(eq(usosMaquina.id, usoPulverizador.id));

  const pasto1 = await criarTalhao({
    nome: 'Pasto 1',
    tipo: 'pasto',
    coordenadas: COORDENADAS_PASTO,
  });
  await moverLote(loteNovilhas.id, pasto1.id, {
    quando: hoje,
    usuario: { id: USUARIO_TESTE.id, nome: 'Arthur' },
  });

  // Evento de ontem NÃO deve aparecer no feed do dia
  await criarOcorrencia({
    titulo: 'Ocorrência antiga de ontem',
    categoria: 'outro',
    autor: { id: USUARIO_TESTE.id, nome: 'Arthur', papel: 'owner' },
    agora: ontem,
  });

  const eventosHoje = await listarEventosDoDiaHome(hoje);
  check(
    eventosHoje.some((e) => e.tipo === 'tarefa' && e.acao.includes('relatou Cerca — Pasto 2')),
    'feed do dia inclui relato de ocorrência'
  );
  check(
    eventosHoje.some((e) => e.tipo === 'tarefa' && e.acao.includes('pegou Bebedouro vazando')),
    'feed do dia inclui tarefa assumida'
  );
  check(
    eventosHoje.some(
      (e) => e.tipo === 'maquina' && e.ator === 'Pulverizador' && e.acao === 'rodou 8,4 km'
    ),
    'feed do dia inclui distância rodada pela máquina (rodou 8,4 km)'
  );
  check(
    eventosHoje.some(
      (e) => e.tipo === 'movimentacao' && e.acao === 'moveu Lote Novilhas para Pasto 1'
    ),
    'feed do dia agrupa movimentação do lote em uma única linha'
  );
  check(
    !eventosHoje.some((e) => e.acao.includes('Ocorrência antiga de ontem')),
    'feed do dia ignora eventos de dias anteriores'
  );

  // Arquivar aviso
  await arquivarAvisoFazenda(segundoAviso.id);
  const resumoFinal = await carregarResumoHome(
    { id: USUARIO_TESTE.id, nome: 'Arthur', papel: 'owner' },
    hoje
  );
  check(resumoFinal.aviso === null, 'arquivarAvisoFazenda remove o aviso ativo da Home');

  console.log('\n🎉 TODOS OS TESTES DA HOME PASSARAM COM SUCESSO!');
}

runHomeTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Falha nos testes da Home:', err);
    process.exit(1);
  });
