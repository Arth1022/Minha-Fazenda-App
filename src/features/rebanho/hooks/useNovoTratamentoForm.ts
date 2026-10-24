import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import {
  TODOS_OS_DIAS,
  type AvisoMinutos,
  type IntervaloHoras,
} from '@/components/forms';
import type { DiaSemana, UltimoUsoMedicamento } from '@/dtos';
import { useFazenda } from '@/providers/FazendaProvider';
import { isInteiro } from '@/utils';
import { inicioDoDia } from '@/utils/date';
import { createTratamento, ultimoUsoDoMedicamento } from '../data/tratamentos';
import {
  resumoDaAgenda,
  temDoseNoPeriodo,
  UMA_VEZ_POR_DIA,
} from '../services/resumoTratamento';

export const HORARIO_PADRAO = '08:00';
const DICA_BULA = 'Confira na bula';
/** Espera o produtor parar de digitar antes de buscar o último uso do remédio. */
const ESPERA_BUSCA_MS = 400;

const diasDeCarencia = z
  .string()
  .trim()
  .refine((v) => v === '' || isInteiro(v), 'Informe os dias em número inteiro.');

export const novoTratamentoSchema = z
  .object({
    medicamento: z.string().trim().min(1, 'Informe o remédio ou a vacina.'),
    dose: z.string().trim(),
    diasSemana: z.array(z.custom<DiaSemana>()).min(1, 'Marque ao menos um dia.'),
    horario: z.string().regex(/^\d{2}:\d{2}$/, 'Escolha o horário.'),
    intervaloHoras: z.custom<IntervaloHoras>(),
    avisoMinutosAntes: z.custom<AvisoMinutos>(),
    comecaEm: z.date(),
    ate: z.date(),
    semFim: z.boolean(),
    carenciaLeiteDias: diasDeCarencia,
    carenciaCarneDias: diasDeCarencia,
  })
  .refine(temDoseNoPeriodo, {
    path: ['diasSemana'],
    message: 'Nenhum dia marcado cai entre o início e o fim.',
  });

export type NovoTratamentoFormValues = z.infer<typeof novoTratamentoSchema>;

/** Padrões do formulário: dose única hoje às 08:00, aviso na hora. */
function valoresIniciais(): NovoTratamentoFormValues {
  const hoje = inicioDoDia(new Date());
  return {
    medicamento: '',
    dose: '',
    diasSemana: [...TODOS_OS_DIAS],
    horario: HORARIO_PADRAO,
    intervaloHoras: UMA_VEZ_POR_DIA,
    avisoMinutosAntes: 0,
    comecaEm: hoje,
    ate: hoje,
    semFim: false,
    carenciaLeiteDias: '',
    carenciaCarneDias: '',
  };
}

const diasOuNull = (valor: string) => (valor ? Number(valor) : null);

/** Remédio novo: confira na bula. Já usado: o campo vazio quer dizer sem carência. */
const placeholderDaCarencia = (uso: UltimoUsoMedicamento | null) =>
  uso ? 'Sem carência' : DICA_BULA;

/**
 * Estado, validação e envio do formulário "Novo Tratamento" (remédio ou vacina
 * com agenda de doses). Ao reconhecer um remédio já usado, preenche a dose e as
 * carências que estiverem vazias.
 */
export function useNovoTratamentoForm(animalId: string | undefined, onSaved: () => void) {
  const { produzLeite } = useFazenda();
  const form = useForm<NovoTratamentoFormValues>({
    resolver: zodResolver(novoTratamentoSchema),
    defaultValues: valoresIniciais(),
  });
  const [ultimoUso, setUltimoUso] = useState<UltimoUsoMedicamento | null>(null);

  const valores = useWatch({ control: form.control }) as NovoTratamentoFormValues;
  const { medicamento, comecaEm, ate, semFim } = valores;

  useEffect(() => {
    let cancelado = false;
    const busca = setTimeout(async () => {
      const uso = await ultimoUsoDoMedicamento(medicamento);
      if (cancelado) return;
      setUltimoUso(uso);
      if (!uso) return;
      const preencher = (campo: 'dose' | 'carenciaLeiteDias' | 'carenciaCarneDias', valor: string) => {
        if (!form.getValues(campo)) form.setValue(campo, valor);
      };
      preencher('dose', uso.dose ?? '');
      preencher('carenciaLeiteDias', uso.carenciaLeiteDias?.toString() ?? '');
      preencher('carenciaCarneDias', uso.carenciaCarneDias?.toString() ?? '');
    }, ESPERA_BUSCA_MS);
    return () => {
      cancelado = true;
      clearTimeout(busca);
    };
  }, [medicamento, form]);

  // O fim nunca fica antes do início: mudar o início empurra o fim junto
  useEffect(() => {
    if (ate.getTime() < comecaEm.getTime()) form.setValue('ate', comecaEm);
  }, [comecaEm, ate, form]);

  const reset = () => {
    form.reset(valoresIniciais());
    setUltimoUso(null);
  };

  const submit = form.handleSubmit(async (v) => {
    if (!animalId) return;
    const todoDia = v.diasSemana.length === TODOS_OS_DIAS.length;

    await createTratamento({
      animalId,
      medicamento: v.medicamento,
      dose: v.dose || null,
      dataInicio: inicioDoDia(v.comecaEm),
      // Sem fim = contínuo (null); dose única = fim igual ao início
      dataFim: v.semFim ? null : inicioDoDia(v.ate),
      diasSemana: [...v.diasSemana].sort((a, b) => a - b),
      horario: v.horario,
      // Repetir no dia só vale com todos os dias marcados
      intervaloHoras: todoDia && v.intervaloHoras < UMA_VEZ_POR_DIA ? v.intervaloHoras : null,
      avisoMinutosAntes: v.avisoMinutosAntes,
      carenciaLeiteDias: produzLeite ? diasOuNull(v.carenciaLeiteDias) : null,
      carenciaCarneDias: diasOuNull(v.carenciaCarneDias),
      notificacaoAtiva: true,
    });

    reset();
    onSaved();
  });

  return {
    control: form.control,
    submit,
    reset,
    saving: form.formState.isSubmitting,
    produzLeite,
    todoDia: valores.diasSemana.length === TODOS_OS_DIAS.length,
    comecaEm,
    semFim,
    resumo: resumoDaAgenda(valores),
    placeholderCarencia: placeholderDaCarencia(ultimoUso),
  };
}
