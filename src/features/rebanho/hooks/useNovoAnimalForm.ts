import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Animal } from '@/dtos';
import { decimalOpcional, formatBrinco, isInteiro, parseDecimal } from '@/utils';
import { createAnimal } from '../data/animais';
import { dataNascimentoPorIdade, IDADE_FIM_CRIA_MESES } from '../services/fase';

export const novoAnimalSchema = z.object({
  brinco: z.string().trim().min(1, 'Informe o número do brinco (ex: #104).'),
  nome: z.string().trim(),
  sexo: z.enum(['F', 'M']),
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
  jaPariu: z.boolean(),
  // "Mais detalhes"
  pesoKg: decimalOpcional,
  producaoLeiteL: decimalOpcional,
  racaoKgDia: decimalOpcional,
  maeId: z.string().nullable(),
  pai: z.object({ id: z.string().nullable(), descricao: z.string().nullable() }),
});

export type NovoAnimalFormValues = z.infer<typeof novoAnimalSchema>;

const DEFAULT_VALUES: NovoAnimalFormValues = {
  brinco: '',
  nome: '',
  sexo: 'F',
  idadeAnos: '',
  idadeMeses: '',
  raca: '',
  jaPariu: false,
  pesoKg: '',
  producaoLeiteL: '',
  racaoKgDia: '',
  maeId: null,
  pai: { id: null, descricao: null },
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

/** Campo decimal opcional: vazio vira null. */
function decimalOuNull(valor: string): number | null {
  return valor.trim() ? parseDecimal(valor) : null;
}

/**
 * Estado, validação e envio do formulário de cadastro de animal.
 */
export function useNovoAnimalForm(onCreated: (animal: Animal) => void) {
  const form = useForm<NovoAnimalFormValues>({
    resolver: zodResolver(novoAnimalSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const [sexo, idadeAnos, idadeMeses] = form.watch(['sexo', 'idadeAnos', 'idadeMeses']);
  const idade = idadeTotalMeses(idadeAnos, idadeMeses);
  const femea = sexo === 'F';
  // "Já pariu?" só faz sentido para fêmea adulta (sem idade, tratamos como adulta)
  const mostrarJaPariu = femea && (idade === null || idade >= IDADE_FIM_CRIA_MESES);

  const submit = form.handleSubmit(async (values) => {
    const idadeMesesTotal = idadeTotalMeses(values.idadeAnos, values.idadeMeses);
    const ehFemea = values.sexo === 'F';

    // TODO(B5): trocar por cadastrarAnimal, que grava o peso inicial (values.pesoKg) na mesma transação
    const created = await createAnimal({
      brinco: formatBrinco(values.brinco),
      nome: values.nome || undefined,
      raca: values.raca || undefined,
      sexo: values.sexo,
      dataNascimento:
        idadeMesesTotal === null ? undefined : dataNascimentoPorIdade(idadeMesesTotal),
      nascimentoAproximado: idadeMesesTotal !== null,
      // Leite, ração e "já pariu" não se aplicam a macho
      jaPariu: ehFemea && values.jaPariu,
      producaoLeiteL: ehFemea ? decimalOuNull(values.producaoLeiteL) : null,
      racaoKgDia: ehFemea ? decimalOuNull(values.racaoKgDia) : null,
      maeId: values.maeId,
      paiId: values.pai.id,
      paiDescricao: values.pai.descricao,
    });

    form.reset(DEFAULT_VALUES);
    onCreated(created);
  });

  return {
    control: form.control,
    clearErrors: form.clearErrors,
    submit,
    saving: form.formState.isSubmitting,
    femea,
    mostrarJaPariu,
  };
}
