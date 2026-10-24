import { z } from 'zod';

/** Converte texto com vírgula ou ponto decimal em número (NaN se inválido). */
export const parseDecimal = (value: string) =>
  parseFloat(value.replace(',', '.'));

/** True se o texto contém apenas dígitos (inteiro não negativo). */
export const isInteiro = (value: string) => /^\d+$/.test(value);

/** Campo de texto opcional que, se preenchido, deve ser um número decimal. */
export const decimalOpcional = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || !isNaN(parseDecimal(v)),
    'Informe um número válido.'
  );
