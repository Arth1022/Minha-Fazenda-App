import { and, eq } from 'drizzle-orm';

import { avisosTrocaDeTipo, consequenciasRedesenho, situacaoDaArea } from '@/features/mapa/services/areas';
import { calcularSementes } from '@/features/mapa/services/calculos';
import {
  dataDaEtapa,
  estadoDaEtapa,
  etapasDoInicio,
  etapasDoRascunho,
  linhaDoTempoPrevista,
  MODELOS_PRONTOS,
  problemaDoModelo,
  progressoDoCiclo,
  textoCicloEncerrado,
  textoDiaDoCiclo,
  textoPrazo,
  textoSementes,
  type RascunhoModelo,
} from '@/features/mapa/services/plantio';
import {
  cancelarCiclo,
  cicloAtivoComEtapas,
  ciclosAnterioresDaArea,
  criarModeloCultura,
  etapasDoCiclo,
  iniciarCiclo,
  marcarEtapaFeita,
  modelosDoAdmin,
  mudarPrevisaoDaEtapa,
  salvarObservacaoDaEtapa,
} from '@/services/cicloService';
import { lembretesDoCiclo } from '@/services/notificacoes';
import { atualizarTalhao, criarTalhao, deletarTalhao } from '@/services/talhaoService';
import type { Coordenada } from '@/utils/geoMath';
import {
  ciclosPlantio,
  db,
  etapasCiclo,
  initTestDatabase,
  notificacoesAgendadas,
  talhoes,
  type EtapaCiclo,
} from './support/database';

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

/** Dia (meia-noite local) */
const d = (dia: number, mes: number, ano = 2026) => new Date(ano, mes - 1, dia);
const mesmoDia = (a: Date | null | undefined, b: Date) => a?.getTime() === b.getTime();
const HOJE = new Date(2026, 10, 10, 12);
const MILHO = MODELOS_PRONTOS[0];

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

/** Etapa como vem do banco (para as regras puras). */
const etapa = (
  ordem: number,
  nome: string,
  tipo: EtapaCiclo['tipo'],
  previstaEm: Date,
  realizadaEm: Date | null = null
): EtapaCiclo => ({
  id: `e${ordem}`,
  cicloId: 'c1',
  ordem,
  nome,
  tipo,
  previstaEm,
  realizadaEm,
  observacao: null,
  createdAt: HOJE,
  updatedAt: HOJE,
});

function regrasPuras() {
  // Tela 22: Talhão 4, 12,6 ha, milho silagem a 20 kg/ha, plantio em 25/11
  check(MILHO.nome === 'Milho silagem' && MILHO.taxaKgHa === 20, 'modelo pronto: milho silagem a 20 kg/ha');
  const linha = linhaDoTempoPrevista(MILHO.etapas, d(25, 11));
  check(
    linha.map((e) => `${e.nome} ${dataDaEtapa(e.previstaEm, HOJE)}`).join(' | ') ===
      'Preparo do solo 15/11 | Plantio 25/11 | Adubação de cobertura 20/12 | Pulverização 30/12 | Colheita 15/03/2027',
    'tela 22: linha do tempo do modelo a partir do plantio (ano só quando muda)'
  );
  const sementes = calcularSementes(12.6, 20, MILHO.sacoKg);
  check(textoSementes(sementes) === '252 kg · 13 sacos', 'tela 22: sementes "252 kg · 13 sacos"');
  check(textoSementes(calcularSementes(12.6, 0, 20)) === '—', 'sem taxa, sem conta de sementes');

  const futuro = etapasDoInicio(linha, d(25, 11), HOJE);
  check(futuro.every((e) => e.realizadaEm === null), 'plantio no futuro: nenhuma etapa começa feita');
  const passado = etapasDoInicio(linhaDoTempoPrevista(MILHO.etapas, d(20, 10)), d(20, 10), HOJE);
  check(
    passado.map((e) => (e.realizadaEm ? 'feita' : 'pendente')).join() === 'feita,feita,pendente,pendente,pendente',
    'lavoura já plantada: preparo e plantio entram feitos, os tratos ficam para marcar'
  );

  // Tela 23 / tela 15: plantio em 20/10, hoje 10/11
  const etapas = [
    etapa(0, 'Preparo do solo', 'preparo', d(10, 10), d(12, 10)),
    etapa(1, 'Plantio', 'plantio', d(20, 10), d(20, 10)),
    etapa(2, 'Adubação de cobertura', 'trato', d(14, 11)),
    etapa(3, 'Pulverização', 'trato', d(24, 11)),
    etapa(4, 'Colheita', 'colheita', d(7, 2, 2027)),
  ];
  const ciclo = { dataPlantio: d(20, 10) };
  const progresso = progressoDoCiclo(ciclo, etapas, HOJE);
  check(textoDiaDoCiclo(progresso, ciclo, HOJE) === 'dia 21 de 110', 'tela 15: "dia 21 de 110"');
  check(
    progresso.proxima?.etapa.nome === 'Adubação de cobertura' && textoPrazo(progresso.proxima.dias) === 'em 4 dias',
    'tela 15: "Próxima: Adubação de cobertura — em 4 dias"'
  );
  check(Math.abs(progresso.fracao - 21 / 110) < 1e-9, 'barra do ciclo em 21/110');
  check(
    estadoDaEtapa(etapas[1], 'e2', HOJE) === 'feita' &&
      estadoDaEtapa(etapas[2], 'e2', HOJE) === 'proxima' &&
      estadoDaEtapa(etapas[3], 'e2', HOJE) === 'pendente' &&
      estadoDaEtapa(etapa(9, 'X', 'trato', d(5, 11)), 'e2', HOJE) === 'atrasada',
    'tela 23: feita (check), próxima (anel verde), pendente e atrasada'
  );

  const naoPlantado = [
    etapa(0, 'Preparo do solo', 'preparo', d(15, 11)),
    etapa(1, 'Plantio', 'plantio', d(25, 11)),
    etapa(2, 'Colheita', 'colheita', d(15, 3, 2027)),
  ];
  const antes = progressoDoCiclo({ dataPlantio: d(25, 11) }, naoPlantado, HOJE);
  check(
    !antes.plantado &&
      antes.fracao === 0 &&
      textoDiaDoCiclo(antes, { dataPlantio: d(25, 11) }, HOJE) === 'plantio em 15 dias' &&
      antes.proxima?.etapa.nome === 'Preparo do solo',
    'antes do plantio: "plantio em 15 dias", barra vazia e o preparo como próxima'
  );
  check(
    [0, 1, 4, -1, -3].map(textoPrazo).join(' | ') ===
      'hoje | amanhã | em 4 dias | atrasada há 1 dia | atrasada há 3 dias',
    'prazos: hoje, amanhã, em N dias, atrasada'
  );
  check(
    textoCicloEncerrado({ status: 'encerrado', encerradoEm: d(7, 2, 2027) }) === 'colhido em 07/02/2027' &&
      textoCicloEncerrado({ status: 'cancelado', encerradoEm: null }) === 'cancelado',
    'ciclo anterior: colhido em ... / cancelado'
  );

  // Nova cultura do admin (RF-042)
  const rascunho: RascunhoModelo = {
    nome: 'Soja',
    diasPreparo: 10,
    tratos: [
      { nome: 'Pulverização', dias: 40 },
      { nome: 'Adubação', dias: 20 },
    ],
    diasColheita: 120,
  };
  check(
    etapasDoRascunho(rascunho).map((e) => `${e.nome}:${e.dias}`).join() ===
      'Preparo do solo:-10,Plantio:0,Adubação:20,Pulverização:40,Colheita:120',
    'nova cultura: preparo antes, tratos em ordem de data, colheita no fim'
  );
  const nomes = MODELOS_PRONTOS.map((m) => m.nome);
  check(problemaDoModelo(rascunho, nomes) === null, 'nova cultura válida');
  check(problemaDoModelo({ ...rascunho, nome: ' ' }, nomes) === 'Dê um nome à cultura.', 'nova cultura sem nome');
  check(
    problemaDoModelo({ ...rascunho, nome: 'milho SILAGEM' }, nomes) === 'Já existe uma cultura com esse nome.',
    'nome repetido (sem ligar para maiúscula) não passa'
  );
  check(problemaDoModelo({ ...rascunho, diasColheita: 0 }, nomes) !== null, 'colheita precisa vir depois do plantio');
  check(
    problemaDoModelo({ ...rascunho, tratos: [{ nome: 'Pulverização', dias: 130 }] }, nomes) ===
      'Cada etapa fica entre o plantio e a colheita.',
    'etapa depois da colheita não passa'
  );

  // Avisos das etapas (RF-043): véspera e atraso, às 7h
  const avisos = lembretesDoCiclo(
    { cicloId: 'c1', areaId: 'a1', nomeArea: 'Talhão 3', cultura: 'Milho silagem', etapas },
    HOJE
  );
  check(
    avisos.length === 6 && avisos.every((a) => a.canal === 'lavoura' && a.url === '/mapa-fazenda?talhao=a1&vista=ciclo'),
    'avisos: véspera e atraso das 3 etapas pendentes; tocar abre a linha do tempo'
  );
  const vespera = avisos[0];
  check(
    vespera.titulo === 'Amanhã: Adubação de cobertura' &&
      vespera.quando.tipo === 'data' &&
      vespera.quando.data.getTime() === new Date(2026, 10, 13, 7).getTime(),
    'véspera: "Amanhã: Adubação de cobertura" em 13/11 às 7h'
  );
  check(
    avisos[1].titulo === 'Atrasada: Adubação de cobertura' && avisos[1].mensagem === 'Talhão 3 · Milho silagem · prevista para 14/11',
    'atraso: "Atrasada: ..." no dia seguinte, com a data prevista'
  );
  const deHoje = lembretesDoCiclo(
    { cicloId: 'c1', areaId: 'a1', nomeArea: 'Talhão 3', cultura: 'Milho', etapas: [etapa(0, 'Pulverização', 'trato', d(10, 11))] },
    HOJE
  );
  check(deHoje.length === 1 && deHoje[0].titulo.startsWith('Atrasada'), 'etapa de hoje: a véspera já passou, fica o aviso de atraso');

  check(
    consequenciasRedesenho(0, false, true).some((item) => item.icone === 'sprout'),
    '"Redesenhar X?" avisa que a conta das sementes do ciclo fica desatualizada'
  );
  check(
    avisosTrocaDeTipo({ tipo: 'lavoura', cultura: 'Milho silagem', faseLavoura: 'vegetativo', dataPlantio: d(20, 10) }, 'pasto')[0] ===
      'O plantio atual (Milho silagem · Plantada) será encerrado.',
    'trocar lavoura plantada de tipo avisa que o plantio será encerrado'
  );
}

/** Começa um ciclo de milho silagem na área, como a tela "Plantar" faz. */
function plantarMilho(areaId: string, plantio: Date, hoje = HOJE, areaHa = 12.6) {
  const sementes = calcularSementes(areaHa, 20, 20);
  return iniciarCiclo({
    areaId,
    cultura: MILHO.nome,
    modeloId: MILHO.id,
    dataPlantio: plantio,
    areaHa,
    taxaKgHa: 20,
    sacoKg: 20,
    sementesKg: sementes.totalKg,
    sacos: sementes.sacos,
    etapas: etapasDoInicio(linhaDoTempoPrevista(MILHO.etapas, plantio), plantio, hoje),
  });
}

async function areaDoBanco(id: string) {
  const [area] = await db.select().from(talhoes).where(eq(talhoes.id, id));
  return area;
}

async function banco() {
  await initTestDatabase();
  const lavoura = await criarTalhao({ nome: 'Talhão 3', tipo: 'lavoura', coordenadas: quadrado(0) });
  const pasto = await criarTalhao({ nome: 'Pasto 1', tipo: 'pasto', coordenadas: quadrado(0.002) });
  const outra = await criarTalhao({ nome: 'Talhão 4', tipo: 'lavoura', coordenadas: quadrado(0.004) });

  check((await rejeita(() => plantarMilho(pasto.id, d(20, 10)))) === 'Só lavoura recebe plantio.', 'pasto não recebe plantio (RN-004)');

  // Lavoura já plantada em 20/10 (tela 23)
  const cicloId = await plantarMilho(lavoura.id, d(20, 10));
  let ativo = await cicloAtivoComEtapas(lavoura.id);
  check(
    ativo?.ciclo.id === cicloId && ativo.ciclo.sementesKg === 252 && ativo.ciclo.sacos === 13 && ativo.etapas.length === 5,
    'plantar grava o ciclo com a conta das sementes (RF-036) e as 5 etapas'
  );
  check(
    ativo?.etapas.map((e) => e.ordem).join() === '0,1,2,3,4' && ativo.etapas[1].tipo === 'plantio' && ativo.etapas[1].realizadaEm !== null,
    'etapas em ordem de data; plantio já feito'
  );
  let area = await areaDoBanco(lavoura.id);
  check(
    area.cultura === 'Milho silagem' && area.faseLavoura === 'vegetativo' && mesmoDia(area.dataPlantio, d(20, 10)),
    'o resumo do ciclo vai para a área na mesma transação (rótulo sem JOIN)'
  );
  check(situacaoDaArea(area).legenda === 'Milho silagem' && situacaoDaArea(area).estado === 'plantada', 'mapa: "Talhão 3 · Milho silagem", selo Plantada');

  check(
    (await rejeita(() => plantarMilho(lavoura.id, d(1, 11))))?.startsWith('Esta lavoura já tem um ciclo ativo') === true,
    'um ciclo ativo por área (RN-009)'
  );
  const segundoAtivo = await rejeita(async () => {
    await db.insert(ciclosPlantio).values({
      areaId: lavoura.id,
      cultura: 'Soja',
      dataPlantio: d(1, 11),
      areaHa: 1,
      taxaKgHa: 1,
      sacoKg: 1,
      sementesKg: 1,
      sacos: 1,
    });
  });
  check(segundoAtivo !== null, 'o índice parcial único barra um segundo ciclo ativo direto no banco');

  // Etapas: marcar feita (só acréscimo), mudar a data, observação
  const [, , adubacao, pulverizacao, colheita] = ativo!.etapas;
  await marcarEtapaFeita(adubacao.id, d(15, 11));
  await marcarEtapaFeita(adubacao.id, d(20, 11));
  let etapas = await etapasDoCiclo(cicloId);
  check(mesmoDia(etapas[2].realizadaEm, d(15, 11)), 'marcar feita grava a data; marcar de novo não muda (RN-007)');
  await mudarPrevisaoDaEtapa(pulverizacao.id, d(26, 11));
  etapas = await etapasDoCiclo(cicloId);
  check(mesmoDia(etapas[3].previstaEm, d(26, 11)), 'dá para mudar a data prevista de uma etapa pendente (RF-039)');
  check(
    (await rejeita(() => mudarPrevisaoDaEtapa(adubacao.id, d(30, 11)))) === 'Etapa feita não muda de data.',
    'etapa feita não muda de data'
  );
  check(
    (await rejeita(() => mudarPrevisaoDaEtapa(colheita.id, d(1, 10)))) === 'A colheita vem depois do plantio.',
    'colheita não vai para antes do plantio'
  );
  await salvarObservacaoDaEtapa(adubacao.id, '  Ureia 200 kg/ha ');
  etapas = await etapasDoCiclo(cicloId);
  check(etapas[2].observacao === 'Ureia 200 kg/ha', 'observação da etapa');
  await salvarObservacaoDaEtapa(adubacao.id, '   ');
  check((await etapasDoCiclo(cicloId))[2].observacao === null, 'observação vazia apaga');

  // Redesenhar marca a conta das sementes como desatualizada (RN-010)
  await atualizarTalhao(lavoura.id, { coordenadas: quadrado(0.0001) });
  ativo = await cicloAtivoComEtapas(lavoura.id);
  check(ativo?.ciclo.calculoDesatualizado === true, 'redesenhar marca a conta das sementes como desatualizada');

  // Colheita feita encerra o ciclo (RF-041)
  await marcarEtapaFeita(colheita.id, d(7, 2, 2027));
  check((await cicloAtivoComEtapas(lavoura.id)) === null, 'colheita feita: a lavoura fica sem ciclo ativo');
  const [encerrado] = await ciclosAnterioresDaArea(lavoura.id);
  check(
    encerrado?.status === 'encerrado' && mesmoDia(encerrado.encerradoEm, d(7, 2, 2027)),
    'o ciclo vai para os anteriores, colhido em 07/02/2027'
  );
  area = await areaDoBanco(lavoura.id);
  check(
    area.cultura === null && area.faseLavoura === 'pousio' && situacaoDaArea(area).estado === 'colhida',
    'a área fica "Colhida" até o próximo plantio'
  );
  check(
    (await rejeita(() => marcarEtapaFeita(pulverizacao.id))) === 'Este ciclo já foi encerrado.',
    'etapa de ciclo encerrado não é marcada'
  );

  // Plantio no futuro: "Em preparo" até marcar o plantio; plantar 3 dias depois leva as datas junto
  const segundo = await plantarMilho(lavoura.id, d(25, 11));
  area = await areaDoBanco(lavoura.id);
  check(
    area.faseLavoura === 'preparo' && situacaoDaArea(area).legenda === 'Em preparo',
    'ciclo com plantio no futuro deixa a lavoura "Em preparo"'
  );
  let doSegundo = await etapasDoCiclo(segundo);
  await marcarEtapaFeita(doSegundo[1].id, d(28, 11));
  doSegundo = await etapasDoCiclo(segundo);
  area = await areaDoBanco(lavoura.id);
  check(
    mesmoDia(doSegundo[0].previstaEm, d(15, 11)) &&
      mesmoDia(doSegundo[2].previstaEm, d(23, 12)) &&
      mesmoDia(doSegundo[4].previstaEm, d(18, 3, 2027)),
    'plantio feito 3 dias depois: as etapas seguintes andam 3 dias; o preparo fica'
  );
  check(
    area.faseLavoura === 'vegetativo' && mesmoDia(area.dataPlantio, d(28, 11)),
    'plantio feito: a lavoura vira "Plantada" e conta da data real'
  );

  // Cancelar: sai do painel, fica nos anteriores
  await cancelarCiclo(segundo);
  area = await areaDoBanco(lavoura.id);
  const anteriores = await ciclosAnterioresDaArea(lavoura.id);
  check(
    anteriores.length === 2 && anteriores.some((c) => c.status === 'cancelado') && area.cultura === null && area.faseLavoura === null,
    'cancelar o ciclo: lavoura "Vazia" e o ciclo nos anteriores como cancelado'
  );

  // Mudar o plantio ainda não feito leva as outras etapas e a data do ciclo
  const terceiro = await plantarMilho(lavoura.id, d(25, 11));
  const doTerceiro = await etapasDoCiclo(terceiro);
  await mudarPrevisaoDaEtapa(doTerceiro[1].id, d(30, 11));
  const depois = await etapasDoCiclo(terceiro);
  const [cicloTerceiro] = await db.select().from(ciclosPlantio).where(eq(ciclosPlantio.id, terceiro));
  check(
    mesmoDia(depois[0].previstaEm, d(20, 11)) &&
      mesmoDia(depois[4].previstaEm, d(20, 3, 2027)) &&
      mesmoDia(cicloTerceiro.dataPlantio, d(30, 11)) &&
      mesmoDia((await areaDoBanco(lavoura.id)).dataPlantio, d(30, 11)),
    'adiar o plantio em 5 dias leva as outras etapas e a data do ciclo junto'
  );

  // Trocar de tipo cancela o ciclo ativo
  await atualizarTalhao(lavoura.id, { tipo: 'pasto' });
  const [depoisDaTroca] = await db.select().from(ciclosPlantio).where(eq(ciclosPlantio.id, terceiro));
  check(depoisDaTroca.status === 'cancelado', 'lavoura que vira pasto cancela o ciclo ativo (RN-004)');

  // Avisos agendados com o ciclo (datas longe, para não depender do relógio)
  const futuroId = await plantarMilho(outra.id, d(10, 3, 2030), d(1, 1, 2030));
  const vinculos = () =>
    db
      .select()
      .from(notificacoesAgendadas)
      .where(and(eq(notificacoesAgendadas.entidade, 'ciclo'), eq(notificacoesAgendadas.entidadeId, futuroId)));
  check((await vinculos()).length === 10, 'plantar agenda véspera e atraso das 5 etapas (RF-043)');
  const [preparo] = await etapasDoCiclo(futuroId);
  await marcarEtapaFeita(preparo.id, d(1, 3, 2030));
  check((await vinculos()).length === 8, 'etapa feita: os avisos dela saem');

  // Excluir a lavoura cancela o ciclo ativo e os avisos
  await deletarTalhao(outra.id);
  const [doExcluido] = await db.select().from(ciclosPlantio).where(eq(ciclosPlantio.id, futuroId));
  check(doExcluido.status === 'cancelado' && (await vinculos()).length === 0, 'excluir a lavoura cancela o ciclo e os avisos dele');

  // Modelos do admin (RF-042)
  const soja = await criarModeloCultura({
    nome: 'Soja',
    taxaKgHa: 60,
    sacoKg: 40,
    etapas: [
      { nome: 'Plantio', tipo: 'plantio', dias: 0 },
      { nome: 'Colheita', tipo: 'colheita', dias: 120 },
    ],
  });
  check(soja.nome === 'Soja' && (await modelosDoAdmin()).length === 1, 'admin cria um modelo de cultura');
  check(
    (await rejeita(() => criarModeloCultura({ nome: 'soja', taxaKgHa: null, sacoKg: 20, etapas: soja.etapas }))) ===
      'Já existe uma cultura com esse nome.',
    'nome de modelo repetido não passa'
  );
  check(
    (await rejeita(() =>
      criarModeloCultura({ nome: 'Feijão', taxaKgHa: null, sacoKg: 20, etapas: [{ nome: 'Plantio', tipo: 'plantio', dias: 0 }] })
    )) !== null,
    'modelo sem colheita não passa'
  );

  // Área apagada de vez leva ciclos e etapas (ON DELETE CASCADE)
  await db.delete(talhoes).where(eq(talhoes.id, lavoura.id));
  check(
    (await db.select().from(ciclosPlantio).where(eq(ciclosPlantio.areaId, lavoura.id))).length === 0 &&
      (await db.select().from(etapasCiclo).where(eq(etapasCiclo.cicloId, cicloId))).length === 0,
    'apagar a área apaga os ciclos e as etapas'
  );
}

async function runPlantioMapaTest() {
  console.log('🌱 MINHA FAZENDA - PLANTIO NA LAVOURA (FASE 4)\n');
  regrasPuras();
  await banco();
  console.log('\n🎉 PLANTIO NA LAVOURA OK!');
}

runPlantioMapaTest().catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
