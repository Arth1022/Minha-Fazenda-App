/**
 * Utilitários de data no formato brasileiro (DD/MM/AAAA)
 */

import type { Horario } from '@/dtos';

/** Converte "HH:mm" em hora e minuto; null se o texto não é um horário válido. */
export function parseHorario(horario: string): Horario | null {
  const match = horario.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hora: Number(match[1]), minuto: Number(match[2]) };
}

/** Converte "DD/MM/AAAA" em Date; retorna null se inválida. */
export function parseDataBR(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const parsed = new Date(y, m - 1, d);
  if (parsed.getDate() !== d || parsed.getMonth() !== m - 1) return null;
  return parsed;
}

/** Aplica a máscara "DD/MM/AAAA" enquanto o usuário digita. */
export function maskDataBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Formata uma Date como "DD/MM/AAAA". */
export function formatDataBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Meia-noite do dia (horário local). */
export function inicioDoDia(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Soma dias corridos a uma data (resultado à meia-noite). */
export function adicionarDias(date: Date, dias: number): Date {
  const result = inicioDoDia(date);
  result.setDate(result.getDate() + dias);
  return result;
}

/** Dias corridos de `de` até `ate`, sem considerar o horário. */
export function diasEntre(de: Date, ate: Date): number {
  return Math.round(
    (inicioDoDia(ate).getTime() - inicioDoDia(de).getTime()) / MS_POR_DIA
  );
}

/** Formata uma Date como "DD/MM". */
export function formatDiaMes(date: Date): string {
  return formatDataBR(date).slice(0, 5);
}
