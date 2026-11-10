import { eq } from 'drizzle-orm';

import {
  atualizarTalhao,
  criarTalhao,
  deletarTalhao,
  listarTalhoesAtivos,
  listarTalhoesNoViewport,
} from '@/services/talhaoService';
import {
  type Coordenada,
  calcularAreaHectares,
  calcularPerimetroKm,
  extrairMetadadosEspaciais,
  fecharAnelLinear,
  pontoDentroDoPoligono,
  validarPoligono,
} from '@/utils/geoMath';
import {
  calcularCerca,
  calcularSementes,
  formatarDistancia,
  formatarNumero,
  lerNumero,
  paraCampo,
} from '@/features/mapa/services/calculos';
import Storage from 'expo-sqlite/kv-store';
import { obterFazendaMapa, salvarFazendaMapa } from '@/features/mapa/data/fazendaMapa';
import { db, fazendaConfig, initTestDatabase, sqlite, talhoes } from './support/database';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function check(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
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

async function runTalhoesTest() {
  console.log('=========================================================');
  console.log('🗺️  MINHA FAZENDA - TESTE DE TALHÕES (Turf.js + SQLite)');
  console.log('=========================================================\n');

  await initTestDatabase();

  // 1. Fechamento de anel linear e cálculo de área geodésica (~100m x 100m = 1.00 ha)
  // No equador, ~0.0008983° equivale a ~100 metros
  const ladoGraus = 0.0008983;
  const quadrado1Ha: Coordenada[] = [
    [-47.0, 0.0],
    [-47.0 + ladoGraus, 0.0],
    [-47.0 + ladoGraus, ladoGraus],
    [-47.0, ladoGraus],
  ];

  const anelFechado = fecharAnelLinear(quadrado1Ha);
  check(
    anelFechado.length === 5 &&
      anelFechado[0][0] === anelFechado[4][0] &&
      anelFechado[0][1] === anelFechado[4][1],
    'fecharAnelLinear duplica o primeiro vértice no final para fechar o polígono',
  );
  check(
    fecharAnelLinear(anelFechado).length === 5,
    'fecharAnelLinear não duplica se o anel já estiver fechado',
  );

  const area1Ha = calcularAreaHectares(quadrado1Ha);
  check(
    Math.abs(area1Ha - 1.0) <= 0.02,
    `cálculo geodésico de quadrado 100m x 100m retorna ~1.00 ha (${area1Ha} ha)`,
  );
  const perimetroQuadradoKm = calcularPerimetroKm(quadrado1Ha);
  check(
    Math.abs(perimetroQuadradoKm - 0.4) <= 0.02,
    `cálculo de perímetro de quadrado 100m x 100m retorna ~0.40 km (${perimetroQuadradoKm} km)`,
  );
  check(
    calcularAreaHectares([
      [-47.0, -15.0],
      [-47.01, -15.01],
    ]) === 0,
    'menos de 3 vértices retorna área 0',
  );

  // 2. Validação topológica: polígono válido vs autointerseção (formato de "8")
  const validacaoOk = validarPoligono(quadrado1Ha);
  check(validacaoOk.isValid && !validacaoOk.error, 'polígono simples é válido');

  const validacaoPoucosPontos = validarPoligono([
    [-47.0, -15.0],
    [-47.01, -15.0],
  ]);
  check(
    !validacaoPoucosPontos.isValid && Boolean(validacaoPoucosPontos.error),
    'polígono com menos de 3 vértices é rejeitado',
  );

  const poligonoEmOito: Coordenada[] = [
    [-47.0, -15.0],
    [-46.99, -15.01], // diagonal cruzando o meio
    [-46.99, -15.0],
    [-47.0, -15.01], // segunda diagonal cruzando a primeira
  ];
  const validacaoKinks = validarPoligono(poligonoEmOito);
  check(
    !validacaoKinks.isValid &&
      validacaoKinks.error === 'As linhas do talhão não podem se cruzar.',
    'polígono com linhas cruzadas em "8" é detectado e rejeitado pelo @turf/kinks',
  );

  // 3. Metadados espaciais (Centróide e BBOX)
  const pastoCoords: Coordenada[] = [
    [-47.92, -15.78],
    [-47.91, -15.78],
    [-47.91, -15.77],
    [-47.92, -15.77],
  ];
  const meta = extrairMetadadosEspaciais(pastoCoords);
  check(
    meta.minLng === -47.92 &&
      meta.maxLng === -47.91 &&
      meta.minLat === -15.78 &&
      meta.maxLat === -15.77,
    'extrairMetadadosEspaciais calcula BBOX exato (min/max lat e lng)',
  );
  check(
    Math.abs(meta.centroLng - -47.915) < 0.0001 &&
      Math.abs(meta.centroLat - -15.775) < 0.0001,
    'extrairMetadadosEspaciais calcula o centróide no centro do retângulo',
  );

  // 4. Persistência no SQLite via Drizzle ORM
  check(
    await rejeita(() =>
      criarTalhao({
        nome: 'Talhão Inválido',
        coordenadas: poligonoEmOito,
      }),
    ),
    'criarTalhao recusa gravar polígono com autointerseção no banco',
  );

  check(
    await rejeita(() =>
      criarTalhao({
        nome: '   ',
        coordenadas: pastoCoords,
      }),
    ),
    'criarTalhao recusa nome em branco',
  );

  const pasto1 = await criarTalhao({
    nome: 'Pasto 1',
    tipo: 'pasto',
    coordenadas: pastoCoords,
  });

  check(UUID_V4.test(pasto1.id), `id do talhão é UUID v4 (${pasto1.id})`);
  check(
    pasto1.nome === 'Pasto 1' &&
      pasto1.tipo === 'pasto' &&
      pasto1.cor === '#22C55E' &&
      pasto1.syncStatus === 'created',
    'campos básicos, cor do tipo (pasto) e syncStatus = created gravados com sucesso',
  );
  check(
    pasto1.createdAt instanceof Date && pasto1.updatedAt instanceof Date,
    'timestamps created_at e updated_at gravados como Date',
  );
  check(
    pasto1.geometriaJson.type === 'Polygon' &&
      pasto1.geometriaJson.coordinates[0].length === 5,
    'geometriaJson persistida como GeoJSON Polygon fechado no SQLite',
  );

  const lavouraCoords: Coordenada[] = [
    [-48.5, -16.2],
    [-48.49, -16.2],
    [-48.49, -16.19],
    [-48.5, -16.19],
  ];
  const lavoura2 = await criarTalhao({
    nome: 'Lavoura 2',
    tipo: 'lavoura',
    coordenadas: lavouraCoords,
  });

  const ativos = await listarTalhoesAtivos();
  check(
    ativos.length === 2 &&
      ativos[0].nome === 'Pasto 1' &&
      ativos[1].nome === 'Lavoura 2',
    'listarTalhoesAtivos retorna os 2 talhões cadastrados na ordem de criação',
  );

  // 5. Consulta otimizada por Viewport (BBOX indexado)
  const visiveisPertoDoPasto = await listarTalhoesNoViewport({
    minLat: -15.8,
    maxLat: -15.75,
    minLng: -47.95,
    maxLng: -47.9,
  });
  check(
    visiveisPertoDoPasto.length === 1 &&
      visiveisPertoDoPasto[0].id === pasto1.id,
    'listarTalhoesNoViewport filtra apenas os talhões dentro da janela de coordenadas (BBOX)',
  );

  // 6. Exclusão lógica (soft delete para sincronização futura com PostGIS)
  await deletarTalhao(lavoura2.id);
  const ativosAposDelete = await listarTalhoesAtivos();
  check(
    ativosAposDelete.length === 1 && ativosAposDelete[0].id === pasto1.id,
    'deletarTalhao oculta o talhão da listagem ativa',
  );

  const [registroDeletado] = await db
    .select()
    .from(talhoes)
    .where(eq(talhoes.id, lavoura2.id));
  check(
    registroDeletado?.syncStatus === 'deleted',
    'deletarTalhao mantém o registro no banco com sync_status = deleted para sincronização',
  );

  // Edição de área (nome, tipo e contorno) num único UPDATE; a cor acompanha o tipo
  const editavel = await criarTalhao({ nome: 'Pasto Velho', coordenadas: quadrado1Ha });
  await atualizarTalhao(editavel.id, { nome: '  Pasto Novo ', tipo: 'lavoura' });
  const [aposEdicao] = await db.select().from(talhoes).where(eq(talhoes.id, editavel.id));
  check(
    aposEdicao.nome === 'Pasto Novo' && aposEdicao.tipo === 'lavoura' && aposEdicao.cor === '#EAB308',
    'atualizarTalhao grava nome (sem espaços), tipo e a cor do novo tipo',
  );
  check(
    aposEdicao.syncStatus === 'created',
    'atualizarTalhao mantém sync_status = created em talhão que ainda não subiu',
  );

  const retanguloMaior: Coordenada[] = [
    [-47.0, 0.0],
    [-47.0 + ladoGraus * 2, 0.0],
    [-47.0 + ladoGraus * 2, ladoGraus],
    [-47.0, ladoGraus],
  ];
  await db.update(talhoes).set({ syncStatus: 'synced' }).where(eq(talhoes.id, editavel.id));
  await atualizarTalhao(editavel.id, { coordenadas: retanguloMaior });
  const [aposContorno] = await db.select().from(talhoes).where(eq(talhoes.id, editavel.id));
  check(
    Math.abs(aposContorno.areaHectares - 2.0) <= 0.04 &&
      aposContorno.maxLng > aposEdicao.maxLng &&
      aposContorno.nome === 'Pasto Novo',
    `atualizarTalhao com contorno novo recalcula área e BBOX (${aposContorno.areaHectares} ha)`,
  );
  check(
    aposContorno.syncStatus === 'updated',
    'atualizarTalhao marca sync_status = updated em talhão já sincronizado',
  );
  check(
    await rejeita(() => atualizarTalhao(editavel.id, { nome: '   ' })),
    'atualizarTalhao recusa nome em branco',
  );

  // Cantos do talhão dentro da divisa da fazenda
  const divisa = fecharAnelLinear(retanguloMaior);
  check(
    pontoDentroDoPoligono([-47.0 + ladoGraus, ladoGraus / 2], divisa) &&
      !pontoDentroDoPoligono([-47.0 + ladoGraus * 3, ladoGraus / 2], divisa),
    'pontoDentroDoPoligono separa canto dentro e fora da divisa',
  );

  // Calculadoras da tela de Mapa (valores do protótipo)
  const sementes = calcularSementes(lerNumero('15,2'), 12, 20);
  check(
    sementes.totalKg === 182.4 && sementes.sacos === 10,
    'calcularSementes: 15,2 ha de braquiária a 12 kg/ha = 182,4 kg em 10 sacos de 20 kg',
  );
  check(calcularSementes(0, 12, 20).sacos === 0, 'calcularSementes: sem área, nenhum saco');

  const cerca = calcularCerca(lerNumero('2,4'), 5, 3);
  check(
    cerca.metrosArame === 12000 && cerca.rolos === 24 && cerca.mouroes === 801,
    'calcularCerca: 2,4 km com 5 fios a cada 3 m = 12.000 m, 24 rolos e 801 mourões',
  );
  check(calcularCerca(0, 5, 3).mouroes === 0, 'calcularCerca: sem comprimento, nenhum mourão');

  check(
    lerNumero('1.200,5') === 1200.5 && lerNumero('abc') === 0 && lerNumero('-3') === 0,
    'lerNumero aceita vírgula e milhar e ignora texto inválido ou negativo',
  );
  check(
    formatarNumero(12000) === '12.000' && formatarNumero(182.4) === '182,4',
    'formatarNumero usa milhar com ponto e decimal com vírgula',
  );
  check(paraCampo(15.234, 2) === '15,23' && paraCampo(0) === '', 'paraCampo preenche o campo sem milhar');
  check(
    formatarDistancia(0.42) === '420 m' && formatarDistancia(2.4) === '2,4 km',
    'formatarDistancia mostra metros abaixo de 1 km',
  );

  // Divisa da fazenda em fazenda_config (Drizzle + fallback do kv-store legado)
  check(obterFazendaMapa() === null, 'obterFazendaMapa retorna null quando não há divisa salva');

  const metaLegado = extrairMetadadosEspaciais(quadrado1Ha);
  Storage.setItemSync(
    'mapa.fazenda',
    JSON.stringify({
      nome: 'Fazenda Legada',
      divisa: metaLegado.geometriaJson.coordinates[0],
      areaHectares: metaLegado.areaHectares,
      minLat: metaLegado.minLat,
      maxLat: metaLegado.maxLat,
      minLng: metaLegado.minLng,
      maxLng: metaLegado.maxLng,
    }),
  );

  const migrada = obterFazendaMapa();
  const [configMigrada] = await db.select().from(fazendaConfig);
  check(
    migrada?.nome === 'Fazenda Legada' &&
      configMigrada?.nome === 'Fazenda Legada' &&
      Array.isArray(configMigrada?.divisaJson) &&
      configMigrada.divisaJson.length === 5 &&
      Storage.getItemSync('mapa.fazenda') === null,
    'obterFazendaMapa migra divisa legada do kv-store para fazenda_config e limpa a chave antiga',
  );

  let queriesExecutadas = 0;
  const prepareOriginal = sqlite.prepare.bind(sqlite);
  sqlite.prepare = ((sql: string, params?: any) => {
    queriesExecutadas += 1;
    return prepareOriginal(sql, params);
  }) as typeof sqlite.prepare;

  const fazendaAtualizada = salvarFazendaMapa('  Fazenda Esperança  ', retanguloMaior);
  sqlite.prepare = prepareOriginal;

  const configsAposUpdate = await db.select().from(fazendaConfig);
  check(
    queriesExecutadas === 1 &&
      configsAposUpdate.length === 1 &&
      configsAposUpdate[0].id === configMigrada.id &&
      configsAposUpdate[0].nome === 'Fazenda Esperança' &&
      Math.abs((configsAposUpdate[0].areaHectares ?? 0) - 2.0) <= 0.04 &&
      obterFazendaMapa()?.nome === 'Fazenda Esperança' &&
      fazendaAtualizada.nome === 'Fazenda Esperança',
    `salvarFazendaMapa atualiza nome, divisa e BBOX em fazenda_config numa única query (${queriesExecutadas} query)`,
  );

  console.log('\n🎉 TODOS OS TESTES DE TALHÕES PASSARAM!');
}

runTalhoesTest().catch((err) => {
  console.error('❌ Falha nos testes de talhões:', err);
  process.exit(1);
});
