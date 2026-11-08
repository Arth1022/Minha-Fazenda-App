import { eq } from 'drizzle-orm';

import {
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
  validarPoligono,
} from '@/utils/geoMath';
import { db, initTestDatabase, talhoes } from './support/database';

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
        cor: '#EF4444',
        coordenadas: poligonoEmOito,
      }),
    ),
    'criarTalhao recusa gravar polígono com autointerseção no banco',
  );

  check(
    await rejeita(() =>
      criarTalhao({
        nome: '   ',
        cor: '#22C55E',
        coordenadas: pastoCoords,
      }),
    ),
    'criarTalhao recusa nome em branco',
  );

  const pasto1 = await criarTalhao({
    nome: 'Pasto 1',
    tipo: 'pasto',
    cor: '#22C55E',
    coordenadas: pastoCoords,
  });

  check(UUID_V4.test(pasto1.id), `id do talhão é UUID v4 (${pasto1.id})`);
  check(
    pasto1.nome === 'Pasto 1' &&
      pasto1.tipo === 'pasto' &&
      pasto1.cor === '#22C55E' &&
      pasto1.syncStatus === 'created',
    'campos básicos e syncStatus = created gravados com sucesso',
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
    cor: '#EAB308',
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

  console.log('\n🎉 TODOS OS TESTES DE TALHÕES PASSARAM!');
}

runTalhoesTest().catch((err) => {
  console.error('❌ Falha nos testes de talhões:', err);
  process.exit(1);
});
