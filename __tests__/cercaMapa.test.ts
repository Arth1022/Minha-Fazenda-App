import { eq } from 'drizzle-orm';

import { consequenciasRedesenho, opcoesDaArea, podeCercar, usaInsumos } from '@/features/mapa/services/areas';
import { formatarReais } from '@/features/mapa/services/calculos';
import {
  calcularCercaDaArea,
  custoDaCerca,
  detalheDoArame,
  detalheDosEsticadores,
  resumoDaCerca,
} from '@/features/mapa/services/cerca';
import {
  calculoCercaDaArea,
  existeCercaSalva,
  salvarCalculoCerca,
  ultimosPrecosCerca,
  type DadosCalculoCerca,
} from '@/services/cercaService';
import { atualizarTalhao, criarTalhao, deletarTalhao } from '@/services/talhaoService';
import { contarCantos, type Coordenada } from '@/utils/geoMath';
import { calculosCerca, db, initTestDatabase, talhoes, fecharTestDatabase } from './support/database';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

/** ~100 m por lado perto do equador, deslocado para cada área não sobrepor. */
const L = 0.0008983;
const quadrado = (x: number, lado = L): Coordenada[] => [
  [-47 + x, 0],
  [-47 + x + lado, 0],
  [-47 + x + lado, lado],
  [-47 + x, lado],
];

function regrasPuras() {
  // Cantos: onde o contorno vira de verdade (um esticador por fio em cada um)
  check(contarCantos(quadrado(0)) === 4, 'quadrado tem 4 cantos');
  check(
    contarCantos([
      [-47, 0],
      [-47 + L / 2, 0],
      [-47 + L, 0],
      [-47 + L, L],
      [-47, L],
    ]) === 4,
    'ponto no meio de um lado reto não é canto'
  );
  check(
    contarCantos([
      [-47, 0],
      [-47 + L / 2, L * 0.05],
      [-47 + L, 0],
      [-47 + L, L],
      [-47, L],
    ]) === 4,
    'dobra leve (menos de 30°) não é canto'
  );
  check(
    contarCantos([
      [-47, 0],
      [-47 + L, 0],
      [-47, L],
    ]) === 3,
    'triângulo tem 3 cantos'
  );
  check(contarCantos([...quadrado(0), quadrado(0)[0]]) === 4, 'anel fechado (1º ponto repetido) conta igual');
  check(
    contarCantos([
      [-47, 0],
      [-47 + L, 0],
    ]) === 0,
    'menos de 3 pontos: sem cantos'
  );

  // Tela 21: 2.140 m, arame 5 fios, mourão a cada 3 m, 4 cantos
  const conta = calcularCercaDaArea(2140, 4, 'arame5', 3);
  check(
    conta.fios === 5 &&
      conta.metrosArame === 10700 &&
      conta.rolos === 22 &&
      conta.mouroes === 715 &&
      conta.esticadores === 20 &&
      conta.custo === null,
    'tela 21: 10.700 m de arame (22 rolos), 715 mourões e 20 esticadores; sem preço, sem custo'
  );
  check(detalheDoArame(conta.metrosArame) === '10.700 m · rolos de 500 m', 'detalhe do arame: "10.700 m · rolos de 500 m"');
  check(detalheDosEsticadores(5, 4) === '5 fios × 4 cantos', 'detalhe dos esticadores: "5 fios × 4 cantos"');
  check(detalheDosEsticadores(1, 0) === '1 fio × 1 canto', 'contorno sem canto: um esticador por fio no começo da cerca');
  check(resumoDaCerca(conta) === '22 rolos · 715 mourões', 'linha "Cerca" do painel: "22 rolos · 715 mourões"');
  check(resumoDaCerca({ rolos: 1, mouroes: 1 }) === '1 rolo · 1 mourão', 'resumo no singular');

  const comPreco = calcularCercaDaArea(2140, 4, 'arame5', 3, { rolo: 450, mourao: 18, esticador: 25 });
  check(comPreco.custo === 23270, 'custo: 22 × 450 + 715 × 18 + 20 × 25 = 23.270');
  check(formatarReais(comPreco.custo ?? 0) === 'R$ 23.270,00', 'custo em reais: "R$ 23.270,00"');
  check(custoDaCerca(conta, { rolo: 450, mourao: null, esticador: 0 }) === 9900, 'só o que tem preço entra no custo');
  check(custoDaCerca(conta, { rolo: null, mourao: null, esticador: null }) === null, 'nenhum preço: sem custo');
  check(custoDaCerca(conta, null) === null, 'preços fechados: sem custo');
  check(formatarReais(12345.6) === 'R$ 12.345,60' && formatarReais(0.5) === 'R$ 0,50', 'reais com milhar e centavos');

  const vazia = calcularCercaDaArea(0, 0, 'eletrica1', 4);
  check(vazia.rolos === 0 && vazia.mouroes === 0 && vazia.esticadores === 0, 'perímetro zero: nada a comprar');

  // Redesenhar avisa da cerca salva (RF-032)
  check(
    consequenciasRedesenho(0, true).some((item) => item.icone === 'fence'),
    '"Redesenhar X?" avisa que a cerca salva fica desatualizada'
  );
  check(!consequenciasRedesenho(0, false).some((item) => item.icone === 'fence'), 'sem cerca salva, sem aviso de cerca');

  // As calculadoras saíram da aba Mapa e foram para o "⋮" da área (RF-033 e RF-044)
  check(
    opcoesDaArea(true, 'pasto').join() === 'cercar,insumos,editar,redesenhar,pontoAtencao,excluir',
    'pasto (admin): cercar, insumos e o resto do menu'
  );
  check(
    opcoesDaArea(false, 'lavoura').join() === 'cercar,insumos,editar,pontoAtencao',
    'lavoura (colaborador): calculadoras, sem redesenhar nem excluir'
  );
  check(
    opcoesDaArea(true, 'reserva').join() === 'cercar,editar,redesenhar,pontoAtencao,excluir',
    'reserva: cerca, sem insumos'
  );
  check(opcoesDaArea(false, 'outro').join() === 'editar,pontoAtencao', '"outro" (sede, curral...) não tem calculadora');
  check(
    podeCercar('reserva') && !podeCercar('outro') && usaInsumos('pasto') && usaInsumos('lavoura') && !usaInsumos('reserva'),
    'cerca em pasto, lavoura e reserva; insumos em pasto e lavoura'
  );
}

/** A conta de uma área de 400 m de perímetro (quadrado de 100 m). */
function dados(areaId: string, extra: Partial<DadosCalculoCerca> = {}): DadosCalculoCerca {
  const conta = calcularCercaDaArea(400, 4, 'arame5', 3);
  return {
    areaId,
    tipoCerca: 'arame5',
    fios: conta.fios,
    espacamentoM: 3,
    perimetroM: 400,
    cantos: 4,
    metrosArame: conta.metrosArame,
    rolos: conta.rolos,
    mouroes: conta.mouroes,
    esticadores: conta.esticadores,
    precoRolo: null,
    precoMourao: null,
    precoEsticador: null,
    custo: null,
    ...extra,
  };
}

async function banco() {
  await initTestDatabase();
  const pasto = await criarTalhao({ nome: 'Pasto 1', tipo: 'pasto', coordenadas: quadrado(0) });
  const reserva = await criarTalhao({ nome: 'Reserva', tipo: 'reserva', coordenadas: quadrado(0.002) });

  check(
    !(await existeCercaSalva(pasto.id)) && (await ultimosPrecosCerca()) === null,
    'área nova: sem cerca salva e sem preços anteriores'
  );

  await salvarCalculoCerca(dados(pasto.id));
  let [salva] = await calculoCercaDaArea(pasto.id);
  check(
    (await existeCercaSalva(pasto.id)) && salva?.rolos === 4 && salva.mouroes === 135 && salva.desatualizado === false,
    'salvar grava a cerca na área: 4 rolos e 135 mourões (RF-031)'
  );

  await salvarCalculoCerca(dados(pasto.id, { tipoCerca: 'eletrica2', fios: 2, precoRolo: 450, custo: 900 }));
  const doPasto = await db.select().from(calculosCerca).where(eq(calculosCerca.areaId, pasto.id));
  check(
    doPasto.length === 1 && doPasto[0].tipoCerca === 'eletrica2' && doPasto[0].precoRolo === 450,
    'salvar de novo substitui: uma cerca por área'
  );
  check((await ultimosPrecosCerca())?.precoRolo === 450, 'a próxima conta começa com os preços da última cerca com preço');

  await salvarCalculoCerca(dados(reserva.id));

  // Renomear não mexe na cerca; redesenhar marca como desatualizada (RF-032)
  await atualizarTalhao(pasto.id, { nome: 'Pasto Um' });
  [salva] = await calculoCercaDaArea(pasto.id);
  check(salva?.desatualizado === false, 'renomear não deixa a cerca desatualizada');

  await atualizarTalhao(pasto.id, { coordenadas: quadrado(0, L * 1.5) });
  [salva] = await calculoCercaDaArea(pasto.id);
  const [daReserva] = await calculoCercaDaArea(reserva.id);
  check(
    salva?.desatualizado === true && daReserva?.desatualizado === false,
    'redesenhar marca só a cerca da área redesenhada como desatualizada'
  );

  await salvarCalculoCerca(dados(pasto.id, { perimetroM: 600 }));
  [salva] = await calculoCercaDaArea(pasto.id);
  check(salva?.desatualizado === false && salva.perimetroM === 600, 'salvar de novo recalcula e tira a marca de desatualizada');

  // Área excluída leva a cerca junto (soft delete na mesma transação)
  await deletarTalhao(reserva.id);
  check(!(await existeCercaSalva(reserva.id)), 'apagar a área apaga a cerca dela');
}

async function runCercaMapaTest() {
  console.log('🧱 MINHA FAZENDA - CERCA NA ÁREA (FASE 3)\n');
  regrasPuras();
  await banco();
  console.log('\n🎉 CERCA NA ÁREA OK!');
}

runCercaMapaTest().then(fecharTestDatabase).catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
