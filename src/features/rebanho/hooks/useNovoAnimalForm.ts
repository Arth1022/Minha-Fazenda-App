import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Animal } from '@/dtos';
import { formatBrinco, isInteiro } from '@/utils';
import { createAnimal } from '../data/animais';
import { dataNascimentoPorIdade } from '../services/fase';

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
});

export type NovoAnimalFormValues = z.infer<typeof novoAnimalSchema>;

const DEFAULT_VALUES: NovoAnimalFormValues = {
  brinco: '',
  nome: '',
  idadeAnos: '',
  idadeMeses: '',
  raca: '',
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

  const submit = form.handleSubmit(async (values) => {
    const brinco = formatBrinco(values.brinco);
    const idadeMesesTotal = idadeTotalMeses(values.idadeAnos, values.idadeMeses);

    const created = await createAnimal({
      brinco,
      nome: values.nome || undefined,
      raca: values.raca || undefined,
      dataNascimento:
        idadeMesesTotal === null ? undefined : dataNascimentoPorIdade(idadeMesesTotal),
      nascimentoAproximado: idadeMesesTotal !== null,
    });

    form.reset(DEFAULT_VALUES);
    onCreated(created);
  });

  return {
    control: form.control,
    clearErrors: form.clearErrors,
    submit,
    saving: form.formState.isSubmitting,
  };
}
