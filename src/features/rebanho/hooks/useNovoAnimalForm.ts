import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Animal, NovoAnimal } from '@/dtos';
import { decimalOpcional, formatBrinco, isInteiro, parseDecimal } from '@/utils';
import { atualizarAnimal, cadastrarAnimal } from '../data/animais';
import { dataNascimentoPorIdade, IDADE_FIM_CRIA_MESES, idadeEmMeses } from '../services/fase';

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

/** Número para o campo de texto ("22,1"); null vira vazio. */
const decimalParaCampo = (valor: number | null) =>
  valor === null ? '' : String(valor).replace('.', ',');

/** Valores do formulário a partir do cadastro (edição pela ficha). */
function valoresDoAnimal(animal: Animal): NovoAnimalFormValues {
  const meses = animal.dataNascimento ? idadeEmMeses(animal.dataNascimento) : null;
  return {
    brinco: animal.brinco,
    nome: animal.nome ?? '',
    sexo: animal.sexo,
    idadeAnos: meses === null ? '' : String(Math.floor(meses / 12)),
    idadeMeses: meses === null ? '' : String(meses % 12),
    raca: animal.raca ?? '',
    crias: animal.criasAnteriores > 0 ? String(animal.criasAnteriores) : '',
    pesoKg: '',
    producaoLeiteL: decimalParaCampo(animal.producaoLeiteL),
    racaoKgDia: decimalParaCampo(animal.racaoKgDia),
    maeId: animal.maeId,
    pai: { id: animal.paiId, descricao: animal.paiDescricao },
  };
}

/**
 * Estado, validação e envio do formulário de animal. Sem `animal`, cadastra um
 * novo (com o peso de entrada); com `animal`, edita o cadastro dele (o peso é
 * pela pesagem, não por aqui).
 */
export function useNovoAnimalForm(onSaved: (animal: Animal) => void, animal?: Animal | null) {
  const iniciais = animal ? valoresDoAnimal(animal) : DEFAULT_VALUES;
  const form = useForm<NovoAnimalFormValues>({
    resolver: zodResolver(novoAnimalSchema),
    defaultValues: iniciais,
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
      if (animal) {
        // Idade sem mexer: mantém a data original (pode ser exata, ex.: cria nascida no app)
        const idadeMudou =
          values.idadeAnos.trim() !== iniciais.idadeAnos ||
          values.idadeMeses.trim() !== iniciais.idadeMeses;
        const salvo = await atualizarAnimal(animal.id, {
          brinco: novo.brinco,
          nome: values.nome || null,
          raca: values.raca || null,
          sexo: values.sexo,
          dataNascimento: idadeMudou ? novo.dataNascimento ?? null : animal.dataNascimento,
          nascimentoAproximado: idadeMudou
            ? idadeMesesTotal !== null
            : animal.nascimentoAproximado,
          criasAnteriores,
          jaPariu: criasAnteriores > 0,
          producaoLeiteL: novo.producaoLeiteL ?? null,
          racaoKgDia: novo.racaoKgDia ?? null,
          maeId: values.maeId,
          paiId: values.pai.id,
          paiDescricao: values.pai.descricao,
          // Campos novos ainda sem tela no formulário: mantém o que está gravado
          origem: animal.origem,
          dataEntrada: animal.dataEntrada,
          valorCompra: animal.valorCompra,
          sisbov: animal.sisbov,
          grauSangue: animal.grauSangue,
          fotoUri: animal.fotoUri,
        });
        onSaved(salvo);
        return;
      }

      // Animal e peso de entrada numa transação só (o back-end valida mãe, pai e peso)
      const created = await cadastrarAnimal(novo, {
        pesoInicialKg: decimalOuNull(values.pesoKg),
      });
      form.reset(DEFAULT_VALUES);
      onSaved(created);
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
