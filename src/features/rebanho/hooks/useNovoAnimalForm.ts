import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Animal, NovoAnimal } from '@/dtos';
import { decimalOpcional, formatBrinco, isInteiro, parseDecimal } from '@/utils';
import { cadastrarAnimal } from '../data/animais';
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
  crias: z
    .string()
    .trim()
    .refine((v) => v === '' || isInteiro(v), 'Informe as crias em número inteiro.'),
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
  crias: '',
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
  // Crias só fazem sentido para fêmea adulta (sem idade, tratamos como adulta)
  const mostrarCrias = femea && (idade === null || idade >= IDADE_FIM_CRIA_MESES);

  const submit = form.handleSubmit(async (values) => {
    const idadeMesesTotal = idadeTotalMeses(values.idadeAnos, values.idadeMeses);
    const ehFemea = values.sexo === 'F';
    const criasAnteriores = mostrarCrias && values.crias ? Number(values.crias) : 0;

    const novo: NovoAnimal = {
      brinco: formatBrinco(values.brinco),
      nome: values.nome || undefined,
      raca: values.raca || undefined,
      sexo: values.sexo,
      dataNascimento:
        idadeMesesTotal === null ? undefined : dataNascimentoPorIdade(idadeMesesTotal),
      nascimentoAproximado: idadeMesesTotal !== null,
      // Quem já teve cria é vaca (Embrapa); leite e ração não se aplicam a macho
      criasAnteriores,
      jaPariu: criasAnteriores > 0,
      producaoLeiteL: ehFemea ? decimalOuNull(values.producaoLeiteL) : null,
      racaoKgDia: ehFemea ? decimalOuNull(values.racaoKgDia) : null,
      maeId: values.maeId,
      paiId: values.pai.id,
      paiDescricao: values.pai.descricao,
    };

    try {
      // Animal e peso de entrada numa transação só (o back-end valida mãe, pai e peso)
      const created = await cadastrarAnimal(novo, {
        pesoInicialKg: decimalOuNull(values.pesoKg),
      });
      form.reset(DEFAULT_VALUES);
      onCreated(created);
    } catch (erro) {
      Alert.alert(
        'Não foi possível salvar',
        erro instanceof Error ? erro.message : 'Tente novamente.'
      );
    }
  });

  return {
    control: form.control,
    clearErrors: form.clearErrors,
    submit,
    saving: form.formState.isSubmitting,
    femea,
    mostrarCrias,
  };
}
