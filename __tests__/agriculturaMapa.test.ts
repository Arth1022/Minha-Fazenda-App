import { eq } from 'drizzle-orm';

import {
  calcularAdubacao,
  diasDesdePlantio,
} from '@/features/mapa/services/calculos';
import {
  criarMarcador,
  listarMarcadoresAtivos,
  resolverMarcador,
} from '@/services/marcadorService';
import {
  atualizarTalhao,
  criarTalhao,
  deletarTalhao,
  listarTalhoesAtivos,
} from '@/services/talhaoService';
import type { Coordenada } from '@/utils/geoMath';
import { db, initTestDatabase, marcadoresMapa, talhoes, fecharTestDatabase } from './support/database';

function check(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

async function runAgriculturaMapaTest() {
  console.log('=========================================================');
  console.log('🌽 MINHA FAZENDA - TESTE DE AGRICULTURA NO MAPA');
  console.log('=========================================================\n');

  await initTestDatabase();

  // 1. Talhão de lavoura (~20 ha: ~500m x ~400m no equador) com cultura, fase e data de plantio
  const lado500m = 0.0008983 * 5;
  const lado400m = 0.0008983 * 4;
  const coordsLavoura20Ha: Coordenada[] = [
    [-47.0, 0.0],
    [-47.0 + lado500m, 0.0],
    [-47.0 + lado500m, lado400m],
    [-47.0, lado400m],
  ];
  const dataPlantio32Dias = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);

  const lavouraMilho = await criarTalhao({
    nome: 'Lavoura da Sede',
    tipo: 'lavoura',
    coordenadas: coordsLavoura20Ha,
    cultura: 'milho',
    faseLavoura: 'vegetativo',
    dataPlantio: dataPlantio32Dias,
  });

  const [consultaLavoura] = await listarTalhoesAtivos();
  check(
    consultaLavoura?.id === lavouraMilho.id &&
      consultaLavoura.tipo === 'lavoura' &&
      consultaLavoura.cultura === 'milho' &&
      consultaLavoura.faseLavoura === 'vegetativo' &&
      consultaLavoura.dataPlantio instanceof Date &&
      Math.abs(consultaLavoura.areaHectares - 20.0) <= 0.5 &&
      diasDesdePlantio(consultaLavoura.dataPlantio) === 32,
    `talhão de lavoura persiste cultura="milho", fase="vegetativo", dataPlantio (32 dias) e área ~20 ha (${consultaLavoura?.areaHectares} ha)`,
  );

  // Mudar tipo para pasto limpa os campos de lavoura automaticamente
  await atualizarTalhao(lavouraMilho.id, { tipo: 'pasto' });
  const [aposVirarPasto] = await listarTalhoesAtivos();
  check(
    aposVirarPasto.tipo === 'pasto' &&
      aposVirarPasto.cultura === null &&
      aposVirarPasto.faseLavoura === null &&
      aposVirarPasto.dataPlantio === null,
    'atualizarTalhao para tipo != lavoura limpa cultura, faseLavoura e dataPlantio',
  );

  // Restaurar para lavoura
  await atualizarTalhao(lavouraMilho.id, {
    tipo: 'lavoura',
    cultura: 'soja',
    faseLavoura: 'colheita',
    dataPlantio: dataPlantio32Dias,
  });

  // 2. Calculadora de Adubação e Calagem
  const aduboNpk = calcularAdubacao(20, 300, 50);
  check(
    aduboNpk.totalKg === 6000 &&
      aduboNpk.sacos === 120 &&
      aduboNpk.toneladas === 6,
    'calcularAdubacao (NPK): 20 ha a 300 kg/ha = 6.000 kg, 120 sacos de 50 kg e 6 toneladas',
  );

  const calcario = calcularAdubacao(20, 2000, 50);
  check(
    calcario.totalKg === 40000 &&
      calcario.sacos === 800 &&
      calcario.toneladas === 40,
    'calcularAdubacao (Calcário): 20 ha a 2.000 kg/ha = 40.000 kg (40 toneladas)',
  );

  // 3. Marcadores de Campo (Pins de Pragas e Ocorrências)
  const centroLng = -47.0 + lado500m / 2;
  const centroLat = lado400m / 2;

  const marcadorLagarta = await criarMarcador({
    tipo: 'praga',
    titulo: 'Foco de lagarta',
    descricao: 'Lagarta-do-cartucho na bordadura',
    lat: centroLat,
    lng: centroLng,
  });

  check(
    marcadorLagarta.talhaoId === lavouraMilho.id &&
      marcadorLagarta.tipo === 'praga' &&
      marcadorLagarta.titulo === 'Foco de lagarta' &&
      marcadorLagarta.resolvido === false,
    'criarMarcador associa automaticamente o ponto ao talhão que contém a coordenada',
  );

  const marcadoresAtivosAntes = await listarMarcadoresAtivos();
  check(
    marcadoresAtivosAntes.length === 1 &&
      marcadoresAtivosAntes[0].id === marcadorLagarta.id,
    'listarMarcadoresAtivos retorna o marcador recém-criado',
  );

  await resolverMarcador(marcadorLagarta.id);
  const marcadoresAtivosDepois = await listarMarcadoresAtivos();
  const [marcadorNoBanco] = await db
    .select()
    .from(marcadoresMapa)
    .where(eq(marcadoresMapa.id, marcadorLagarta.id));
  check(
    marcadoresAtivosDepois.length === 0 && marcadorNoBanco?.resolvido === true,
    'resolverMarcador atualiza resolvido = true e remove o ponto da listagem ativa',
  );

  // 4. Exclusão do talhão em cascata (ON DELETE CASCADE no SQLite e no soft delete)
  const marcadorErosao = await criarMarcador({
    talhaoId: lavouraMilho.id,
    tipo: 'erosao',
    titulo: 'Sulco de erosão',
    lat: centroLat,
    lng: centroLng,
  });
  check(Boolean(marcadorErosao.id), 'segundo marcador criado no talhão');

  await deletarTalhao(lavouraMilho.id);
  const marcadoresRestantesCascade = await db
    .select()
    .from(marcadoresMapa)
    .where(eq(marcadoresMapa.talhaoId, lavouraMilho.id));
  check(
    marcadoresRestantesCascade.length > 0 && marcadoresRestantesCascade.every((m) => m.deletedAt instanceof Date),
    'excluir o talhão apaga (soft delete) os marcadores dele na mesma transação',
  );

  console.log('\n🎉 TODOS OS TESTES DE AGRICULTURA NO MAPA PASSARAM!');
}

runAgriculturaMapaTest().then(fecharTestDatabase).catch((err) => {
  console.error('❌ Falha nos testes de agricultura no mapa:', err);
  process.exit(1);
});
