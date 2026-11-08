import { decidirAutomacao, type SituacaoDoUso } from '@/features/maquinas/services/automacao';
import { simplificarLinha } from '@/features/maquinas/services/geo';
import { TEMPOS } from '@/features/maquinas/services/padroes';
import {
  deveDescartar,
  kmAndados,
  resumirRastro,
  ultimoMovimento,
  type OpcoesResumo,
  type PontoLido,
  type TalhaoDoRastro,
} from '@/features/maquinas/services/rastro';
import {
  condicaoDaMaquina,
  conferirAbastecimento,
  conferirHorimetro,
  horimetroEstimado,
  sugestoesAoLigar,
} from '@/features/maquinas/services/registros';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}
const perto = (a: number | null, b: number, tol: number) => a !== null && Math.abs(a - b) <= tol;

// ---------------------------------------------------------------------------
// Gerador de rastro: anda para leste a partir de um ponto, um ponto a cada 5 s
// ---------------------------------------------------------------------------
const ORIGEM = { lat: -22, lng: -47 };
const METRO_LNG = 1 / (111_320 * Math.cos((ORIGEM.lat * Math.PI) / 180));
const METRO_LAT = 1 / 110_574;
const T0 = new Date(2026, 10, 7, 7, 0).getTime();
const SEG = 1000;
const MIN = 60 * SEG;

function ponto(xM: number, yM: number, em: number, extra: Partial<PontoLido> = {}): PontoLido {
  return {
    lat: ORIGEM.lat + yM * METRO_LAT,
    lng: ORIGEM.lng + xM * METRO_LNG,
    precisaoM: 5,
    velocidadeMs: null,
    simulado: false,
    em,
    ...extra,
  };
}

/** `n` pontos andando a `ms` metros por segundo para leste, de 5 em 5 s. */
function andar(n: number, ms: number, desde = T0, xInicial = 0): PontoLido[] {
  return Array.from({ length: n }, (_, i) => ponto(xInicial + i * 5 * ms, 0, desde + i * 5 * SEG));
}

/** `n` pontos parados, com o "tremor" do GPS (1 a 2 m). */
function parado(n: number, desde: number, x = 0): PontoLido[] {
  return Array.from({ length: n }, (_, i) => ponto(x + (i % 2 ? 1.5 : 0), i % 3 ? 1 : 0, desde + i * 5 * SEG));
}

/** Talhão quadrado de 2 km x 2 km em volta da origem. */
const TALHAO: TalhaoDoRastro = (() => {
  const [x0, x1, y0, y1] = [-100, 1900, -1000, 1000];
  const canto = (x: number, y: number) => [ORIGEM.lng + x * METRO_LNG, ORIGEM.lat + y * METRO_LAT];
  const anel = [canto(x0, y0), canto(x1, y0), canto(x1, y1), canto(x0, y1), canto(x0, y0)];
  return {
    id: 't1',
    nome: 'Talhão da Baixada',
    anel,
    caixa: {
      minLat: ORIGEM.lat + y0 * METRO_LAT,
      maxLat: ORIGEM.lat + y1 * METRO_LAT,
      minLng: ORIGEM.lng + x0 * METRO_LNG,
      maxLng: ORIGEM.lng + x1 * METRO_LNG,
    },
  };
})();

const opcoes = (inicio: number, fim: number, extra: Partial<OpcoesResumo> = {}): OpcoesResumo => ({
  inicio,
  fim,
  pausas: [],
  talhoes: [TALHAO],
  faixaTrabalhoKmh: [2, 15],
  larguraM: 3.5,
  ...extra,
});

function runAuditoriaTest() {
  console.log('=========================================================');
  console.log('🛰️  MINHA FAZENDA - AUDITORIA DE MÁQUINAS (RASTRO E REGRAS)');
  console.log('=========================================================\n');

  // --- Rastro: KM, estados, talhão e área ---
  // 2 m/s (7,2 km/h) por 500 s = 1 km dentro do talhão
  const plantio = andar(101, 2);
  const fimPlantio = plantio[plantio.length - 1].em;
  const r = resumirRastro(plantio, opcoes(T0, fimPlantio));
  check(perto(r.kmTotal, 1, 0.01) && perto(r.kmTrabalhando, 1, 0.01), 'KM pelo GPS: 1 km andado trabalhando no talhão');
  check(r.segTrabalhando === 500 && r.segDeslocando === 0, 'tempo trabalhando: 500 s na faixa de trabalho');
  check(perto(r.areaEstimadaHa, 0.35, 0.005), 'área estimada = KM trabalhando × largura (3,5 m) ÷ 10 = 0,35 ha');
  check(
    r.talhoes.length === 1 && r.talhoes[0].nome === 'Talhão da Baixada' && perto(r.talhoes[0].km, 1, 0.01),
    'KM e tempo por talhão, sem escolher talhão'
  );
  check(r.qualidade === 1 && !r.localizacaoSimulada, 'qualidade 100% com ponto a cada 5 s');
  check(r.rastro.length === 2, 'rastro em linha reta é simplificado para 2 pontos');

  const semTalhao = resumirRastro(plantio, opcoes(T0, fimPlantio, { talhoes: [] }));
  check(semTalhao.kmTrabalhando === 0 && semTalhao.segDeslocando === 500, 'fora de talhão é deslocando, não trabalho');
  const caminhao = resumirRastro(plantio, opcoes(T0, fimPlantio, { faixaTrabalhoKmh: null }));
  check(caminhao.kmTrabalhando === 0 && perto(caminhao.kmTotal, 1, 0.01), 'caminhão: só desloca (sem faixa de trabalho)');
  const rapido = resumirRastro(andar(101, 6), opcoes(T0, T0 + 500 * SEG));
  check(rapido.kmTrabalhando === 0 && rapido.segDeslocando === 500, 'acima da faixa de trabalho (21,6 km/h) é deslocando');

  // --- Limpeza do GPS ---
  const tremendo = parado(60, T0);
  check(kmAndados(tremendo) === 0 && ultimoMovimento(tremendo) === null, 'parado, o tremor do GPS não soma KM');
  const rParado = resumirRastro(tremendo, opcoes(T0, tremendo[59].em));
  check(rParado.segParada === 295 && rParado.kmTotal === 0, 'tempo parado vira "parada"');

  const comSalto = [...andar(10, 2)];
  comSalto.splice(5, 0, ponto(2000, 0, comSalto[4].em + 2 * SEG)); // 2 km longe em 2 s
  check(perto(kmAndados(comSalto), 0.09, 0.005), 'salto isolado do GPS é descartado');
  const comImprecisos = andar(10, 2).map((p, i) => (i === 5 ? { ...p, precisaoM: 80, lat: p.lat + 0.01 } : p));
  check(perto(kmAndados(comImprecisos), 0.09, 0.005), 'ponto com precisão pior que 25 m é descartado');

  // Buraco de 5 min sem sinal no meio
  const antes = andar(13, 2); // 60 s
  const depois = andar(13, 2, antes[12].em + 5 * MIN, 120);
  const rBuraco = resumirRastro([...antes, ...depois], opcoes(T0, depois[12].em));
  check(rBuraco.segSemSinal === 300, 'sem sinal por 5 min: o tempo conta como "sem sinal"');
  check(perto(rBuraco.qualidade, 120 / 420, 0.01), 'qualidade cai com o trecho sem sinal (cobertura do tempo)');

  // Pausa no almoço
  const almoco = [...andar(13, 2), ...parado(100, T0 + 65 * SEG, 120)];
  const fimAlmoco = almoco[almoco.length - 1].em;
  const rPausa = resumirRastro(almoco, opcoes(T0, fimAlmoco, { pausas: [{ inicio: T0 + 65 * SEG, fim: null }] }));
  check(rPausa.segPausa >= 490 && rPausa.segParada <= 10, 'tempo em pausa não conta como parada');

  const simulado = andar(5, 2).map((p) => ({ ...p, simulado: true }));
  check(resumirRastro(simulado, opcoes(T0, simulado[4].em)).localizacaoSimulada, 'GPS falso fica marcado no uso');

  const curva = [...andar(20, 2), ...Array.from({ length: 20 }, (_, i) => ponto(190, (i + 1) * 10, T0 + (20 + i) * 5 * SEG))];
  check(simplificarLinha(curva, 3).length === 3, 'simplificação mantém a curva (início, canto e fim)');

  // --- Descarte ---
  check(deveDescartar(30 * SEG, 0.01), 'ligou sem querer: menos de 1 min e menos de 30 m é descartado');
  check(!deveDescartar(30 * SEG, 0.1) && !deveDescartar(2 * MIN, 0), 'uso curto que andou, ou de mais de 1 min, fica');
  check(deveDescartar(30 * SEG, null), 'sem GPS, vale só o tempo');

  // --- Automações ---
  const situacao = (extra: Partial<SituacaoDoUso>): SituacaoDoUso => ({
    inicio: T0,
    agora: T0,
    estacionario: false,
    velocidadeMaxKmh: 40,
    pontos: [],
    pausaDesde: null,
    paradaAvisadaEm: null,
    continuaAte: null,
    ...extra,
  });
  const trabalhou = andar(13, 2); // anda 1 min e para
  const parouEm = trabalhou[12].em;
  const paradoDepois = (min: number) => [...trabalhou, ...parado(min * 12, parouEm + 5 * SEG, 120)];

  check(decidirAutomacao(situacao({ agora: parouEm + 10 * MIN, pontos: paradoDepois(10) })).tipo === 'nada', 'parado há 10 min: nada');
  const aviso = decidirAutomacao(situacao({ agora: parouEm + 21 * MIN, pontos: paradoDepois(21) }));
  check(aviso.tipo === 'avisarParada' && aviso.paradaDesde === parouEm, 'parado há 20 min: pergunta Pausa, Continua ou Encerrar');
  check(
    decidirAutomacao(situacao({ agora: parouEm + 25 * MIN, pontos: paradoDepois(25), paradaAvisadaEm: parouEm + 21 * MIN })).tipo === 'nada',
    'já perguntou: não repete o aviso'
  );
  const esqueceu = decidirAutomacao(
    situacao({ agora: parouEm + 61 * MIN, pontos: paradoDepois(61), paradaAvisadaEm: parouEm + 21 * MIN })
  );
  check(
    esqueceu.tipo === 'encerrar' && esqueceu.motivo === 'parada' && esqueceu.fim === parouEm,
    'esqueceu de desligar: 60 min sem resposta encerra na hora do último movimento'
  );

  const respondeu = parouEm + 21 * MIN;
  const continua = respondeu + TEMPOS.continuaMs;
  check(
    decidirAutomacao(situacao({ agora: parouEm + 90 * MIN, pontos: paradoDepois(90), continuaAte: continua })).tipo === 'nada',
    '"Continua": não pergunta de novo por 2 h'
  );
  const deNovo = decidirAutomacao(
    situacao({ agora: continua + MIN, pontos: paradoDepois(150), continuaAte: continua, paradaAvisadaEm: respondeu })
  );
  check(deNovo.tipo === 'avisarParada', 'passadas as 2 h do "Continua", pergunta de novo');
  const continuaEsquecido = decidirAutomacao(
    situacao({ agora: continua + 41 * MIN, pontos: paradoDepois(190), continuaAte: continua, paradaAvisadaEm: continua + MIN })
  );
  check(
    continuaEsquecido.tipo === 'encerrar' && continuaEsquecido.fim === respondeu,
    'depois do "Continua", sem nova resposta, encerra na hora da última resposta (não perde o trabalho parado)'
  );

  // Pausa
  const pausa = parouEm + 2 * MIN;
  check(decidirAutomacao(situacao({ agora: pausa + 60 * MIN, pontos: paradoDepois(62), pausaDesde: pausa })).tipo === 'nada', 'em pausa: não pergunta da parada');
  const voltou = [...paradoDepois(30), ...andar(5, 2, parouEm + 31 * MIN, 120)];
  const retomou = decidirAutomacao(situacao({ agora: parouEm + 32 * MIN, pontos: voltou, pausaDesde: pausa }));
  check(retomou.tipo === 'retomar', 'pausa volta sozinha quando a máquina anda');
  const pausaLonga = decidirAutomacao(situacao({ agora: pausa + 3 * 60 * MIN + MIN, pontos: paradoDepois(10), pausaDesde: pausa }));
  check(
    pausaLonga.tipo === 'encerrar' && pausaLonga.motivo === 'pausa' && pausaLonga.fim === parouEm,
    'pausa de mais de 3 h encerra na hora do último movimento'
  );

  // Celular saiu da máquina: 80 km/h por 2 min num trator (máx. 40)
  const deCarro = [...trabalhou, ...andar(25, 22.2, parouEm + 5 * SEG, 130)];
  const saiu = decidirAutomacao(situacao({ agora: deCarro[deCarro.length - 1].em, pontos: deCarro }));
  // O 1º ponto do carro (10 m em 5 s) ainda é compatível com o trator: o fim é nele
  check(
    saiu.tipo === 'encerrar' && saiu.motivo === 'velocidade' && saiu.fim === parouEm + 5 * SEG,
    'velocidade de carro por 1 min: encerra no último ponto compatível'
  );
  const arrancada = [...trabalhou, ...andar(6, 22.2, parouEm + 5 * SEG, 130)];
  check(decidirAutomacao(situacao({ agora: arrancada[arrancada.length - 1].em, pontos: arrancada })).tipo === 'nada', 'pico de velocidade curto (< 1 min) não encerra');

  // Trabalho parado (TDP)
  check(
    decidirAutomacao(situacao({ estacionario: true, agora: T0 + 90 * MIN, pontos: parado(100, T0) })).tipo === 'nada',
    'trabalho parado pela TDP: não encerra nem pergunta por ficar parado'
  );
  check(
    decidirAutomacao(situacao({ estacionario: true, agora: T0 + 2 * 60 * MIN + MIN })).tipo === 'avisarParada',
    'trabalho parado: pergunta se continua a cada 2 h'
  );

  // --- Registros ---
  check(conferirAbastecimento(80, 150).tipo === 'ok', 'abastecimento dentro do tanque: ok');
  const acima = conferirAbastecimento(210, 150);
  check(acima.tipo === 'confirmar' && acima.mensagem.includes('150 L') && acima.mensagem.includes('210 L'), 'litros acima do tanque pedem confirmação');
  check(conferirAbastecimento(0, 150).tipo === 'erro', 'abastecimento sem litros é recusado');

  const agora = new Date(T0 + 10 * 60 * MIN);
  const leitura = { valorH: 1240, lidoEm: new Date(T0) };
  check(conferirHorimetro(1239, leitura, null, agora).tipo === 'erro', 'horímetro menor que a última leitura é recusado');
  check(conferirHorimetro(1260, leitura, null, agora).tipo === 'erro', 'horímetro acima do que o relógio permite é recusado');
  const estimado = horimetroEstimado({ valorH: 1240, em: new Date(T0) }, [{ inicio: new Date(T0 + MIN), fim: new Date(T0 + 7 * 60 * MIN + MIN) }], agora);
  check(perto(estimado, 1247, 0.01), 'horímetro estimado = última leitura + horas de uso no app');
  check(conferirHorimetro(1247.5, leitura, estimado, agora).tipo === 'ok', 'leitura perto do esperado: ok');
  const longe = conferirHorimetro(1241, leitura, estimado, agora);
  check(longe.tipo === 'confirmar' && longe.mensagem.includes('1.247'), 'longe do esperado: "Esperado perto de 1.247 h — confere?"');

  const problema = (podeUsar: boolean, resolvidaEm: Date | null = null) => ({ podeUsar, resolvidaEm });
  check(condicaoDaMaquina({ status: 'ativa' }, []) === 'ok', 'sem problema: ok');
  check(condicaoDaMaquina({ status: 'ativa' }, [problema(true)]) === 'atencao', 'problema que deixa usar: atenção');
  check(condicaoDaMaquina({ status: 'ativa' }, [problema(true), problema(false)]) === 'paradaPorProblema', '"não dá para usar": parada por problema');
  check(condicaoDaMaquina({ status: 'ativa' }, [problema(false, new Date())]) === 'ok', 'problema resolvido não conta');

  const sugestoes = sugestoesAoLigar([{ implementoId: 'plantadeira', atividade: 'plantio' }, { implementoId: 'grade', atividade: 'gradagem' }]);
  check(sugestoes.implementoId === 'plantadeira' && sugestoes.atividade === 'plantio', 'ao ligar, sugere implemento e atividade do último uso');

  console.log('\n🎉 AUDITORIA DE MÁQUINAS OK!\n');
}

runAuditoriaTest();
