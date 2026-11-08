import type {
  Animal,
  DosePendente,
  Reproducao,
  ReproducaoFicha,
  TipoReproducao,
  Tratamento,
  TratamentoAtivo,
} from '@/dtos';
import { diasEntre, formatDataBR, formatDiaMes, inicioDoDia } from '@/utils/date';
import { formatDecimal } from '@/utils/formatters';

/**
 * Regras de exibição da Ficha do animal (abas Resumo, Saúde e Reprodução).
 * Funções puras: recebem o que o useFichaAnimal já calculou e devolvem textos e listas.
 */

export const TIPO_REPRODUCAO_LABEL: Record<TipoReproducao, string> = {
  cobertura: 'Monta natural',
  inseminacao: 'Inseminação',
};

/** "08:00" */
export function formatHora(data: Date): string {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

/** "hoje", "amanhã", "em 283 dias", "ontem", "há 3 dias". */
export function textoEmDias(data: Date, hoje = new Date()): string {
  const dias = diasEntre(hoje, data);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  return dias > 0 ? `em ${dias} dias` : `há ${-dias} dias`;
}

/** "+12 kg em 30 dias", "-3,5 kg em 7 dias" ou "+2 kg no mesmo dia". */
export function textoDaVariacao(kg: number, dias: number): string {
  const sinal = kg > 0 ? '+' : '';
  const valor = Number.isInteger(kg) ? String(kg) : formatDecimal(kg);
  const periodo = dias === 0 ? 'no mesmo dia' : dias === 1 ? 'em 1 dia' : `em ${dias} dias`;
  return `${sinal}${valor} kg ${periodo}`;
}

// ---------------------------------------------------------------- Tratamentos

/** Tratamento de um dia só (dose única). */
export function ehDoseUnica(ativo: TratamentoAtivo): boolean {
  return ativo.tratamento.dataFim !== null && ativo.trilha.length === 1;
}

/** "Dia 3 de 14": dias com dose até hoje e o total (null = uso contínuo, sem fim). */
export function progressoDoTratamento(
  ativo: TratamentoAtivo,
  hoje = new Date()
): { atual: number; total: number | null } {
  const limite = inicioDoDia(hoje).getTime();
  const atual = ativo.trilha.filter((d) => d.dia.getTime() <= limite).length;
  return {
    atual: Math.max(atual, 1),
    total: ativo.tratamento.dataFim ? ativo.trilha.length : null,
  };
}

/** "Dia 3 de 14" ou, sem fim, "Dia 3". */
export function textoDoProgresso(ativo: TratamentoAtivo, hoje = new Date()): string {
  const { atual, total } = progressoDoTratamento(ativo, hoje);
  return total === null ? `Dia ${atual}` : `Dia ${atual} de ${total}`;
}

/** "06/11 → 19/11/2026", "Só hoje · 06/11/2026" ou "Desde 06/11/2026 · contínuo". */
export function textoDoPeriodo(tratamento: Tratamento, hoje = new Date()): string {
  const { dataInicio, dataFim } = tratamento;
  if (!dataFim) return `Desde ${formatDataBR(dataInicio)} · contínuo`;
  if (diasEntre(dataInicio, dataFim) === 0) {
    return diasEntre(hoje, dataInicio) === 0
      ? `Só hoje · ${formatDataBR(dataInicio)}`
      : formatDataBR(dataInicio);
  }
  return `${formatDiaMes(dataInicio)} → ${formatDataBR(dataFim)}`;
}

/** "2 mL por dose", "2 mL · dose única", "Dose única" ou null. */
export function textoDaDose(ativo: TratamentoAtivo): string | null {
  const { dose } = ativo.tratamento;
  if (ehDoseUnica(ativo)) return dose ? `${dose} · dose única` : 'Dose única';
  return dose ? `${dose} por dose` : null;
}

/** Horário a mostrar hoje: o próximo que ainda não passou ou, se todos passaram, o primeiro. */
function horarioDeHoje(dose: DosePendente, agora: Date): Date | null {
  return dose.horarios.find((h) => h.getTime() >= agora.getTime()) ?? dose.horarios[0] ?? null;
}

/** "Hoje, 08:00", "Amanhã, 20:00", "30/10, 08:00"; sem horário, só o dia. */
export function textoDaProximaDose(dose: DosePendente, agora = new Date()): string {
  const dias = diasEntre(agora, dose.dia);
  const dia = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : formatDiaMes(dose.dia);
  const horario = dias === 0 ? horarioDeHoje(dose, agora) : dose.horarios[0] ?? null;
  return horario ? `${dia}, ${formatHora(horario)}` : dia;
}

/** A próxima dose pendente é hoje (dá para aplicar agora). */
export function doseDeHojePendente(ativo: TratamentoAtivo): boolean {
  return ativo.hoje !== null && !ativo.hoje.confirmado;
}

/** Linha do card "Para hoje". */
export interface DoseParaHoje {
  ativo: TratamentoAtivo;
  /** "Dose das 08:00 · dia 1 de 14" ou "Dose única · 08:00" */
  detalhe: string;
}

/** Doses de hoje ainda não aplicadas, uma por tratamento. */
export function dosesParaHoje(ativos: TratamentoAtivo[], agora = new Date()): DoseParaHoje[] {
  return ativos.filter(doseDeHojePendente).map((ativo) => {
    const horario = ativo.proximaDose ? horarioDeHoje(ativo.proximaDose, agora) : null;
    const hora = horario ? formatHora(horario) : null;
    if (ehDoseUnica(ativo)) {
      return { ativo, detalhe: hora ? `Dose única · ${hora}` : 'Dose única · hoje' };
    }
    const progresso = textoDoProgresso(ativo, agora).toLowerCase();
    return { ativo, detalhe: `${hora ? `Dose das ${hora}` : 'Dose de hoje'} · ${progresso}` };
  });
}

// ----------------------------------------------------------------- Reprodução

export type SituacaoReprodutiva = 'vazia' | 'aConfirmar' | 'prenhe';

export const SITUACAO_REPRODUTIVA_LABEL: Record<SituacaoReprodutiva, string> = {
  vazia: 'Vazia',
  aConfirmar: 'Prenhez a confirmar',
  prenhe: 'Prenhe',
};

/** Vazia (sem cobertura em aberto), prenhez a confirmar ou prenhe. */
export function situacaoReprodutiva({ coberturaAberta }: ReproducaoFicha): SituacaoReprodutiva {
  if (!coberturaAberta) return 'vazia';
  return coberturaAberta.prenhezConfirmada ? 'prenhe' : 'aConfirmar';
}

/** "Valente · #900", o texto do touro de fora/sêmen, ou null se não foi informado. */
export function nomeDoTouro(cobertura: Reproducao, touros: Animal[]): string | null {
  const touro = touros.find((animal) => animal.id === cobertura.touroId);
  if (touro) return touro.nome ? `${touro.nome} · ${touro.brinco}` : touro.brinco;
  return cobertura.touroDescricao?.trim() || null;
}

/** Um ponto da linha do tempo da reprodução. */
export interface EventoReprodutivo {
  chave: string;
  /** Linha pequena de cima: "06/11/2026 · hoje", "A fazer"... */
  rotulo: string;
  titulo: string;
  detalhe: string | null;
  /** Já aconteceu (bolinha cheia) ou ainda vai acontecer (vazada) */
  feito: boolean;
  /** Cobertura em aberto sem touro: mostra "Informar" */
  informarTouroDe?: string;
}

/** "06/11/2026 · hoje" para hoje; nos outros dias, só a data. */
function rotuloDaData(data: Date, hoje: Date): string {
  return diasEntre(hoje, data) === 0 ? `${formatDataBR(data)} · hoje` : formatDataBR(data);
}

export interface DadosLinhaDoTempo {
  reproducao: ReproducaoFicha;
  /** Coberturas e inseminações (qualquer ordem) */
  reproducoes: Reproducao[];
  /** Crias cadastradas (o nascimento é o parto) */
  crias: Animal[];
  /** Machos do rebanho, para o nome do touro */
  touros: Animal[];
}

/**
 * Linha do tempo da reprodução, da mais antiga para a mais nova: coberturas
 * (com o resultado), partos (pelas crias) e, se há cobertura em aberto, os
 * próximos passos: diagnóstico de prenhez e parto previsto.
 */
export function linhaDoTempoReprodutiva(
  { reproducao, reproducoes, crias, touros }: DadosLinhaDoTempo,
  hoje = new Date()
): EventoReprodutivo[] {
  const { coberturaAberta, previsaoParto } = reproducao;
  const passados: { data: Date; evento: EventoReprodutivo }[] = [];

  for (const r of reproducoes) {
    const aberta = r.id === coberturaAberta?.id;
    const touro = nomeDoTouro(r, touros);
    let detalhe: string | null;
    if (aberta) detalhe = `Touro: ${touro ?? 'não informado'}`;
    else if (r.prenhezConfirmada === false) detalhe = 'Não pegou';
    else detalhe = touro ? `Touro: ${touro}` : null;

    passados.push({
      data: r.data,
      evento: {
        chave: `cobertura-${r.id}`,
        rotulo: rotuloDaData(r.data, hoje),
        titulo: TIPO_REPRODUCAO_LABEL[r.tipo],
        detalhe,
        feito: true,
        informarTouroDe: aberta && !touro ? r.id : undefined,
      },
    });
  }

  for (const cria of crias) {
    if (!cria.dataNascimento) continue;
    passados.push({
      data: cria.dataNascimento,
      evento: {
        chave: `parto-${cria.id}`,
        rotulo: rotuloDaData(cria.dataNascimento, hoje),
        titulo: 'Parto',
        detalhe: `Cria ${cria.nome ? `${cria.nome} · ${cria.brinco}` : cria.brinco}`,
        feito: true,
      },
    });
  }

  const eventos: EventoReprodutivo[] = passados
    .sort((a, b) => a.data.getTime() - b.data.getTime())
    .map(({ evento }) => evento);

  if (coberturaAberta) {
    const prenhe = coberturaAberta.prenhezConfirmada === true;
    eventos.push({
      chave: 'diagnostico',
      rotulo: prenhe ? 'Feito' : 'A fazer',
      titulo: 'Diagnóstico de prenhez',
      detalhe: prenhe ? 'Prenhe' : 'Aguardando resultado',
      feito: prenhe,
    });
    if (previsaoParto) {
      const atrasado = diasEntre(hoje, previsaoParto) < 0;
      eventos.push({
        chave: 'parto-previsto',
        rotulo: formatDataBR(previsaoParto),
        titulo: atrasado ? 'Parto atrasado' : 'Parto previsto',
        detalhe: textoEmDias(previsaoParto, hoje),
        feito: false,
      });
    }
  }

  return eventos;
}
