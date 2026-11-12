import { eq } from 'drizzle-orm';

import { anotacoesDaMaquina, criarAnotacao } from '@/features/maquinas/data/anotacoes';
import {
  atualizarMaquina,
  buscarMaquinaPorReferencia,
  cadastrarMaquina,
  listarMaquinas,
} from '@/features/maquinas/data/maquinas';
import {
  formatarDiaHistorico,
  formatarMomento,
  montarHistorico,
  ultimoUsoEncerrado,
} from '@/features/maquinas/services/historico';
import {
  encerrarUso,
  gravarPontos,
  iniciarUso,
  pausarUso,
  pontosDoUso,
  registrarContinua,
  registrarUsoManual,
  tempoTotalRegistrado,
  usoAbertoDoOperador,
  usosDaMaquinaDesde,
  usosEmAberto,
  usosRecentes,
} from '@/features/maquinas/data/usos';
import { chaveDaMarca } from '@/features/maquinas/marcas/chave';
import { buscarMaquinas } from '@/features/maquinas/services/busca';
import { gerarCodigo } from '@/features/maquinas/services/codigo';
import { conteudoQrMaquina, lerQrMaquina } from '@/features/maquinas/services/qrCode';
import { LOGOS_VETORIAIS } from '@/features/maquinas/marcas/logosVetoriais';
import {
  formatarCronometro,
  formatarDuracao,
  somarDuracoes,
  usoPorDia,
} from '@/features/maquinas/services/uso';
import { registrarAbastecimento } from '@/features/maquinas/data/abastecimentos';
import { leiturasDaMaquina } from '@/features/maquinas/data/horimetro';
import { problemasAbertos, registrarProblema, resolverProblema } from '@/features/maquinas/data/ocorrencias';
import { condicaoDaMaquina } from '@/features/maquinas/services/registros';
import {
  abastecimentos,
  db,
  initTestDatabase,
  maquinas,
  paradasUso,
  pontosGps,
  novoRegistro,
  talhoes,
  usosMaquina,
  fecharTestDatabase,
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

const HORA = 60 * 60 * 1000;
const em = (d: number, h: number, min = 0) => new Date(2026, 10, d, h, min);

async function runMaquinasTest() {
  console.log('=========================================================');
  console.log('🚜 MINHA FAZENDA - MÁQUINAS E AUDITORIA DE USO');
  console.log('=========================================================\n');

  // Regras puras
  check(formatarDuracao(0) === '0 min' && formatarDuracao(45 * 60000) === '45 min', 'duração abaixo de 1h em minutos');
  check(formatarDuracao(2 * HORA + 5 * 60000) === '2h 05 min', 'duração com horas e minutos (2h 05 min)');
  check(
    formatarDuracao(30000) === '<1 min' && formatarDuracao(30000, { curto: true }) === '<1m',
    'menos de 1 min é "<1 min" (topo e gráfico iguais)'
  );
  check(
    formatarDuracao(0, { curto: true }) === '' && formatarDuracao(2.5 * HORA, { curto: true }) === '2,5h',
    'formato curto do gráfico'
  );
  check(formatarCronometro(26 * HORA + 61000) === '26:01:01', 'cronômetro passa de 24h sem zerar');

  const agora = em(6, 10);
  const dias = usoPorDia(
    [
      { inicio: em(5, 22), fim: em(6, 1) }, // atravessa a meia-noite
      { inicio: em(6, 8), fim: null }, // ainda ligada: conta até agora
      { inicio: em(20, 8), fim: em(20, 9) }, // fora da janela
    ],
    agora
  );
  check(dias.length === 7 && dias[6].dia.getTime() === em(6, 0).getTime(), '7 dias, hoje por último');
  check(dias[5].duracaoMs === 2 * HORA, 'uso que atravessa a meia-noite: 2h ontem');
  check(dias[6].duracaoMs === 1 * HORA + 2 * HORA, 'hoje: 1h do uso da madrugada + 2h do uso em aberto');
  check(somarDuracoes(dias) === 5 * HORA, 'total da semana soma os dias');

  // Marca digitada → logo
  const chaves = [...Object.keys(LOGOS_VETORIAIS), 'masseyferguson', 'newholland', 'valtra', 'caseih'].sort(
    (a, b) => b.length - a.length
  );
  check(chaveDaMarca(' John  Deere ', chaves) === 'johndeere', 'marca sem diferenciar espaços e maiúsculas');
  check(chaveDaMarca('Citroën', ['citroen']) === 'citroen', 'marca sem diferenciar acento');
  check(chaveDaMarca('MF', chaves) === 'masseyferguson' && chaveDaMarca('vw', chaves) === 'volkswagen', 'apelidos (MF, VW)');
  check(chaveDaMarca('Massey Ferguson 4275', chaves) === 'masseyferguson', 'marca com modelo junto');
  check(chaveDaMarca('Case IH', chaves) === 'caseih' && chaveDaMarca('Case', chaves) === 'caseih', 'Case e Case IH dão o mesmo logo');
  check(chaveDaMarca('Jacto', chaves) === null && chaveDaMarca('', chaves) === null && chaveDaMarca(null, chaves) === null, 'marca sem logo ou vazia: ícone genérico');
  check(
    Object.values(LOGOS_VETORIAIS).every((l) => l.paths.length > 0 && /^#[0-9A-F]{6}$/i.test(l.cor) && l.viewBox.split(' ').length === 4),
    'todos os logos vetoriais têm traço, cor e viewBox'
  );

  // QR Code
  const qr = conteudoQrMaquina('abc-123');
  check(qr === 'minhafazenda://maquina/abc-123', 'QR da máquina é o link do app para a ficha');
  check(JSON.stringify(lerQrMaquina(qr)) === JSON.stringify({ tipo: 'id', id: 'abc-123' }), 'lê o id do link');
  check(lerQrMaquina('MINHAFAZENDA://maquina/abc-123?x=1')?.tipo === 'id', 'link com maiúsculas e parâmetros');
  check(JSON.stringify(lerQrMaquina(' tr-01 ')) === JSON.stringify({ tipo: 'codigo', codigo: 'TR-01' }), 'etiqueta só com o ID curto');
  check(
    lerQrMaquina('https://site.com/x') === null && lerQrMaquina('texto com espaço') === null && lerQrMaquina('minhafazenda://maquina/') === null,
    'QR que não é de máquina é ignorado'
  );

  // Busca
  const frota = [
    { codigo: 'TR-02', nome: 'Trator novo', tipo: 'trator' as const, marca: 'Valtra', modelo: 'A134' },
    { codigo: 'CM-01', nome: 'Caminhão do leite', tipo: 'caminhao' as const, marca: 'Ford', modelo: 'Cargo' },
    { codigo: 'TR-01', nome: 'Trator velho', tipo: 'trator' as const, marca: 'Massey Ferguson', modelo: null },
  ];
  check(buscarMaquinas(frota, '').length === 3, 'sem termo, toda a frota');
  check(buscarMaquinas(frota, 'tr-01')[0].codigo === 'TR-01', 'ID exato vem primeiro');
  check(buscarMaquinas(frota, 'caminhao').map((m) => m.codigo).join() === 'CM-01', 'nome sem acento');
  check(buscarMaquinas(frota, 'valtra').map((m) => m.codigo).join() === 'TR-02', 'busca pela marca');
  check(buscarMaquinas(frota, 'trator').map((m) => m.codigo).join() === 'TR-02,TR-01', 'nome antes do tipo, na ordem da lista');
  check(buscarMaquinas(frota, 'xyz').length === 0, 'termo sem resultado');

  // ID interno gerado pelo tipo
  check(gerarCodigo('trator', []) === 'TR-01', 'primeiro trator vira TR-01');
  check(gerarCodigo('trator', ['TR-01', 'TR-03', 'CA-02']) === 'TR-02', 'preenche o primeiro número livre');
  check(gerarCodigo('caminhao', ['TR-01']) === 'CA-01', 'cada tipo tem seu prefixo');

  // Banco
  await initTestDatabase();

  const trator = await cadastrarMaquina({ codigo: ' tr-01 ', nome: ' Trator do curral ', tipo: 'trator', marca: 'Valtra' });
  check(trator.codigo === 'TR-01' && trator.nome === 'Trator do curral', 'cadastro normaliza ID (maiúsculas) e nome');
  check(trator.status === 'ativa', 'máquina nasce ativa');
  check(
    (await rejeita(() => cadastrarMaquina({ codigo: 'Tr-01', nome: 'Outro' })))?.includes('TR-01') ?? false,
    'ID repetido é recusado sem diferenciar maiúsculas'
  );
  check((await rejeita(() => cadastrarMaquina({ codigo: '  ', nome: 'X' }))) !== null, 'ID vazio é recusado');

  const uso = await iniciarUso(trator.id, {}, em(6, 7));
  check(uso.fim === null && uso.inicio.getTime() === em(6, 7).getTime(), 'ligar abre um uso sem fim');
  check((await usosEmAberto()).length === 1, 'máquina ligada aparece entre as em uso');
  check((await rejeita(() => iniciarUso(trator.id))) === 'A máquina já está em uso', 'não liga duas vezes');


  check((await buscarMaquinaPorReferencia({ tipo: 'id', id: trator.id }))?.codigo === 'TR-01', 'QR com id acha a máquina');
  check((await buscarMaquinaPorReferencia({ tipo: 'codigo', codigo: 'TR-01' }))?.id === trator.id, 'QR com ID curto acha a máquina');
  check((await buscarMaquinaPorReferencia({ tipo: 'id', id: 'nao-existe' })) === undefined, 'QR de máquina apagada não acha nada');

  const encerrado = await encerrarUso(trator.id, { fim: em(6, 9, 30) });
  check(encerrado.uso?.fim?.getTime() === em(6, 9, 30).getTime(), 'desligar fecha o uso no horário informado');
  check(
    encerrado.uso?.operador === 'Beta' && encerrado.uso.fimMotivo === 'manual',
    'uso guarda quem operou (usuário do celular) e como terminou'
  );
  check((await usosEmAberto()).length === 0, 'depois de desligar não há uso aberto');
  check((await rejeita(() => encerrarUso(trator.id))) === 'A máquina não está em uso', 'não desliga máquina parada');

  await iniciarUso(trator.id, {}, em(6, 10));
  await encerrarUso(trator.id, { fim: em(6, 11) });
  const [{ totalMs }] = await tempoTotalRegistrado(trator.id);
  check(totalMs === 3.5 * HORA, 'tempo total registrado soma os usos encerrados (3h30)');

  await iniciarUso(trator.id, {}, em(6, 12));
  const janela = await usosDaMaquinaDesde(trator.id, em(6, 9));
  check(janela.length === 3, 'consulta da semana traz usos que terminam na janela e o aberto');
  await encerrarUso(trator.id, { fim: em(6, 13) });

  const inativa = await cadastrarMaquina({ codigo: 'CM-01', nome: 'Caminhão velho', status: 'inativa' });
  check((await rejeita(() => iniciarUso(inativa.id))) === 'Máquina inativa não pode ser ligada', 'máquina inativa não liga');

  check((await listarMaquinas()).map((m) => m.nome).join() === 'Caminhão velho,Trator do curral', 'lista em ordem alfabética pelo nome');

  const semId = await cadastrarMaquina({ nome: 'Trator novo', tipo: 'trator' });
  const outroSemId = await cadastrarMaquina({ nome: 'Carreta', tipo: 'implemento' });
  check(semId.codigo === 'TR-02' && outroSemId.codigo === 'IM-01', 'sem ID informado, o cadastro gera pelo tipo');
  check(
    outroSemId.categoria === 'implemento' && outroSemId.combustivel === null && !outroSemId.possuiHorimetro,
    'implemento é cadastrado sem combustível nem horímetro'
  );
  check(semId.categoria === 'motorizada' && semId.possuiHorimetro, 'trator é motorizado e tem horímetro');

  // Edição do cadastro (lápis da ficha): o ID interno do QR não muda
  const editado = await atualizarMaquina(semId.id, { nome: ' Trator azul ', tipo: 'trator', marca: 'New Holland', modelo: 'TL75' });
  check(
    editado.nome === 'Trator azul' && editado.modelo === 'TL75' && editado.codigo === semId.codigo,
    'editar a máquina grava os dados e mantém o ID interno'
  );
  const virouImplemento = await atualizarMaquina(semId.id, { nome: 'Trator azul', tipo: 'implemento', combustivel: 'diesel' });
  check(
    virouImplemento.categoria === 'implemento' && virouImplemento.combustivel === null && !virouImplemento.possuiHorimetro,
    'editar para implemento tira combustível e horímetro'
  );
  await atualizarMaquina(semId.id, { nome: 'Trator azul', tipo: 'trator', possuiHorimetro: true });
  check((await rejeita(() => atualizarMaquina(semId.id, { nome: '  ', tipo: 'trator' }))) !== null, 'editar sem nome é recusado');

  historico();

  await auditoria(trator.id, semId.id);

  await criarAnotacao(trator.id, '  Troca de óleo  ');
  const [anotacao] = await anotacoesDaMaquina(trator.id);
  check(anotacao?.texto === 'Troca de óleo', 'anotação gravada sem espaços nas pontas');
  check((await rejeita(() => criarAnotacao(trator.id, '   '))) !== null, 'anotação vazia é recusada');


  console.log('\n🎉 Máquinas: tudo certo!');
}

/** Aba Histórico: junta tudo por dia, do mais recente, e formata as datas. */
function historico() {
  const uso = (id: string, inicio: Date, fim: Date | null) =>
    ({ id, inicio, fim }) as Parameters<typeof ultimoUsoEncerrado>[0][number];
  const usos = [uso('u3', em(7, 10), null), uso('u2', em(6, 18), em(6, 19)), uso('u1', em(5, 8), em(5, 9))];
  const dias = montarHistorico({
    usos,
    abastecimentos: [{ id: 'a1', abastecidoEm: em(6, 20) }] as never,
    leituras: [
      { id: 'l1', lidoEm: em(5, 7), origem: 'avulsa' },
      { id: 'l2', lidoEm: em(6, 20), origem: 'abastecimento' },
    ] as never,
    problemas: [{ id: 'p1', registradoEm: em(7, 9) }] as never,
  });
  check(
    dias.map((d) => d.itens.map((i) => i.id).join('+')).join(' | ') === 'u3+p1 | a1+u2 | u1+l1',
    'histórico agrupa por dia, do mais recente, e esconde a leitura feita no abastecimento'
  );
  check(montarHistorico({ usos, abastecimentos: [], leituras: [], problemas: [] }, 2).flatMap((d) => d.itens).length === 2, 'histórico respeita o limite');
  check(ultimoUsoEncerrado(usos)?.id === 'u2', 'último uso ignora o que ainda está aberto');

  const sexta = new Date(2026, 10, 6, 18, 39);
  check(formatarMomento(sexta) === 'sex, 06/11 às 18:39', 'último uso formatado como "sex, 06/11 às 18:39"');
  check(formatarDiaHistorico(sexta) === 'Sexta, 06/11/2026', 'dia do histórico formatado como "Sexta, 06/11/2026"');
}

/** Auditoria de máquinas no banco: ligar com implemento, assumir, descarte, rastro, registros. */
async function auditoria(tratorId: string, outroTratorId: string) {
  const SEG = 1000;
  const MIN = 60 * SEG;
  const joao = { id: 'usuario-joao', nome: 'João' };
  const T = em(7, 7).getTime();

  const plantadeira = await cadastrarMaquina({ nome: 'Plantadeira 7 linhas', tipo: 'plantadeira', larguraTrabalhoM: 3.5 });
  check(plantadeira.categoria === 'implemento' && plantadeira.larguraTrabalhoM === 3.5, 'plantadeira é implemento com largura');
  check((await rejeita(() => iniciarUso(plantadeira.id))) !== null, 'implemento não liga sozinho');

  // Talhão de 2 km x 2 km em volta do ponto de partida
  const [lat0, lng0] = [-22, -47];
  const mLat = 1 / 110_574;
  const mLng = 1 / (111_320 * Math.cos((lat0 * Math.PI) / 180));
  const canto = (x: number, y: number) => [lng0 + x * mLng, lat0 + y * mLat];
  await db.insert(talhoes).values(novoRegistro({
    nome: 'Talhão do Rio',
    cor: '#3B873E',
    areaHectares: 400,
    geometriaJson: {
      type: 'Polygon' as const,
      coordinates: [[canto(-100, -1000), canto(1900, -1000), canto(1900, 1000), canto(-100, 1000), canto(-100, -1000)]],
    },
    centroLat: lat0,
    centroLng: lng0,
    minLat: lat0 - 1000 * mLat,
    maxLat: lat0 + 1000 * mLat,
    minLng: lng0 - 100 * mLng,
    maxLng: lng0 + 1900 * mLng,
  }));

  // Ligar com implemento e atividade, com GPS
  const uso = await iniciarUso(
    tratorId,
    { implementoId: plantadeira.id, atividade: 'plantio', rastreado: true, posicao: { lat: lat0, lng: lng0 } },
    new Date(T)
  );
  check(
    uso.implementoId === plantadeira.id && uso.atividade === 'plantio' && uso.operadorId === 'usuario-beta',
    'ligar guarda implemento, atividade e operador'
  );
  check(
    (await rejeita(() => iniciarUso(outroTratorId, { implementoId: plantadeira.id, operador: joao })))?.includes('engatad') ??
      false,
    'implemento engatado não vai para outra máquina'
  );
  check(
    (await rejeita(() => iniciarUso(outroTratorId)))?.startsWith('Você está usando') ?? false,
    'a mesma pessoa não usa duas máquinas ao mesmo tempo'
  );
  check((await usoAbertoDoOperador('usuario-beta'))[0]?.id === uso.id, 'uso aberto da pessoa é encontrado');

  // 1 km a 2 m/s dentro do talhão, um ponto a cada 5 s
  await gravarPontos(
    uso.id,
    Array.from({ length: 101 }, (_, i) => ({
      lat: lat0,
      lng: lng0 + i * 10 * mLng,
      precisaoM: 5,
      velocidadeMs: 2,
      simulado: false,
      em: T + i * 5 * SEG,
    }))
  );
  check((await pontosDoUso(uso.id)).length === 101, 'pontos do GPS ficam no banco durante o uso');
  await pausarUso(uso.id, new Date(T + 500 * SEG));
  const fechado = await encerrarUso(tratorId, { fim: new Date(T + 20 * MIN) });
  const u = fechado.uso!;
  check(
    Math.abs((u.kmTotal ?? 0) - 1) < 0.02 && Math.abs((u.areaEstimadaHa ?? 0) - 0.35) < 0.01,
    'ao desligar: KM pelo GPS e área com a largura da plantadeira'
  );
  check(u.talhoes?.[0]?.nome === 'Talhão do Rio', 'ao desligar: talhão trabalhado sai do mapa, sem escolher');
  check((u.segPausa ?? 0) >= 690 && u.segTrabalhando === 500, 'pausa não conta como trabalho');
  check((await db.select().from(pontosGps)).length === 0, 'pontos do GPS são apagados ao encerrar (fica o rastro simplificado)');
  check((u.rastro?.length ?? 0) === 2, 'rastro simplificado guardado no uso');
  check((await db.select().from(paradasUso)).every((p) => p.fim !== null), 'pausa aberta é fechada ao encerrar');

  // Ligou sem querer: descartado
  await iniciarUso(tratorId, {}, new Date(T + 30 * MIN));
  const descartado = await encerrarUso(tratorId, { fim: new Date(T + 30 * MIN + 30 * SEG) });
  check(descartado.descartado && descartado.uso === null, 'ligou sem querer (30 s): uso descartado');
  check((await usosRecentes(tratorId, 1))[0]?.id === u.id, 'uso descartado não aparece nos últimos usos');

  // Troca de turno: Beta assume o uso do João
  const doJoao = await iniciarUso(outroTratorId, { operador: joao }, new Date(T + 40 * MIN));
  check(
    (await rejeita(() => iniciarUso(outroTratorId, {}, new Date(T + 50 * MIN)))) === 'A máquina já está em uso',
    'sem assumir, não liga máquina em uso por outro'
  );
  const assumido = await iniciarUso(outroTratorId, { assumir: true }, new Date(T + 50 * MIN));
  const antigo = (await db.select().from(usosMaquina).where(eq(usosMaquina.id, doJoao.id)))[0];
  check(
    antigo.fim?.getTime() === T + 50 * MIN && antigo.fimMotivo === 'assumida' && assumido.operador === 'Beta',
    'assumir fecha o uso do João naquela hora e abre o novo'
  );
  await registrarContinua(assumido.id, new Date(T + 3 * 60 * MIN), new Date(T + 60 * MIN));
  const comContinua = (await db.select().from(usosMaquina).where(eq(usosMaquina.id, assumido.id)))[0];
  check(comContinua.continuaAte?.getTime() === T + 3 * 60 * MIN, '"Continua" fica registrado e adia a pergunta');
  await encerrarUso(outroTratorId, { fim: new Date(T + 70 * MIN) });

  // Uso esquecido
  const manual = await registrarUsoManual(tratorId, { inicio: em(5, 8), fim: em(5, 10), atividade: 'transporte' }, em(7, 12));
  check(manual.origem === 'manual' && manual.fim?.getTime() === em(5, 10).getTime(), 'uso esquecido entra marcado como manual');
  check(
    (await rejeita(() => registrarUsoManual(tratorId, { inicio: em(5, 9), fim: em(5, 11) }, em(7, 12)))) ===
      'Já há uso registrado nesse horário',
    'uso esquecido não sobrepõe outro'
  );
  check(
    (await rejeita(() => registrarUsoManual(tratorId, { inicio: em(7, 11), fim: em(7, 13) }, em(7, 12)))) !== null,
    'uso esquecido não termina no futuro'
  );

  // Abastecimento com horímetro
  await registrarAbastecimento({
    maquinaId: tratorId,
    litros: 80,
    tanqueCheio: true,
    origem: 'fazenda',
    horimetroH: 1250,
    horimetroEstimadoH: 1249,
  });
  const [leitura] = await leiturasDaMaquina(tratorId, 1);
  check(
    (await db.select().from(abastecimentos)).length === 1 && leitura?.origem === 'abastecimento' && leitura.valorH === 1250,
    'abastecimento com horímetro também grava a leitura'
  );
  check(
    (await rejeita(() => registrarAbastecimento({ maquinaId: tratorId, litros: 0, tanqueCheio: true, origem: 'posto' }))) !== null,
    'abastecimento sem litros é recusado'
  );

  // Problema muda a situação da máquina até ser resolvido
  const problema = await registrarProblema({ maquinaId: tratorId, categoria: 'hidraulico', podeUsar: false, descricao: ' vazando ' });
  const trator = (await db.select().from(maquinas).where(eq(maquinas.id, tratorId)))[0];
  check(
    condicaoDaMaquina(trator, await problemasAbertos(tratorId)) === 'paradaPorProblema' && problema.descricao === 'vazando',
    'problema "não dá para usar" deixa a máquina parada por problema'
  );
  await resolverProblema(problema.id);
  check(condicaoDaMaquina(trator, await problemasAbertos(tratorId)) === 'ok', 'problema resolvido libera a máquina (o registro fica)');

}

runMaquinasTest().then(fecharTestDatabase).catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
