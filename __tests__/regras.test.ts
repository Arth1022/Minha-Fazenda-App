import type { Pesagem, Tratamento } from '@/dtos';
import type { DadosAlerta } from '@/dtos';
import { alertaPrincipal } from '@/features/rebanho/services/alertas';
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
    diasConfirmados: [],
    proximaDoseEm: null,
    diasSemana: [1, 2, 3, 4, 5, 6, 7],
    horario: null,
    intervaloHoras: null,
    avisoMinutosAntes: 0,
    notificacaoAtiva: true,
    carenciaLeiteDias: null,
    carenciaCarneDias: null,
    grupoAplicacaoId: null,
    criadoPor: null,
    createdAt: HOJE,
    updatedAt: HOJE,
    ...parcial,
  };
}

function pesagem(data: Date, pesoKg: number): Pesagem {
  return { id: String(data.getTime()), animalId: 'a', data, pesoKg, criadoPor: null, createdAt: data, updatedAt: data };
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

console.log('\n🎉 TODAS AS REGRAS PASSARAM!\n');
