import type { UsoDoDia, UsoMaquina } from '@/dtos';
import { adicionarDias, inicioDoDia } from '@/utils/date';

type Intervalo = Pick<UsoMaquina, 'inicio' | 'fim'>;

const MS_POR_MINUTO = 60 * 1000;
const MS_POR_HORA = 60 * MS_POR_MINUTO;

/** Dias mostrados no gráfico de uso da ficha. */
export const DIAS_DA_SEMANA_DE_USO = 7;

/** Fim efetivo do uso: o registrado ou, ainda ligada, o momento atual. */
function fimEfetivo(uso: Intervalo, agora: Date): number {
  return (uso.fim ?? agora).getTime();
}

/** Duração do uso em ms (uso em aberto conta até `agora`). */
export function duracaoDoUso(uso: Intervalo, agora: Date): number {
  return Math.max(0, fimEfetivo(uso, agora) - uso.inicio.getTime());
}

/** Tempo de uso dentro de [de, ate), cortando o que fica fora da janela. */
function duracaoNaJanela(uso: Intervalo, de: number, ate: number, agora: Date): number {
  const inicio = Math.max(uso.inicio.getTime(), de);
  const fim = Math.min(fimEfetivo(uso, agora), ate);
  return Math.max(0, fim - inicio);
}

/**
 * Tempo de uso por dia nos últimos `dias` dias (do mais antigo até hoje). Um uso
 * que atravessa a meia-noite é dividido entre os dois dias.
 */
export function usoPorDia(
  usos: Intervalo[],
  agora: Date,
  dias = DIAS_DA_SEMANA_DE_USO
): UsoDoDia[] {
  const primeiroDia = adicionarDias(inicioDoDia(agora), -(dias - 1));
  return Array.from({ length: dias }, (_, i) => {
    const dia = adicionarDias(primeiroDia, i);
    const de = dia.getTime();
    const ate = adicionarDias(dia, 1).getTime();
    const duracaoMs = usos.reduce((soma, uso) => soma + duracaoNaJanela(uso, de, ate, agora), 0);
    return { dia, duracaoMs };
  });
}

export function somarDuracoes(dias: UsoDoDia[]): number {
  return dias.reduce((soma, d) => soma + d.duracaoMs, 0);
}

export function msParaHoras(ms: number): number {
  return ms / MS_POR_HORA;
}

/** Duração curta para leitura: "2h 05min", "45min" ou "0min". */
export function formatarDuracao(ms: number): string {
  const totalMin = Math.floor(ms / MS_POR_MINUTO);
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;
  if (horas === 0) return `${minutos}min`;
  return `${horas}h ${String(minutos).padStart(2, '0')}min`;
}

/** Cronômetro "HH:MM:SS" do uso em andamento (passa de 24h sem voltar a zero). */
export function formatarCronometro(ms: number): string {
  const totalSeg = Math.floor(Math.max(0, ms) / 1000);
  const horas = Math.floor(totalSeg / 3600);
  const minutos = Math.floor((totalSeg % 3600) / 60);
  const segundos = totalSeg % 60;
  return [horas, minutos, segundos].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Identificação da máquina sem espaços nas pontas e em maiúsculas ("tr-01 " → "TR-01"). */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}
