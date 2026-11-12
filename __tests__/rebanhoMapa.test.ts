import { and, eq, isNull } from 'drizzle-orm';

import {
  bloqueioExclusao,
  bloqueioTrocaDeTipo,
  consequenciasRedesenho,
  detalheDaArea,
  situacaoDaArea,
} from '@/features/mapa/services/areas';
import {
  detalheDoDestino,
  foraDoPastoDoLote,
  formatarLotacao,
  gruposPorLote,
  lotacaoDepois,
  mapaDeOcupacao,
  ordenarDestinos,
  periodosDeOcupacao,
  situacaoDoPasto,
  type OcupacaoArea,
} from '@/features/mapa/services/ocupacao';
import { registrarSaida } from '@/features/rebanho/data/animais';
import { linhaDoTempoDoLocal, resumoDoLocal, type PassagemDoAnimal } from '@/features/rebanho/services/local';
import {
  criarLote,
  definirLote,
  excluirLote,
  listarLotes,
  salvarAnimaisDoLote,
} from '@/services/loteService';
import {
  animaisComLocal,
  animaisNaArea,
  contarAnimaisNaArea,
  historicoDaArea,
  historicoDoAnimal,
  moverAnimais,
  moverLote,
  ocupacaoDasAreas,
} from '@/services/movimentacaoService';
import { atualizarTalhao, criarTalhao, deletarTalhao } from '@/services/talhaoService';
import type { Coordenada } from '@/utils/geoMath';
import { animais, db, initTestDatabase, lotes, movimentacoes, novoRegistro, fecharTestDatabase } from './support/database';

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

const em = (d: number, h = 8) => new Date(2026, 10, d, h);
const AGORA = em(10, 12);

/** ~100 m por lado perto do equador, deslocado para cada área não sobrepor. */
const quadrado = (x: number): Coordenada[] => {
  const L = 0.0008983;
  return [
    [-47 + x, 0],
    [-47 + x + L, 0],
    [-47 + x + L, L],
    [-47 + x, L],
  ];
};

function regrasPuras() {
  const ocupado: OcupacaoArea = { cabecas: 18, desde: em(2), ultimaSaida: em(1) };
  const vazio: OcupacaoArea = { cabecas: 0, desde: null, ultimaSaida: em(2) };

  const s1 = situacaoDoPasto(28.4, ocupado, AGORA);
  check(
    s1.estado === 'ocupado' && s1.cabecas === 18 && formatarLotacao(s1.lotacao) === '0,63 cab/ha' && s1.diasOcupado === 8,
    'pasto ocupado: 18 cabeças, 0,63 cab/ha e 8 dias ocupado (tela 14)'
  );
  const s2 = situacaoDoPasto(22.1, vazio, AGORA);
  check(s2.estado === 'descanso' && s2.diasDescanso === 8, 'pasto vazio: em descanso há 8 dias desde a última saída (RN-008)');
  check(situacaoDoPasto(10, undefined, AGORA).diasDescanso === null, 'pasto que nunca teve animais: descanso sem contagem');
  check(detalheDoDestino(22.1, vazio, AGORA) === 'Descanso · 8 dias · 22,1 ha', 'destino em descanso: "Descanso · 8 dias · 22,1 ha"');
  check(detalheDoDestino(18, { cabecas: 12, desde: em(1), ultimaSaida: null }, AGORA) === '12 cab. · 18 ha', 'destino ocupado: "12 cab. · 18 ha"');
  check(formatarLotacao(lotacaoDepois(22.1, vazio, 18)) === '0,81 cab/ha', 'lotação depois de mover 18 animais: 0,81 cab/ha (tela 17)');

  check(
    situacaoDaArea({ tipo: 'pasto', areaHectares: 28.4, cultura: null, faseLavoura: null, dataPlantio: null }, ocupado, AGORA)
      .legenda === null,
    'pasto ocupado: sem legenda (o selo verde mostra as cabeças)'
  );
  check(
    situacaoDaArea({ tipo: 'pasto', areaHectares: 22, cultura: null, faseLavoura: null, dataPlantio: null }, vazio, AGORA)
      .legenda === 'Descanso · 8 dias',
    'pasto vazio: legenda "Descanso · 8 dias" (tela 13)'
  );
  check(
    detalheDaArea({ tipo: 'pasto', areaHectares: 28.4, cultura: null, faseLavoura: null, dataPlantio: null }, ocupado, AGORA) ===
      'Pasto · 18 cabeças',
    'lista: "Pasto · 18 cabeças"'
  );

  const grupos = gruposPorLote([
    { loteId: 'n', loteNome: 'Novilhas' },
    { loteId: null, loteNome: null },
    { loteId: 'n', loteNome: 'Novilhas' },
    { loteId: 'v', loteNome: 'Vacas' },
  ]);
  check(
    grupos.map((g) => `${g.nome}:${g.quantidade}`).join() === 'Lote Novilhas:2,Lote Vacas:1,Sem lote:1',
    '"Animais aqui": o maior lote primeiro e "Sem lote" por último'
  );
  check(foraDoPastoDoLote([{ areaId: 'p1' }, { areaId: null }, { areaId: 'p3' }], 'p1') === 2, 'conta quem está fora do pasto do lote');
  check(foraDoPastoDoLote([{ areaId: null }], null) === 0, 'lote sem pasto: ninguém está "fora"');

  const pastos = [
    { id: 'ocupadoCheio', nome: 'A', areaHectares: 10 },
    { id: 'descanso2', nome: 'B', areaHectares: 10 },
    { id: 'nunca', nome: 'C', areaHectares: 10 },
    { id: 'descanso8', nome: 'D', areaHectares: 10 },
    { id: 'ocupadoPouco', nome: 'E', areaHectares: 10 },
  ];
  const ocupacoes = new Map<string, OcupacaoArea>([
    ['ocupadoCheio', { cabecas: 20, desde: em(1), ultimaSaida: null }],
    ['descanso2', { cabecas: 0, desde: null, ultimaSaida: em(8) }],
    ['descanso8', { cabecas: 0, desde: null, ultimaSaida: em(2) }],
    ['ocupadoPouco', { cabecas: 3, desde: em(1), ultimaSaida: null }],
  ]);
  check(
    ordenarDestinos(pastos, ocupacoes, AGORA).map((p) => p.id).join() === 'nunca,descanso8,descanso2,ocupadoPouco,ocupadoCheio',
    'destinos: descansado há mais tempo primeiro, depois o menos lotado'
  );

  const periodos = periodosDeOcupacao(
    [
      { animalId: 'a', nome: 'A', brinco: '1', loteId: 'n', loteNome: 'Novilhas', entradaEm: em(2), saidaEm: null },
      { animalId: 'b', nome: 'B', brinco: '2', loteId: 'n', loteNome: 'Novilhas', entradaEm: em(2), saidaEm: null },
      { animalId: 'c', nome: 'Estrela', brinco: '10388', loteId: null, loteNome: null, entradaEm: em(1), saidaEm: em(5) },
    ],
    AGORA
  );
  check(
    periodos.length === 2 &&
      periodos[0].titulo === 'Lote Novilhas · 2 animais' &&
      periodos[0].saida === null &&
      periodos[0].dias === 8 &&
      periodos[1].titulo === 'Estrela · 10388' &&
      periodos[1].dias === 4,
    'histórico de ocupação junta quem entrou junto (lote) e conta os dias'
  );

  check(consequenciasRedesenho(18)[0].texto === 'A lotação dos 18 animais muda', 'redesenhar pasto ocupado avisa a lotação (tela 16)');
  check(bloqueioExclusao(18) !== null && bloqueioExclusao(0) === null, 'RN-011: pasto com animais não é excluído');
  check(
    bloqueioTrocaDeTipo({ tipo: 'pasto' }, 'lavoura', 3) !== null && bloqueioTrocaDeTipo({ tipo: 'pasto' }, 'lavoura', 0) === null,
    'RN-011: pasto com animais não troca de tipo'
  );

  const historico: PassagemDoAnimal[] = [
    { areaId: 'p1', areaNome: 'Pasto 1', areaTipo: 'pasto', loteNome: 'Novilhas', entradaEm: em(2), saidaEm: null, registradoPor: 'João' },
    { areaId: 'p2', areaNome: 'Pasto 2', areaTipo: 'pasto', loteNome: null, entradaEm: new Date(2026, 9, 15), saidaEm: em(1), registradoPor: 'Arthur' },
  ];
  const linha = linhaDoTempoDoLocal(historico, AGORA);
  check(
    linha.map((i) => i.titulo).join() === 'Pasto 1,Sem local,Pasto 2,Sem local' &&
      linha[0].atual &&
      linha[0].dias === 8 &&
      linha[0].por === 'João' &&
      linha[3].de === null,
    '"Onde está": pastos do mais recente, o intervalo sem local entre eles e o "até" do começo (tela 20)'
  );
  const resumo = resumoDoLocal(historico[0], 'Novilhas', AGORA);
  check(resumo.titulo === 'Pasto 1' && resumo.detalhe === 'há 8 dias · Lote Novilhas', 'cartão: "Pasto 1 / há 8 dias · Lote Novilhas"');
  check(resumoDoLocal(null, null, AGORA).titulo === 'Sem local definido', 'sem local é o padrão (RN-002)');
}

async function banco() {
  await initTestDatabase();
  const p1 = await criarTalhao({ nome: 'Pasto 1', tipo: 'pasto', coordenadas: quadrado(0) });
  const p2 = await criarTalhao({ nome: 'Pasto 2', tipo: 'pasto', coordenadas: quadrado(0.002) });
  const p3 = await criarTalhao({ nome: 'Pasto 3', tipo: 'pasto', coordenadas: quadrado(0.004) });
  const lavoura = await criarTalhao({ nome: 'Talhão 3', tipo: 'lavoura', coordenadas: quadrado(0.006) });
  const novo = async (brinco: string, nome: string) =>
    (await db.insert(animais).values(novoRegistro({ brinco, nome })).returning())[0];
  const estrela = await novo('10388', 'Estrela');
  const teste = await novo('23232', 'Teste');
  const pintada = await novo('10391', 'Pintada');
  const bonita = await novo('10512', 'Bonita');

  // Colocar no pasto
  const r1 = await moverAnimais({ animalIds: [teste.id, pintada.id, bonita.id], destinoId: p1.id, quando: em(2) });
  check(r1.movidos === 3 && r1.ignorados === 0, 'colocar 3 animais no Pasto 1');
  const r2 = await moverAnimais({ animalIds: [teste.id], destinoId: p1.id, quando: em(3) });
  check(r2.movidos === 0 && r2.ignorados === 1, 'quem já está no pasto não ganha movimentação nova');

  let ocupacao = mapaDeOcupacao(await ocupacaoDasAreas());
  check(
    ocupacao.get(p1.id)?.cabecas === 3 && ocupacao.get(p1.id)?.desde?.getTime() === em(2).getTime(),
    'ocupação: 3 cabeças no Pasto 1 desde 02/11'
  );
  check((await contarAnimaisNaArea(p1.id)) === 3, 'contarAnimaisNaArea pelo índice');

  // Mover um animal: fecha a anterior e abre a nova (RN-006)
  await moverAnimais({ animalIds: [bonita.id], destinoId: p2.id, quando: em(5) });
  const deBonita = await db.select().from(movimentacoes).where(eq(movimentacoes.animalId, bonita.id));
  const fechada = deBonita.find((m) => m.areaId === p1.id);
  const aberta = deBonita.find((m) => m.areaId === p2.id);
  check(
    deBonita.length === 2 && fechada?.saidaEm?.getTime() === em(5).getTime() && aberta?.saidaEm === null,
    'mover fecha a movimentação anterior (saída) e abre a nova (RN-006, RN-007)'
  );
  ocupacao = mapaDeOcupacao(await ocupacaoDasAreas());
  check(
    ocupacao.get(p1.id)?.cabecas === 2 &&
      ocupacao.get(p2.id)?.cabecas === 1 &&
      ocupacao.get(p1.id)?.ultimaSaida?.getTime() === em(5).getTime(),
    'ocupação atualiza e guarda a última saída do pasto'
  );

  // Regras do destino
  check(
    (await rejeita(() => moverAnimais({ animalIds: [estrela.id], destinoId: lavoura.id })))?.includes('Pasto') ?? false,
    'só área do tipo Pasto recebe animais (RN-003)'
  );
  // RN-001 sem índice único (banco do sync): mover de novo fecha a linha aberta antes de abrir outra
  await moverAnimais({ animalIds: [teste.id], destinoId: p3.id, quando: em(5) });
  await moverAnimais({ animalIds: [teste.id], destinoId: p2.id, quando: em(5) });
  const abertasDoTeste = (await db.select().from(movimentacoes)).filter(
    (m) => m.animalId === teste.id && m.saidaEm === null
  );
  check(abertasDoTeste.length === 1, 'um local atual por animal: mover fecha o anterior (RN-001)');

  // Tirar do pasto: sem local é válido (RN-002)
  await moverAnimais({ animalIds: [pintada.id], destinoId: null, quando: em(6) });
  const local = await animaisComLocal();
  const pintadaAgora = local.find((a) => a.id === pintada.id);
  check(pintadaAgora?.areaId === null && pintadaAgora.areaNome === null, 'tirar do pasto deixa o animal sem local definido');
  const histPintada = await historicoDoAnimal(pintada.id);
  check(
    histPintada.length === 1 && histPintada[0].areaNome === 'Pasto 1' && histPintada[0].saidaEm?.getTime() === em(6).getTime(),
    'histórico do animal guarda a passagem pelo pasto'
  );

  // Lotes
  check((await rejeita(() => criarLote({ nome: '  ' }))) !== null, 'lote sem nome é recusado');
  const novilhas = await criarLote({ nome: 'Novilhas', descricao: ' para a estação de monta ' });
  check(novilhas.descricao === 'para a estação de monta', 'lote grava a descrição sem espaços nas pontas');
  check((await rejeita(() => criarLote({ nome: 'novilhas' }))) !== null, 'nome de lote repetido é recusado (sem diferenciar maiúscula)');
  await definirLote([estrela.id, teste.id, bonita.id], novilhas.id);

  const rLote = await moverLote(novilhas.id, p3.id, { quando: em(7) });
  check(rLote.movidos === 3, 'mover lote leva todos os animais do lote (RF-019)');
  const doLote = await db
    .select()
    .from(movimentacoes)
    .where(and(eq(movimentacoes.areaId, p3.id), isNull(movimentacoes.saidaEm)));
  check(doLote.length === 3 && doLote.every((m) => m.loteId === novilhas.id), 'uma movimentação por animal, com o lote (RN-005, RF-020)');
  let [loteSalvo] = await db.select().from(lotes).where(eq(lotes.id, novilhas.id));
  check(loteSalvo.areaId === p3.id && loteSalvo.areaDesde?.getTime() === em(7).getTime(), 'o lote passa a ficar no Pasto 3 desde 07/11');

  // Animal movido sozinho continua no lote, mas fora do pasto dele (RF-021)
  await moverAnimais({ animalIds: [estrela.id], destinoId: p1.id, quando: em(8) });
  const membros = await animaisComLocal({ loteId: novilhas.id });
  check(
    membros.length === 3 && foraDoPastoDoLote(membros, p3.id) === 1 && membros.some((m) => m.id === estrela.id && m.loteNome === 'Novilhas'),
    'animal movido sozinho continua no lote e aparece fora do pasto do lote'
  );

  // Mover o lote para onde todos já estão: nada muda nos animais, mas o pasto do lote atualiza
  await moverLote(novilhas.id, p3.id, { quando: em(9) });
  await moverAnimais({ animalIds: [estrela.id], destinoId: p3.id, quando: em(9) });
  const antes = (await db.select().from(movimentacoes)).length;
  await moverLote(novilhas.id, p3.id, { quando: em(10) });
  [loteSalvo] = await db.select().from(lotes).where(eq(lotes.id, novilhas.id));
  check(
    (await db.select().from(movimentacoes)).length === antes && loteSalvo.areaDesde?.getTime() === em(10).getTime(),
    'mover o lote para onde ele já está não duplica movimentações'
  );

  const [resumoLote] = await listarLotes();
  check(
    resumoLote.nome === 'Novilhas' && resumoLote.animais === 3 && resumoLote.areaNome === 'Pasto 3',
    'listarLotes: quantos animais e o pasto do lote'
  );

  const naArea = await animaisNaArea(p3.id);
  check(naArea.length === 3 && naArea.every((a) => a.loteNome === 'Novilhas'), 'animaisNaArea traz o lote de cada um');
  const histArea = await historicoDaArea(p1.id);
  check(histArea.length >= 4 && histArea[0].entradaEm >= histArea[histArea.length - 1].entradaEm, 'historicoDaArea do mais recente');

  // Membros do lote pela tela do lote
  await salvarAnimaisDoLote(novilhas.id, [estrela.id, pintada.id]);
  const agoraNoLote = (await db.select().from(animais).where(eq(animais.loteId, novilhas.id))).map((a) => a.nome).sort();
  check(agoraNoLote.join() === 'Estrela,Pintada', 'salvar animais do lote: marcados entram, desmarcados saem');

  // Saída do rebanho fecha o local (venda antes da entrada não deixa saída antes da entrada)
  await registrarSaida(estrela.id, { status: 'vendido', data: em(9, 6), valorVenda: 3000 });
  const [estrelaNoPasto] = await db
    .select()
    .from(movimentacoes)
    .where(and(eq(movimentacoes.animalId, estrela.id), isNull(movimentacoes.saidaEm)));
  check(estrelaNoPasto === undefined, 'animal vendido sai do pasto');
  const r3 = await moverAnimais({ animalIds: [estrela.id], destinoId: p1.id });
  check(r3.movidos === 0, 'animal fora do rebanho não é movido');

  // RN-011 no banco
  check(
    (await rejeita(() => deletarTalhao(p3.id)))?.includes('Mova') ?? false,
    'excluir pasto com animais é recusado (RN-011)'
  );
  check(
    (await rejeita(() => atualizarTalhao(p3.id, { tipo: 'lavoura' })))?.includes('Mova') ?? false,
    'trocar o tipo de pasto com animais é recusado (RN-011)'
  );
  await moverAnimais({ animalIds: naArea.map((a) => a.id), destinoId: p2.id });
  check((await rejeita(() => atualizarTalhao(p3.id, { tipo: 'lavoura' }))) === null, 'pasto vazio troca de tipo');

  // Excluir lote: animais ficam sem lote, o histórico continua
  const totalMovs = (await db.select().from(movimentacoes)).length;
  await excluirLote(novilhas.id);
  check(
    (await db.select().from(animais).where(eq(animais.loteId, novilhas.id))).length === 0 &&
      (await db.select().from(movimentacoes)).length === totalMovs,
    'excluir lote deixa os animais sem lote e mantém as movimentações'
  );
}

async function runRebanhoMapaTest() {
  console.log('🐄 MINHA FAZENDA - REBANHO NO MAPA (FASE 2)\n');
  regrasPuras();
  await banco();
  console.log('\n🎉 REBANHO NO MAPA OK!');
}

runRebanhoMapaTest().then(fecharTestDatabase).catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
