import { eq } from 'drizzle-orm';
import Storage from 'expo-sqlite/kv-store';

import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { CAMADAS_PADRAO, lerCamadas, salvarCamadas } from '@/features/mapa/data/camadasMapa';
import {
  avisosTrocaDeTipo,
  buscarAreas,
  colecaoDasAreas,
  consequenciasExclusao,
  consequenciasRedesenho,
  contornoTracejado,
  descreverSafra,
  detalheDaArea,
  opcoesDaArea,
  perimetroDaAreaM,
  resumoDaArea,
  resumoDaSafra,
  situacaoDaArea,
} from '@/features/mapa/services/areas';
import {
  faixaDoRotulo,
  ocorrenciasNosRotulos,
  PRIORIDADE_NO_MAPA,
  ZOOM_MAXIMO_MAPA,
  ZOOM_TODOS_OS_ROTULOS,
} from '@/features/mapa/services/rotulos';
import { contarPontosAbertos, criarMarcador, resolverMarcador } from '@/services/marcadorService';
import type { OcorrenciaNoMapa } from '@/services/ocorrenciaService';
import {
  atualizarTalhao,
  criarTalhao,
} from '@/services/talhaoService';
import { podeEditarGeometria } from '@/services/usuario';
import type { Coordenada } from '@/utils/geoMath';
import { db, initTestDatabase, talhoes, type Talhao, fecharTestDatabase } from './support/database';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

/** ~100 m em graus de longitude/latitude perto do equador */
const LADO = 0.0008983;
const QUADRADO_1HA: Coordenada[] = [
  [-47.0, 0.0],
  [-47.0 + LADO, 0.0],
  [-47.0 + LADO, LADO],
  [-47.0, LADO],
];
const RETANGULO_2HA: Coordenada[] = [
  [-47.0, 0.0],
  [-47.0 + LADO * 2, 0.0],
  [-47.0 + LADO * 2, LADO],
  [-47.0, LADO],
];

const AGORA = new Date(2026, 10, 10, 12);
const DIA = 24 * 60 * 60 * 1000;

/** Área montada à mão (sem banco) para as regras puras. */
function areaFake(parcial: Partial<Talhao>): Talhao {
  return {
    id: 'a1',
    nome: 'Área',
    tipo: 'pasto',
    cor: COR_POR_TIPO_AREA.pasto,
    areaHectares: 1.01,
    perimetroM: 400,
    geometriaJson: { type: 'Polygon', coordinates: [[...QUADRADO_1HA, QUADRADO_1HA[0]]] },
    centroLat: LADO / 2,
    centroLng: -47.0 + LADO / 2,
    minLat: 0,
    maxLat: LADO,
    minLng: -47.0,
    maxLng: -47.0 + LADO,
    cultura: null,
    faseLavoura: null,
    dataPlantio: null,
    fazendaId: 'f',
    createdBy: null,
    deletedAt: null,
    createdAt: AGORA,
    updatedAt: AGORA,
    ...parcial,
  };
}

function regrasPuras() {
  // Situação: legenda do rótulo no mapa, selo do painel e contorno
  const pasto = areaFake({ tipo: 'pasto' });
  const reserva = areaFake({ tipo: 'reserva', nome: 'Reserva' });
  const outro = areaFake({ tipo: 'outro', nome: 'Sede' });
  const vazia = areaFake({ tipo: 'lavoura', nome: 'Talhão 4' });
  const preparo = areaFake({ tipo: 'lavoura', cultura: 'milho', faseLavoura: 'preparo' });
  const plantada = areaFake({
    tipo: 'lavoura',
    nome: 'Talhão 3',
    cultura: 'milho',
    faseLavoura: 'vegetativo',
    dataPlantio: new Date(AGORA.getTime() - 32 * DIA),
  });
  const colher = areaFake({ tipo: 'lavoura', cultura: 'soja', faseLavoura: 'colheita' });
  const colhida = areaFake({ tipo: 'lavoura', cultura: 'milho', faseLavoura: 'pousio' });

  const sPasto = situacaoDaArea(pasto);
  check(
    sPasto.estado === 'descanso' && sPasto.legenda === 'Descanso',
    'pasto que nunca teve animais está em descanso (RN-008)'
  );
  check(situacaoDaArea(reserva).legenda === 'APP', 'reserva mostra "APP" embaixo do nome, como no protótipo');
  check(situacaoDaArea(outro).legenda === null, 'outro mostra só o nome');
  const sVazia = situacaoDaArea(vazia);
  check(sVazia.estado === 'vazia' && sVazia.legenda === 'Vazia', 'lavoura sem safra: "Vazia"');
  const sPreparo = situacaoDaArea(preparo);
  check(sPreparo.estado === 'vazia' && sPreparo.legenda === 'Em preparo', 'lavoura em preparo conta como vazia');
  const sPlantada = situacaoDaArea(plantada);
  check(sPlantada.estado === 'plantada' && sPlantada.legenda === 'Milho', 'lavoura plantada mostra a cultura');
  check(situacaoDaArea(colher).estado === 'plantada', 'lavoura pronta para colher segue plantada');
  const sColhida = situacaoDaArea(colhida);
  check(sColhida.estado === 'colhida' && sColhida.legenda === 'Colhida', 'lavoura em pousio aparece como colhida');
  check(
    contornoTracejado('vazia') && contornoTracejado('colhida') && contornoTracejado('descanso') &&
      !contornoTracejado('plantada') && !contornoTracejado('ocupado') && !contornoTracejado(null),
    'contorno tracejado só para área parada (vazia, colhida, em descanso)'
  );

  // Card da safra no painel da lavoura
  const safra = resumoDaSafra(plantada, AGORA);
  check(
    safra?.cultura === 'Milho' && safra.fase === null && safra.dias === 32,
    'card da safra: cultura e dias desde o plantio ("Plantada" já está no selo)'
  );
  check(resumoDaSafra(colher, AGORA)?.fase === 'Pronta p/ colher', 'card da safra mostra a fase quando ela diz mais que o selo');
  check(resumoDaSafra(preparo, AGORA)?.fase === 'Em preparo', 'lavoura em preparo: selo "Vazia", card "Em preparo"');
  check(resumoDaSafra(vazia, AGORA) === null && resumoDaSafra(pasto, AGORA) === null, 'sem safra, sem card');

  // Menu "⋮" por papel
  check(
    opcoesDaArea(true, 'outro').join() === 'editar,redesenhar,pontoAtencao,excluir',
    'admin: renomear/tipo, redesenhar, ponto de atenção e excluir'
  );
  check(opcoesDaArea(false, 'outro').join() === 'editar,pontoAtencao', 'colaborador não vê redesenhar nem excluir (RN-012)');

  // Trocar o tipo avisa o que deixa de valer
  check(descreverSafra(plantada) === 'Milho · Plantada', 'descreve a safra registrada com os textos da folha "Safra"');
  const avisos = avisosTrocaDeTipo(plantada, 'pasto');
  check(avisos.length === 1 && avisos[0].includes('Milho · Plantada'), 'sair de lavoura com safra avisa que ela será apagada');
  check(avisosTrocaDeTipo(plantada, 'lavoura').length === 0, 'manter o tipo não avisa nada');
  check(avisosTrocaDeTipo(vazia, 'reserva').length === 0, 'lavoura sem safra troca de tipo sem aviso');
  check(avisosTrocaDeTipo(pasto, 'lavoura').length === 0, 'pasto vira lavoura sem aviso');

  // Confirmações (folha "Redesenhar Pasto 1?" / "Excluir Pasto 1?")
  const redesenho = consequenciasRedesenho();
  check(
    redesenho.length === 1 && redesenho[0].tom === 'ok' && redesenho[0].texto === 'Nome, tipo e histórico continuam',
    'redesenhar lembra que nome, tipo e histórico continuam'
  );
  check(consequenciasExclusao(0).map((i) => i.texto).join() === 'O histórico fica guardado', 'excluir sem pontos: só o histórico');
  check(consequenciasExclusao(2)[0].texto.includes('Os 2 pontos de atenção'), 'excluir avisa os pontos de atenção que saem');

  // Medidas e textos
  const semPerimetro = areaFake({ perimetroM: null });
  const calculado = perimetroDaAreaM(semPerimetro);
  check(Math.abs(calculado - 400) <= 2, `área antiga sem perímetro gravado calcula do contorno (${calculado} m)`);
  check(perimetroDaAreaM(areaFake({ perimetroM: 1234 })) === 1234, 'usa o perímetro gravado quando existe');
  check(
    resumoDaArea(areaFake({ tipo: 'pasto', areaHectares: 28.4, perimetroM: 2140 })) === 'Pasto · 28,4 ha · 2,14 km',
    'resumo do painel: "Pasto · 28,4 ha · 2,14 km"'
  );
  check(resumoDaArea(areaFake({ tipo: 'lavoura', perimetroM: 420 })).endsWith('420 m'), 'perímetro curto em metros');
  check(detalheDaArea(plantada) === 'Lavoura · Milho', 'detalhe da lista: tipo e situação');
  check(detalheDaArea(outro) === 'Outro', 'detalhe da lista sem situação: só o tipo');
  check(detalheDaArea(pasto) === 'Pasto · Descanso', 'pasto sem animais: "Pasto · Descanso"');

  // Busca de áreas (sem acento, por nome ou tipo, mais prováveis primeiro)
  const lista = [plantada, vazia, areaFake({ id: 'p1', nome: 'Pasto da frente' }), reserva];
  check(buscarAreas(lista, 'talhao').map((a) => a.nome).join() === 'Talhão 3,Talhão 4', 'busca ignora acento');
  check(buscarAreas(lista, 'talhão 4')[0]?.nome === 'Talhão 4', 'nome exato vem primeiro');
  check(buscarAreas(lista, 'app')[0]?.nome === 'Reserva', 'acha pelo tipo (Reserva/APP)');
  check(buscarAreas(lista, '  ').length === 0, 'sem termo, a busca não sugere nada');

  // Camada do mapa
  const ocupado = new Map([['a2', { cabecas: 18, desde: AGORA, ultimaSaida: null }]]);
  const colecao = colecaoDasAreas([vazia, areaFake({ id: 'a2', tipo: 'pasto' }), areaFake({ id: 'a3', tipo: 'pasto' })], ocupado);
  check(colecao.features.length === 3, 'camada: um polígono por área (rótulos ficam no MarkerView)');
  check(
    colecao.features[0].properties?.cor === COR_POR_TIPO_AREA.lavoura &&
      colecao.features[0].properties?.contorno === 'tracejado' &&
      colecao.features[1].properties?.cor === COR_POR_TIPO_AREA.pasto &&
      colecao.features[1].properties?.contorno === 'continuo' &&
      colecao.features[2].properties?.contorno === 'tracejado',
    'camada: cor vem do tipo; contorno contínuo no pasto ocupado e tracejado no vazio'
  );
}

/** Ocorrência aberta no mapa, montada à mão */
function ocorrenciaFake(id: string, ponto: Coordenada | null, urgente = false): OcorrenciaNoMapa {
  return {
    id,
    titulo: `Ocorrência ${id}`,
    categoria: 'cerca',
    urgente,
    status: 'aberta',
    responsavelId: null,
    descricao: null,
    pontoLng: ponto ? ponto[0] : null,
    pontoLat: ponto ? ponto[1] : null,
  };
}

function rotulosNoMapa() {
  // Quando o rótulo aparece: de uns 28 dp de área na tela até ela tomar a largura da tela (~360 dp)
  const media = faixaDoRotulo({ areaHectares: 3, centroLat: -21 });
  check(
    media.zoomMinimo > 13.3 && media.zoomMinimo < 13.8,
    `pasto de 3 ha mostra o rótulo desde o zoom ${media.zoomMinimo.toFixed(2)} (a fazenda inteira na tela fica perto do 15)`
  );
  check(
    media.zoomMaximo > 17 && media.zoomMaximo < 17.5,
    `no zoom alto o rótulo do pasto de 3 ha some (zoom ${media.zoomMaximo.toFixed(2)}: a área já toma a tela)`
  );
  check(
    Math.abs(media.zoomMaximo - media.zoomMinimo - Math.log2(360 / 28)) < 1e-9,
    'a faixa visível tem sempre a mesma largura (de 28 a 360 dp de área)'
  );
  const grande = faixaDoRotulo({ areaHectares: 30, centroLat: -21 });
  check(
    grande.zoomMinimo < media.zoomMinimo && grande.zoomMaximo < media.zoomMaximo,
    'área maior mostra o rótulo de mais longe e esconde antes ao aproximar'
  );
  const quatroVezes = faixaDoRotulo({ areaHectares: 12, centroLat: -21 });
  check(
    Math.abs(quatroVezes.zoomMinimo - (media.zoomMinimo - 1)) < 1e-9 &&
      Math.abs(quatroVezes.zoomMaximo - (media.zoomMaximo - 1)) < 1e-9,
    'área 4× maior (lado 2×) tem a faixa um zoom antes'
  );
  const minuscula = faixaDoRotulo({ areaHectares: 0.01, centroLat: -21 });
  check(
    minuscula.zoomMinimo === ZOOM_TODOS_OS_ROTULOS && minuscula.zoomMaximo > ZOOM_TODOS_OS_ROTULOS,
    `área minúscula espera no máximo o zoom ${ZOOM_TODOS_OS_ROTULOS} e ainda tem rótulo depois dele`
  );
  check(
    faixaDoRotulo({ areaHectares: 0.0001, centroLat: -21 }).zoomMaximo === ZOOM_MAXIMO_MAPA,
    `o rótulo não some depois do maior zoom do mapa (${ZOOM_MAXIMO_MAPA})`
  );
  const semMedida = faixaDoRotulo({ areaHectares: 0, centroLat: -21 });
  check(
    semMedida.zoomMinimo === ZOOM_TODOS_OS_ROTULOS &&
      semMedida.zoomMaximo > semMedida.zoomMinimo &&
      faixaDoRotulo({ areaHectares: Number.NaN, centroLat: -21 }).zoomMinimo === ZOOM_TODOS_OS_ROTULOS,
    'área sem medida não some do mapa: rótulo numa faixa fixa'
  );
  const enorme = faixaDoRotulo({ areaHectares: 100_000, centroLat: 0 });
  check(
    enorme.zoomMinimo > 0 && enorme.zoomMinimo < 8 && enorme.zoomMaximo > enorme.zoomMinimo,
    `área enorme (100 mil ha) mostra o rótulo de muito longe (zoom ${enorme.zoomMinimo.toFixed(2)})`
  );

  // Ocorrência no centro da área vai presa no rótulo; com ponto próprio fica solta
  const centro: Coordenada = [-47.0 + LADO / 2, LADO / 2];
  const areas = [
    areaFake({ id: 'a1' }),
    areaFake({ id: 'a2', centroLng: -46.99, centroLat: 0.01 }),
  ];
  const { porArea, soltas } = ocorrenciasNosRotulos(
    [
      ocorrenciaFake('urgente', centro, true),
      ocorrenciaFake('gps', [-47.0 + LADO / 4, LADO / 4]),
      ocorrenciaFake('quaseNoCentro', [centro[0] + 4e-6, centro[1] - 4e-6]),
      ocorrenciaFake('outraArea', [-46.99, 0.01]),
      ocorrenciaFake('semPonto', null),
    ],
    areas
  );
  check(
    porArea.get('a1')?.map((o) => o.id).join(',') === 'urgente,quaseNoCentro' &&
      porArea.get('a2')?.map((o) => o.id).join(',') === 'outraArea',
    'ocorrência no centro da área (até ~1 m) vai para o rótulo dela, na ordem recebida (urgente primeiro)'
  );
  check(
    soltas.map((o) => o.id).join(',') === 'gps,semPonto',
    'ocorrência com ponto próprio (GPS) fica com o pino solto no lugar marcado'
  );
  const semAreas = ocorrenciasNosRotulos([ocorrenciaFake('x', centro)], []);
  check(semAreas.porArea.size === 0 && semAreas.soltas.length === 1, 'sem áreas, todo pino fica solto');

  // Por cima no mapa: pino > rótulo aberto > rótulo
  check(
    PRIORIDADE_NO_MAPA.pinoAtivo > PRIORIDADE_NO_MAPA.pino &&
      PRIORIDADE_NO_MAPA.pino > PRIORIDADE_NO_MAPA.rotuloAtivo &&
      PRIORIDADE_NO_MAPA.rotuloAtivo > PRIORIDADE_NO_MAPA.rotulo,
    'pinos (ocorrência, máquina) ficam por cima dos rótulos; a área aberta, por cima das vizinhas'
  );
}

function permissoesECamadas() {
  check(podeEditarGeometria({ id: 'd1', nome: 'Beta', papel: 'owner' }), 'o dono pode desenhar e excluir áreas');
  check(!podeEditarGeometria({ id: 'c1', nome: 'João', papel: 'collaborator' }), 'colaborador não mexe no polígono');
  check(!podeEditarGeometria({ id: 'c2', nome: 'Sem papel' }), 'usuário sem papel é tratado como colaborador');

  check(JSON.stringify(lerCamadas()) === JSON.stringify(CAMADAS_PADRAO), 'camadas começam no padrão (satélite, tudo ligado)');
  salvarCamadas({ estilo: 'mapa', areas: false, pontos: true, ocorrencias: true, rebanho: false });
  const salvas = lerCamadas();
  check(
    salvas.estilo === 'mapa' && !salvas.areas && salvas.pontos && !salvas.rebanho,
    'camadas escolhidas (inclusive Rebanho) ficam salvas no celular'
  );
  Storage.setItemSync('mapa.camadas', '{quebrado');
  check(JSON.stringify(lerCamadas()) === JSON.stringify(CAMADAS_PADRAO), 'valor corrompido volta ao padrão');
  Storage.setItemSync('mapa.camadas', JSON.stringify({ estilo: 'xyz', areas: 'sim', pontos: false }));
  const parcial = lerCamadas();
  check(parcial.estilo === 'satelite' && parcial.areas && !parcial.pontos, 'campo estranho volta ao padrão, o válido fica');
}

async function banco() {
  await initTestDatabase();

  const lavoura = await criarTalhao({ nome: ' Talhão 3 ', tipo: 'lavoura', coordenadas: QUADRADO_1HA });
  check(
    lavoura.nome === 'Talhão 3' && lavoura.cor === COR_POR_TIPO_AREA.lavoura,
    'criar área grava a cor do tipo (sem escolher cor)'
  );
  check(
    lavoura.perimetroM !== null && Math.abs(lavoura.perimetroM - 400) <= 2,
    `criar área grava o perímetro em metros (${lavoura.perimetroM} m)`
  );

  await atualizarTalhao(lavoura.id, { tipo: 'reserva' });
  const [reserva] = await db.select().from(talhoes).where(eq(talhoes.id, lavoura.id));
  check(reserva.tipo === 'reserva' && reserva.cor === COR_POR_TIPO_AREA.reserva, 'trocar o tipo troca a cor');

  await atualizarTalhao(lavoura.id, { coordenadas: RETANGULO_2HA });
  const [redesenhada] = await db.select().from(talhoes).where(eq(talhoes.id, lavoura.id));
  check(
    redesenhada.perimetroM !== null &&
      Math.abs(redesenhada.perimetroM - 600) <= 3 &&
      Math.abs(redesenhada.areaHectares - 2) <= 0.05 &&
      redesenhada.nome === 'Talhão 3' &&
      redesenhada.tipo === 'reserva',
    `redesenhar recalcula área e perímetro e mantém nome e tipo (${redesenhada.areaHectares} ha, ${redesenhada.perimetroM} m)`
  );

  // Aviso antes de excluir: conta só os pontos de atenção abertos da área
  const ponto = await criarMarcador({ tipo: 'praga', titulo: 'Lagarta', lat: LADO / 2, lng: -47.0 + LADO / 2 });
  check(ponto.talhaoId === lavoura.id && (await contarPontosAbertos(lavoura.id)) === 1, 'conta o ponto de atenção aberto dentro da área');
  await resolverMarcador(ponto.id);
  check((await contarPontosAbertos(lavoura.id)) === 0, 'ponto resolvido não entra na contagem');

}

async function runAreasMapaTest() {
  console.log('🗺️  MINHA FAZENDA - ÁREAS NO MAPA (FASE 1)\n');
  regrasPuras();
  rotulosNoMapa();
  permissoesECamadas();
  await banco();
  console.log('\n🎉 ÁREAS NO MAPA OK!');
}

runAreasMapaTest().then(fecharTestDatabase).catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
