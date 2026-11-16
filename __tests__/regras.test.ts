import type { Animal, ControleLeiteiro, Pesagem, Reproducao, Tratamento, TratamentoAtivo } from '@/dtos';
import type { DadosAlerta } from '@/dtos';
import { alertaPrincipal } from '@/features/rebanho/services/alertas';
import { buscarAnimais } from '@/features/rebanho/services/busca';
import { conteudoQrAnimal, lerQrAnimal } from '@/features/rebanho/services/qrCode';
import {
  chaveDoBrinco,
  encontrarPorBrinco,
  numerosLidos,
} from '@/features/rebanho/services/leituraBrinco';
import { areaNaFoto, larguraParaLeitura } from '@/services/fotos/recorte';
import { htmlDaEtiqueta, svgDoQrCode } from '@/services/qrcode/etiquetaQrCode';
import { create as criarQrCode } from 'qrcode';
import { diasComDose, proximaDosePendente } from '@/features/rebanho/services/doses';
import {
  dosesParaHoje,
  ehDoseUnica,
  linhaDoTempoReprodutiva,
  situacaoReprodutiva,
  textoDaDose,
  textoDaProximaDose,
  textoDaVariacao,
  textoDoPeriodo,
  textoDoProgresso,
} from '@/features/rebanho/services/ficha';
import { historicoDeLeite } from '@/features/rebanho/services/leite';
import {
  calcularFase,
  calcularSituacaoLeite,
  dataNascimentoPorIdade,
  emIdadeReprodutiva,
  formatarIdade,
  idadeEmMeses,
} from '@/features/rebanho/services/fase';
import {
  calcularPesoAtual,
  calcularPrevisaoParto,
  carenciaAte,
  fimDaCarencia,
  historicoDePeso,
} from '@/features/rebanho/services/indicadores';
import { formatDataBR } from '@/utils/date';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

const HOJE = new Date(2026, 9, 24); // 24/10/2026
const mesesAtras = (meses: number) => dataNascimentoPorIdade(meses, HOJE);
const dia = (d: number, m: number, a = 2026) => new Date(a, m - 1, d);

function tratamento(parcial: Partial<Tratamento>): Tratamento {
  return {
    id: 't',
    animalId: 'a',
    medicamento: 'Remédio',
    dose: null,
    dataInicio: dia(1, 10),
    dataFim: null,
    diasSemana: [1, 2, 3, 4, 5, 6, 7],
    horario: null,
    intervaloHoras: null,
    avisoMinutosAntes: 0,
    notificacaoAtiva: true,
    carenciaLeiteDias: null,
    carenciaCarneDias: null,
    observacoes: null,
    grupoAplicacaoId: null,
    comprovanteUri: null,
    fazendaId: 'f',
    createdBy: null,
    deletedAt: null,
    createdAt: HOJE,
    updatedAt: HOJE,
    ...parcial,
  };
}

function pesagem(data: Date, pesoKg: number): Pesagem {
  return { id: String(data.getTime()), animalId: 'a', data, pesoKg, metodo: 'balanca', fazendaId: 'f', createdBy: null, deletedAt: null, createdAt: data, updatedAt: data };
}

function controle(data: Date, litros: number): ControleLeiteiro {
  return { id: String(data.getTime()), animalId: 'a', data, litros, fazendaId: 'f', createdBy: null, deletedAt: null, createdAt: data, updatedAt: data };
}

console.log('=========================================================');
console.log('🐄 MINHA FAZENDA - REGRAS DO REBANHO');
console.log('=========================================================\n');

// Fase
const fase = (
  sexo: 'F' | 'M',
  meses: number | null,
  ultimoParto: Date | null = null,
  jaPariu?: boolean
) =>
  calcularFase(
    { sexo, dataNascimento: meses === null ? null : mesesAtras(meses), ultimoParto, jaPariu },
    HOJE
  );
check(fase('F', 11) === 'bezerra', 'fêmea com 11 meses é bezerra');
check(fase('F', 12) === 'novilha', 'fêmea com 12 meses é novilha');
check(fase('F', 23) === 'novilha', 'fêmea com 23 meses sem parto é novilha');
check(fase('F', 20, dia(1, 9)) === 'vaca', 'fêmea com cria registrada é vaca');
check(fase('F', 30, null, true) === 'vaca', 'fêmea com ja_pariu = true é vaca (comprada já parida)');
check(fase('F', 30) === 'novilha', 'fêmea de 30 meses sem parto e sem ja_pariu é novilha');
check(fase('F', 30, null, false) === 'novilha', 'ja_pariu = false não muda a regra');
check(fase('F', 8, null, true) === 'vaca', 'o parto decide antes da idade');
check(fase('F', null) === 'novilha', 'fêmea sem idade e sem parto é novilha (adulta que não pariu)');
check(fase('F', null, null, true) === 'vaca', 'fêmea sem idade que já pariu é vaca');
check(fase('M', 6) === 'bezerro', 'macho com 6 meses é bezerro');
check(fase('M', 18) === 'garrote', 'macho com 18 meses é garrote');
check(fase('M', 30) === 'touro', 'macho com 30 meses é touro');
check(fase('M', null) === 'touro', 'macho sem idade é tratado como adulto');

// Lactação
check(
  calcularSituacaoLeite('vaca', dia(1, 6), true, HOJE) === 'lactacao',
  'vaca com parto há menos de 305 dias está em lactação'
);
check(
  calcularSituacaoLeite('vaca', dia(1, 6, 2025), true, HOJE) === 'seca',
  'vaca com parto há mais de 305 dias está seca'
);
check(calcularSituacaoLeite('vaca', null, true, HOJE) === 'seca', 'vaca sem parto registrado está seca');
check(
  calcularSituacaoLeite('vaca', dia(1, 6), false, HOJE) === null,
  'lactação não aparece em fazenda de corte'
);
check(calcularSituacaoLeite('novilha', null, true, HOJE) === null, 'lactação só vale para vaca');

check(emIdadeReprodutiva('F', 'novilha') && !emIdadeReprodutiva('F', 'bezerra'), 'fêmea reprodutiva: novilha sim, bezerra não');
check(!emIdadeReprodutiva('M', 'touro'), 'macho não registra parto');

// Idade
check(idadeEmMeses(dia(25, 9), HOJE) === 0, 'idade em meses completos (ainda não fez 1 mês)');
check(idadeEmMeses(dia(24, 9), HOJE) === 1, 'idade em meses completos (fez 1 mês hoje)');
check(formatarIdade(mesesAtras(8), HOJE) === '8 meses', 'idade "8 meses"');
check(formatarIdade(mesesAtras(24), HOJE) === '2 anos', 'idade "2 anos"');
check(formatarIdade(mesesAtras(15), HOJE) === '1 ano e 3 meses', 'idade "1 ano e 3 meses"');

// Peso atual e ganho
const peso = calcularPesoAtual([pesagem(dia(1, 9), 180), pesagem(dia(1, 10), 205.5), pesagem(dia(1, 8), 160)]);
check(peso?.pesoKg === 205.5, 'peso atual é a última pesagem');
check(peso?.ganhoKg === 25.5 && peso?.diasDesdeAnterior === 30, 'ganho desde a pesagem anterior (+25,5 kg em 30 dias)');
check(calcularPesoAtual([pesagem(dia(1, 10), 100)])?.ganhoKg === null, 'primeira pesagem não tem ganho');
check(calcularPesoAtual([]) === null, 'sem pesagens não há peso atual');

// Histórico de peso: métricas do período todo (1/8 160 kg → 1/9 180 kg → 1/10 205,5 kg)
const historico = historicoDePeso([pesagem(dia(1, 9), 180), pesagem(dia(1, 10), 205.5), pesagem(dia(1, 8), 160)]);
check(historico.linhas.map((l) => l.pesagem.pesoKg).join(',') === '205.5,180,160', 'histórico da mais recente para a mais antiga');
check(historico.linhas[0].variacaoKg === 25.5 && historico.linhas[0].dias === 30, 'cada pesagem tem a variação desde a anterior');
check(historico.linhas[2].variacaoKg === null, 'a primeira pesagem não tem variação');
check(historico.ganhoTotalKg === 45.5 && historico.periodoDias === 61, 'ganho total da primeira à última: +45,5 kg em 61 dias');
check(historico.gmdKg === 0.75, 'GMD = 45,5 kg / 61 dias = 0,75 kg/dia');
check(historicoDePeso([pesagem(dia(1, 10), 100)]).gmdKg === null, 'com uma pesagem só não há GMD');
check(
  historicoDePeso([pesagem(dia(1, 10), 100), pesagem(dia(1, 10), 102)]).gmdKg === null,
  'duas pesagens no mesmo dia não dão GMD (divisão por zero)'
);

// Histórico de leite (mesmo jeito do peso): 14/9 22 L → 10/10 18 L → 17/10 19,5 L; hoje 24/10
const leite = historicoDeLeite(
  [controle(dia(10, 10), 18), controle(dia(17, 10), 19.5), controle(dia(14, 9), 22)],
  HOJE
);
check(leite.linhas.map((l) => l.controle.litros).join(',') === '19.5,18,22', 'registros de leite do mais recente para o mais antigo');
check(
  leite.linhas[0].variacaoL === 1.5 && leite.linhas[0].dias === 7 && leite.linhas[1].variacaoL === -4,
  'cada registro de leite tem a variação desde o anterior (+1,5 L em 7 dias; -4 L)'
);
check(leite.linhas[2].variacaoL === null && leite.linhas[2].dias === null, 'o primeiro registro de leite não tem variação');
check(leite.ultimoLitros === 19.5, 'último registro de leite: 19,5 L');
check(leite.media30Dias === 18.8, 'média de 30 dias só com os registros da janela: (18 + 19,5) / 2 = 18,8 L');
const semLeite = historicoDeLeite([], HOJE);
check(
  semLeite.linhas.length === 0 && semLeite.ultimoLitros === null && semLeite.media30Dias === null,
  'sem registro de leite não há último nem média'
);
check(textoDaVariacao(1.5, 7, 'L') === '+1,5 L em 7 dias', 'variação do leite em litros: "+1,5 L em 7 dias"');
check(textoDaVariacao(-3.5, 7) === '-3,5 kg em 7 dias', 'variação do peso continua em kg');

// Previsão de parto
check(formatDataBR(calcularPrevisaoParto(dia(1, 1))) === '11/10/2026', 'previsão de parto = cobertura + 283 dias');

// Carência
// Dose única = fim igual ao início
const comCarencia = tratamento({ dataInicio: dia(20, 10), dataFim: dia(20, 10), carenciaLeiteDias: 3, carenciaCarneDias: 10 });
check(formatDataBR(fimDaCarencia(comCarencia, true)!) === '30/10/2026', 'carência usa o maior prazo (carne 10 dias)');
const soLeite = tratamento({ dataInicio: dia(20, 10), dataFim: dia(20, 10), carenciaLeiteDias: 5 });
check(fimDaCarencia(soLeite, false) === null, 'carência no leite é ignorada em fazenda de corte');
check(formatDataBR(fimDaCarencia(soLeite, true)!) === '25/10/2026', 'carência no leite conta em fazenda de leite');
const comFim = tratamento({ dataInicio: dia(10, 10), dataFim: dia(15, 10), carenciaCarneDias: 7 });
check(formatDataBR(fimDaCarencia(comFim, false)!) === '22/10/2026', 'carência conta a partir da última aplicação');
check(carenciaAte([comFim], false, HOJE) === null, 'carência vencida não gera alerta');
check(
  formatDataBR(carenciaAte([comFim, comCarencia, soLeite], true, HOJE)!) === '30/10/2026',
  'alerta mostra a carência mais longa ainda ativa'
);
check(
  carenciaAte([tratamento({ dataInicio: dia(14, 10), dataFim: dia(14, 10), carenciaCarneDias: 10 })], false, HOJE) !== null,
  'último dia da carência (hoje) ainda está em carência'
);
const continuo = tratamento({ id: 'c', dataInicio: dia(1, 10), carenciaCarneDias: 5 });
check(formatDataBR(fimDaCarencia(continuo, false, [], HOJE)!) === '29/10/2026', 'sem fim e sem confirmação: conta de hoje (ainda em uso)');
check(
  formatDataBR(fimDaCarencia(continuo, false, [dia(10, 10), dia(12, 10)], HOJE)!) === '17/10/2026',
  'com doses confirmadas: conta da última dose aplicada'
);
const comHorario = tratamento({ dataInicio: dia(20, 10), dataFim: dia(20, 10), horario: '06:00', intervaloHoras: 12, carenciaCarneDias: 2 });
const fimComHora = fimDaCarencia(comHorario, false, [dia(20, 10)], HOJE)!;
check(fimComHora.getDate() === 22 && fimComHora.getHours() === 18, 'fim da carência no horário da última dose do dia (18h)');
check(fimDaCarencia(tratamento({ dataInicio: dia(30, 10), carenciaCarneDias: 5 }), false, [], HOJE) === null, 'tratamento que não começou não gera carência');
check(
  carenciaAte([continuo], false, HOJE, [{ tratamentoId: 'c', dia: dia(10, 10) }]) === null,
  'carenciaAte usa as doses confirmadas do tratamento'
);

// Alerta principal (24/10/2026 é sábado)
const AGORA = new Date(2026, 9, 24, 10, 0);
const alerta = (parcial: Partial<DadosAlerta>) =>
  alertaPrincipal(
    {
      animal: { dataNascimento: mesesAtras(60) },
      fase: 'vaca',
      tratamentos: [],
      dosesConfirmadas: [],
      coberturaAberta: null,
      produzLeite: true,
      ...parcial,
    },
    AGORA
  );
const remedio = (parcial: Partial<Tratamento>) =>
  tratamento({ id: 'd', medicamento: 'Antibiótico', dataInicio: dia(20, 10), ...parcial });

check(alerta({}) === null, 'sem nada pendente, sem alerta');
const emCarencia = alerta({
  tratamentos: [remedio({ horario: '06:00', carenciaLeiteDias: 3 })],
  coberturaAberta: { previsaoParto: dia(30, 10) },
});
check(emCarencia?.tipo === 'carencia' && emCarencia.texto === 'Em carência até 27/10', 'carência vem antes de dose e parto');
check(
  alerta({ tratamentos: [remedio({ horario: '06:00', intervaloHoras: 8 })] })?.texto === 'Dose pendente: Antibiótico 14:00',
  'dose pendente mostra o próximo horário do dia (06, 14, 22 → 14:00)'
);
check(alerta({ tratamentos: [remedio({})] })?.texto === 'Dose de hoje: Antibiótico', 'dose sem horário: "Dose de hoje"');
check(
  alerta({ tratamentos: [remedio({ horario: '06:00' })] })?.texto === 'Dose pendente: Antibiótico 06:00',
  'horário já passado continua pendente até confirmar'
);
check(
  alerta({ tratamentos: [remedio({})], dosesConfirmadas: [{ tratamentoId: 'd', dia: dia(24, 10) }] }) === null,
  'dose de hoje confirmada não gera alerta'
);
check(alerta({ tratamentos: [remedio({ diasSemana: [2, 4, 6] })] }) === null, 'sábado fora da agenda seg/qua/sex não tem dose');
check(
  alerta({ tratamentos: [remedio({})], coberturaAberta: { previsaoParto: dia(30, 10) } })?.tipo === 'dose',
  'dose vem antes do parto'
);
check(alerta({ coberturaAberta: { previsaoParto: dia(8, 11) } })?.texto === 'Parto previsto 08/11', 'parto previsto em até 15 dias');
check(alerta({ coberturaAberta: { previsaoParto: dia(9, 11) } }) === null, 'parto a mais de 15 dias não gera alerta');
check(alerta({ coberturaAberta: { previsaoParto: dia(20, 10) } })?.texto === 'Parto atrasado', 'previsão vencida: parto atrasado');
check(
  alerta({ fase: 'novilha', animal: { dataNascimento: mesesAtras(31) } })?.texto === 'Novilha com mais de 30 meses sem parto',
  'novilha com 31 meses sem parto gera alerta'
);
check(alerta({ fase: 'novilha', animal: { dataNascimento: mesesAtras(30) } }) === null, 'novilha com 30 meses ainda não');

// Busca do rebanho (nome, brinco ou raça)
const rebanhoBusca = [
  { id: 'mimosa', brinco: '#101', nome: 'Mimosa', raca: 'Girolando' },
  { id: 'estrela', brinco: '#301', nome: 'Estrela', raca: 'Gir' },
  { id: 'sem-nome', brinco: '#1010', nome: null, raca: 'Holandesa' },
  { id: 'jurema', brinco: '#55', nome: 'Jurema', raca: 'Guzerá' },
  { id: 'valente', brinco: '#900', nome: 'Valente', raca: null },
];
const idsDaBusca = (termo: string) => buscarAnimais(rebanhoBusca, termo).map((a) => a.id).join(',');

check(idsDaBusca('') === 'mimosa,estrela,sem-nome,jurema,valente', 'busca vazia devolve o rebanho todo, na ordem');
check(idsDaBusca('   ') === idsDaBusca(''), 'busca só com espaços conta como vazia');
check(idsDaBusca('#') === idsDaBusca(''), 'só "#" conta como vazia');
check(idsDaBusca('101') === 'mimosa,sem-nome', 'brinco sem "#" acha o exato primeiro e depois os que começam igual');
check(idsDaBusca('#101') === idsDaBusca('101'), '"#101" e "101" buscam o mesmo brinco');
check(idsDaBusca('MIMOSA') === 'mimosa', 'nome sem diferenciar maiúsculas');
check(idsDaBusca('guzera') === 'jurema', 'raça sem diferenciar acentos');
check(idsDaBusca('gir') === 'mimosa,estrela', 'raça: acha "Gir" e "Girolando"');
check(idsDaBusca('lente') === 'valente', 'parte do nome também acha');
check(idsDaBusca('zebu') === '', 'termo que não combina não acha ninguém');

// Ficha: tratamentos (HOJE = 24/10/2026, meia-noite)
function ativoDe(t: Tratamento, confirmados: Date[] = []): TratamentoAtivo {
  const feitos = new Set(confirmados.map((d) => d.getTime()));
  const trilha = diasComDose(t, HOJE).map((d) => ({
    ...d,
    confirmado: feitos.has(d.dia.getTime()),
    futuro: d.dia.getTime() > HOJE.getTime(),
  }));
  return {
    tratamento: t,
    trilha,
    hoje: trilha.find((d) => d.dia.getTime() === HOJE.getTime()) ?? null,
    proximaDose: proximaDosePendente(t, confirmados, HOJE),
  };
}

const quatorzeDias = ativoDe(
  tratamento({ id: 'aftosa', medicamento: 'Febre aftosa', dose: '2 mL', dataInicio: dia(24, 10), dataFim: dia(6, 11), horario: '08:00' })
);
check(textoDoProgresso(quatorzeDias, HOJE) === 'Dia 1 de 14', 'tratamento de 14 dias começando hoje: "Dia 1 de 14"');
check(textoDoPeriodo(quatorzeDias.tratamento, HOJE) === '24/10 → 06/11/2026', 'período: "24/10 → 06/11/2026"');
check(textoDaDose(quatorzeDias) === '2 mL por dose', 'dose de vários dias: "2 mL por dose"');
check(
  dosesParaHoje([quatorzeDias], HOJE)[0]?.detalhe === 'Dose das 08:00 · dia 1 de 14',
  'Para hoje: "Dose das 08:00 · dia 1 de 14"'
);

const unica = ativoDe(
  tratamento({ id: 'clostridioses', dose: '2 mL', dataInicio: dia(24, 10), dataFim: dia(24, 10), horario: '08:00' })
);
check(ehDoseUnica(unica), 'início e fim no mesmo dia é dose única');
check(textoDaDose(unica) === '2 mL · dose única', 'dose única: "2 mL · dose única"');
check(textoDoPeriodo(unica.tratamento, HOJE) === 'Só hoje · 24/10/2026', 'dose única hoje: "Só hoje · 24/10/2026"');
check(dosesParaHoje([unica], HOJE)[0]?.detalhe === 'Dose única · 08:00', 'Para hoje: "Dose única · 08:00"');

const jaAplicada = ativoDe(tratamento({ dataInicio: dia(24, 10), dataFim: dia(30, 10) }), [dia(24, 10)]);
check(dosesParaHoje([jaAplicada], HOJE).length === 0, 'dose de hoje aplicada sai do "Para hoje"');

const usoContinuo = ativoDe(tratamento({ dataInicio: dia(22, 10), dataFim: null, horario: '20:00' }));
check(textoDoProgresso(usoContinuo, HOJE) === 'Dia 3', 'uso contínuo: só "Dia 3", sem total');
check(textoDoPeriodo(usoContinuo.tratamento, HOJE) === 'Desde 22/10/2026 · contínuo', 'uso contínuo: "Desde 22/10/2026 · contínuo"');
check(
  textoDaProximaDose({ indice: 4, dia: dia(25, 10), horarios: [new Date(2026, 9, 25, 20, 0)] }, HOJE) === 'Amanhã, 20:00',
  'próxima dose amanhã: "Amanhã, 20:00"'
);

// Ficha: reprodução
function cobertura(parcial: Partial<Reproducao>): Reproducao {
  return {
    id: 'cob',
    animalId: 'a',
    tipo: 'cobertura',
    data: HOJE,
    prenhezConfirmada: null,
    previsaoParto: null,
    dataParto: null,
    criaId: null,
    touroId: null,
    touroDescricao: null,
    dataDiagnostico: null,
    metodoDiagnostico: null,
    dataAborto: null,
    fazendaId: 'f',
    createdBy: null,
    deletedAt: null,
    createdAt: HOJE,
    updatedAt: HOJE,
    ...parcial,
  };
}

const aberta = cobertura({});
check(situacaoReprodutiva({ coberturaAberta: null, previsaoParto: null }) === 'vazia', 'sem cobertura em aberto: vazia');
check(situacaoReprodutiva({ coberturaAberta: aberta, previsaoParto: null }) === 'aConfirmar', 'cobertura sem diagnóstico: prenhez a confirmar');
check(
  situacaoReprodutiva({ coberturaAberta: cobertura({ prenhezConfirmada: true }), previsaoParto: null }) === 'prenhe',
  'prenhez confirmada: prenhe'
);

const criaAntiga = {
  id: 'cria',
  brinco: '#50',
  nome: null,
  dataNascimento: dia(1, 3),
} as Animal;
const linha = linhaDoTempoReprodutiva(
  {
    reproducao: { coberturaAberta: aberta, previsaoParto: dia(3, 8, 2027) },
    reproducoes: [aberta],
    crias: [criaAntiga],
    touros: [],
  },
  HOJE
);
check(
  linha.map((e) => e.titulo).join(' > ') === 'Parto > Monta natural > Diagnóstico de prenhez > Parto previsto',
  'linha do tempo: parto antigo, cobertura, diagnóstico e parto previsto, em ordem'
);
check(linha[1].rotulo === '24/10/2026 · hoje' && linha[1].informarTouroDe === 'cob', 'cobertura de hoje sem touro pede "Informar"');
check(linha[1].detalhe === 'Touro: não informado', 'touro não informado aparece no detalhe');
check(linha[2].rotulo === 'A fazer' && !linha[2].feito, 'diagnóstico pendente: "A fazer"');
check(linha[3].detalhe === 'em 283 dias', 'parto previsto: "em 283 dias"');

// QR Code do animal
const qr = conteudoQrAnimal('abc-123');
check(qr === 'minhafazenda://animal/abc-123', 'QR do animal é o link do app para a ficha');
const lidoId = lerQrAnimal(` ${qr} `);
check(lidoId?.tipo === 'id' && lidoId.id === 'abc-123', 'link do app vira o id do animal');
const lidoBrinco = lerQrAnimal('104');
check(lidoBrinco?.tipo === 'brinco' && lidoBrinco.brinco === '#104', 'número curto vira brinco com "#" ("104" → "#104")');
check(lerQrAnimal('minhafazenda://maquina/xyz') === null, 'link de máquina não é de animal');
check(lerQrAnimal('https://exemplo.com/qualquer coisa') === null, 'link de fora não é de animal');
check(lerQrAnimal('minhafazenda://animal/') === null, 'link sem id não é de animal');

// Leitura do número do brinco por foto (OCR)
const lidosDe = (...textos: string[]) => numerosLidos(textos);
check(lidosDe('BR 104').includes('104'), 'tira o número do meio do texto ("BR 104" → 104)');
check(lidosDe('1O4').includes('104'), 'letra O lida no lugar de zero vira 0 ("1O4" → 104)');
check(lidosDe('I05').includes('105') && lidosDe('S8').includes('58'), 'I vira 1 e S vira 5');
check(lidosDe('SOL', 'FAZENDA').length === 0, 'palavra sem dígitos não vira número ("SOL" não é 501)');
check(lidosDe('076 1234').includes('761234'), 'número quebrado por espaço é juntado ("076 1234")');
check(lidosDe('0104').includes('104'), 'zeros à esquerda não contam');
check(chaveDoBrinco('#BR-0104') === '104' && chaveDoBrinco('#ABC') === null, 'chave do brinco: só os dígitos, sem zeros à esquerda');

const rebanhoOcr = [
  { id: 'b101', brinco: '#101' },
  { id: 'b104', brinco: '#104' },
  { id: 'b1040', brinco: '#1040' },
  { id: 'b900', brinco: '#900' },
  { id: 'b12', brinco: '#12' },
  { id: 'b13', brinco: '#13' },
];
const ocr = (...textos: string[]) => {
  const r = encontrarPorBrinco(rebanhoOcr, textos);
  return { exatos: r.exatos.map((a) => a.id).join(','), parecidos: r.parecidos.map((a) => a.id).join(','), melhor: r.melhorLido };
};
check(ocr('104').exatos === 'b104', 'número exato acha o animal (104 não confunde com 1040)');
check(ocr('BR-1O4').exatos === 'b104', 'texto sujo do brinco ainda acha o exato');
check(ocr('0104').exatos === 'b104', 'zero à esquerda lido acha o brinco');
check(ocr('FAZENDA BOA VISTA', '900').exatos === 'b900', 'ignora o texto ao redor e acha o 900');
check(ocr('12104').exatos === '' && ocr('12104').parecidos.startsWith('b104'), 'prefixo da fazenda antes do número: sugere o 104');
const umDigitoErrado = ocr('105');
check(umDigitoErrado.exatos === '' && umDigitoErrado.parecidos === 'b101,b104', 'um dígito lido errado: sugere os parecidos (101 e 104)');
check(ocr('14').parecidos === 'b104', 'um dígito faltando na leitura: "14" sugere o 104');
check(ocr('17').parecidos === '' && ocr('17').melhor === '17', 'brinco curto não tem parecido (12 e 13 são outros animais); vai para digitar com 17');
check(ocr().melhor === null && ocr().exatos === '', 'foto sem texto: nada encontrado');
check(
  encontrarPorBrinco([...rebanhoOcr, { id: 'outro104', brinco: '104' }], ['104']).exatos.length === 2,
  'dois animais com o mesmo número: os dois aparecem para escolher'
);
check(lidosDe('10A').includes('104'), 'A lido no lugar de 4 vira 4 ("10A" → 104)');
check(ocr('BR 12 104').exatos === 'b104,b12', 'dois brincos exatos na mesma leitura: os dois, o mais comprido primeiro');
check(ocr('BR 12 104', '104').exatos === 'b104', 'o número lido nos dois recortes vence a sujeira lida num só');
check(numerosLidos(['7 12', '12']).at(0) === '12', 'número mais lido vem primeiro');
check(ocr('12', '904', '12').melhor === '12', 'melhor leitura é a mais votada, não a mais comprida');
check(ocr('908').parecidos.startsWith('b900'), 'dígito parecido trocado (0/8) sugere o brinco');
check(ocr('988').parecidos === '', 'número curto com duas trocas já é outro animal');
const rebanhoSisbov = [
  { id: 'longo', brinco: '#123456' },
  { id: 'outro', brinco: '#123457' },
];
const sisbov = encontrarPorBrinco(rebanhoSisbov, ['076 3512 3456 9']);
check(sisbov.exatos.length === 0 && sisbov.parecidos[0]?.id === 'longo', 'brinco no meio do código SISBOV é sugerido');
check(
  encontrarPorBrinco(rebanhoSisbov, ['123468']).parecidos.map((a) => a.id).join(',') === 'longo',
  'número longo aceita duas trocas de dígitos parecidos (5/6 e 6/8 em 123456)'
);
check(ocr('104', '12').exatos === 'b104,b12', 'empate de votos: os dois para escolher, o mais comprido primeiro');

// Recorte do visor na foto (leitura de texto)
const foto = { width: 3000, height: 4000 };
const telaCamera = { width: 400, height: 800 };
const visorCamera = { x: 50, y: 325, width: 300, height: 150 };
const area = areaNaFoto(foto, telaCamera, visorCamera);
check(
  area?.x === 750 && area.y === 1625 && area.width === 1500 && area.height === 750,
  'visor da tela vira a mesma área na foto (prévia cobrindo a tela)'
);
const comFolga = areaNaFoto(foto, telaCamera, visorCamera, 0.6);
check(
  comFolga !== null && comFolga.x === 0 && comFolga.width === 3000 && comFolga.y === 1175,
  'folga aumenta o recorte sem sair da foto'
);
check(areaNaFoto({ width: 4000, height: 3000 }, telaCamera, visorCamera) === null, 'foto deitada com a tela em pé: lê a foto inteira');
check(areaNaFoto(foto, telaCamera, { x: 0, y: 0, width: 2, height: 2 }) === null, 'visor minúsculo: lê a foto inteira');
check(
  larguraParaLeitura(600) === 1280 && larguraParaLeitura(1500) === null && larguraParaLeitura(5000) === 2048,
  'recorte é ampliado ou reduzido para o tamanho que o leitor lê melhor'
);

// Etiqueta do QR Code em PDF (QR vetorial)
const linkAnimal = conteudoQrAnimal('3f2a9c1e-7b4d-4e8a-9f10-2c3d4e5f6a7b');
const svgQr = svgDoQrCode(linkAnimal);
const matrizQr = criarQrCode(linkAnimal, { errorCorrectionLevel: 'M' }).modules;
const ladoSvg = Number(/viewBox="0 0 (\d+) \1"/.exec(svgQr)?.[1]);
check(ladoSvg === matrizQr.size + 8, 'SVG do QR tem a margem branca de 4 módulos em cada lado');
const desenhado = new Set<string>();
for (const [, x, y, largura] of svgQr.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
  for (let i = 0; i < Number(largura); i++) desenhado.add(`${Number(y) - 4},${Number(x) - 4 + i}`);
}
let modulosIguais = true;
for (let linha = 0; linha < matrizQr.size; linha++) {
  for (let coluna = 0; coluna < matrizQr.size; coluna++) {
    if (Boolean(matrizQr.get(linha, coluna)) !== desenhado.has(`${linha},${coluna}`)) modulosIguais = false;
  }
}
check(modulosIguais, 'SVG desenha exatamente os módulos escuros do QR Code');
const etiqueta = htmlDaEtiqueta({ conteudo: linkAnimal, titulo: '#104', subtitulo: 'Mimosa <b>&</b>' });
check(etiqueta.includes(svgQr) && etiqueta.includes('#104'), 'etiqueta leva o QR vetorial e o brinco');
check(
  etiqueta.includes('Mimosa &lt;b&gt;&amp;&lt;/b&gt;') && !etiqueta.includes('<b>'),
  'nome do animal é escapado no HTML da etiqueta'
);
check(
  !htmlDaEtiqueta({ conteudo: linkAnimal, titulo: '#104', subtitulo: null }).includes('class="subtitulo"'),
  'sem nome, a etiqueta não tem a linha do subtítulo'
);
check(etiqueta.includes('width: 5cm; height: 5cm'), 'QR impresso com 5 cm de lado');

console.log('\n🎉 TODAS AS REGRAS PASSARAM!\n');
