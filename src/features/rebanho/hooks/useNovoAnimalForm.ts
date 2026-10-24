import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { TIPOS_COBERTURA, type Animal } from '@/database';
import { decimalOpcional, formatBrinco, isInteiro, parseDecimal } from '@/utils';
import { createAnimal } from '../data/animais';
import { categoriaService } from '../services/CategoriaService';

export const novoAnimalSchema = z.object({
  brinco: z.string().trim().min(1, 'Informe o número do brinco (ex: #104).'),
  nome: z.string().trim(),
  idadeAnos: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || isInteiro(v),
      'Informe os anos em número inteiro.'
    ),
  idadeMeses: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (isInteiro(v) && Number(v) <= 11),
      'Meses de 0 a 11.'
    ),
  raca: z.string().trim(),
  pesoKg: z
    .string()
    .trim()
    .refine((v) => parseDecimal(v) > 0, 'Informe um peso válido em kg.'),
  producaoLeiteL: decimalOpcional,
  crias: z
    .string()
    .trim()
    .refine((v) => v === '' || isInteiro(v), 'Informe um número inteiro.'),
  racaoKgDia: decimalOpcional,
  paiBrinco: z.string().trim(),
  maeBrinco: z.string().trim(),
  coberturas: z.array(
    z.object({
      data: z.date(),
      tipo: z.enum(TIPOS_COBERTURA),
      touroSemen: z.string().optional(),
    })
  ),
});

export type NovoAnimalFormValues = z.infer<typeof novoAnimalSchema>;
export type CoberturaFormValue = NovoAnimalFormValues['coberturas'][number];

const DEFAULT_VALUES: NovoAnimalFormValues = {
  brinco: '',
  nome: '',
  idadeAnos: '',
  idadeMeses: '',
  raca: '',
  pesoKg: '',
  producaoLeiteL: '',
  crias: '',
  racaoKgDia: '',
  paiBrinco: '',
  maeBrinco: '',
  coberturas: [],
};

/** Idade total em meses; null se não informada ou inválida. */
function idadeTotalMeses(anos: string, meses: string): number | null {
  const a = anos.trim();
  const m = meses.trim();
  if (!a && !m) return null;
  if ((a && !isInteiro(a)) || (m && !isInteiro(m)) || Number(m) > 11) {
    return null;
  }
  return Number(a || 0) * 12 + Number(m || 0);
}

/**
 * Estado, validação e envio do formulário de cadastro de animal.
 */
export function useNovoAnimalForm(onCreated: (animal: Animal) => void) {
  const form = useForm<NovoAnimalFormValues>({
    resolver: zodResolver(novoAnimalSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const coberturas = useFieldArray({
    control: form.control,
    name: 'coberturas',
  });

  const submit = form.handleSubmit(async (values) => {
    const brinco = formatBrinco(values.brinco);
    const idadeMesesTotal = idadeTotalMeses(
      values.idadeAnos,
      values.idadeMeses
    );
    const bezerro =
      idadeMesesTotal !== null &&
      categoriaService.categoriaPorIdade(idadeMesesTotal) === 'bezerro';

    const created = await createAnimal(
      {
        brinco,
        nome: values.nome || `Brinco ${brinco}`,
        raca: values.raca || undefined,
        pesoKg: parseDecimal(values.pesoKg),
        // Bezerros não produzem leite nem têm crias
        producaoLeiteL: bezerro ? 0 : parseDecimal(values.producaoLeiteL) || 0,
        crias: bezerro ? 0 : parseInt(values.crias, 10) || 0,
        racaoKgDia: parseDecimal(values.racaoKgDia) || 0,
        paiBrinco: values.paiBrinco ? formatBrinco(values.paiBrinco) : undefined,
        maeBrinco: values.maeBrinco ? formatBrinco(values.maeBrinco) : undefined,
        dataNascimento:
          idadeMesesTotal === null
            ? undefined
            : categoriaService.dataNascimentoPorIdade(idadeMesesTotal),
      },
      bezerro ? [] : values.coberturas
    );

    form.reset(DEFAULT_VALUES);
    onCreated(created);
  });

  return {
    control: form.control,
    clearErrors: form.clearErrors,
    coberturas,
    submit,
    saving: form.formState.isSubmitting,
  };
}
