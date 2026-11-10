import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { COMBUSTIVEIS, TIPOS_MAQUINA } from '@/database';
import type { Maquina } from '@/dtos';
import { decimalOpcional, isInteiro, parseDecimal } from '@/utils';
import { atualizarMaquina, cadastrarMaquina, type DadosNovaMaquina } from '../data/maquinas';
import { categoriaDoTipo } from '../services/padroes';

const ANO_MINIMO = 1900;
const anoMaximo = () => new Date().getFullYear() + 1;

export const novaMaquinaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome (ex: Trator do curral).'),
  tipo: z.enum(TIPOS_MAQUINA),
  marca: z.string().trim(),
  modelo: z.string().trim(),
  // "Mais detalhes"
  anoFabricacao: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (isInteiro(v) && Number(v) >= ANO_MINIMO && Number(v) <= anoMaximo()),
      'Informe um ano válido (ex: 2018).'
    ),
  numeroSerie: z.string().trim(),
  placa: z.string().trim(),
  potenciaCv: decimalOpcional,
  combustivel: z.enum(COMBUSTIVEIS),
  horimetro: decimalOpcional,
  /** Motorizada: o horímetro funciona? (sem ele, o app usa as horas de uso) */
  possuiHorimetro: z.boolean(),
  tanqueLitros: decimalOpcional,
  /** Implemento: largura de trabalho, para a área estimada */
  larguraTrabalhoM: decimalOpcional,
  dataAquisicao: z.date().nullable(),
});

export type NovaMaquinaFormValues = z.infer<typeof novaMaquinaSchema>;

const DEFAULT_VALUES: NovaMaquinaFormValues = {
  nome: '',
  tipo: 'trator',
  marca: '',
  modelo: '',
  anoFabricacao: '',
  numeroSerie: '',
  placa: '',
  potenciaCv: '',
  combustivel: 'diesel',
  horimetro: '',
  possuiHorimetro: true,
  tanqueLitros: '',
  larguraTrabalhoM: '',
  dataAquisicao: null,
};

const textoOuNull = (valor: string) => valor || null;
const decimalOuNull = (valor: string) => (valor ? parseDecimal(valor) : null);

function paraNovaMaquina(values: NovaMaquinaFormValues): DadosNovaMaquina {
  return {
    nome: values.nome,
    tipo: values.tipo,
    marca: textoOuNull(values.marca),
    modelo: textoOuNull(values.modelo),
    anoFabricacao: values.anoFabricacao ? Number(values.anoFabricacao) : null,
    numeroSerie: textoOuNull(values.numeroSerie),
    placa: values.placa ? values.placa.toUpperCase() : null,
    potenciaCv: decimalOuNull(values.potenciaCv),
    combustivel: values.combustivel,
    possuiHorimetro: values.possuiHorimetro,
    horimetroInicial: values.possuiHorimetro ? decimalOuNull(values.horimetro) : null,
    tanqueLitros: decimalOuNull(values.tanqueLitros),
    larguraTrabalhoM: decimalOuNull(values.larguraTrabalhoM),
    dataAquisicao: values.dataAquisicao,
  };
}

const textoOuVazio = (valor: string | null) => valor ?? '';
const numeroOuVazio = (valor: number | null) => (valor === null ? '' : String(valor).replace('.', ','));

/** Valores do formulário a partir da máquina cadastrada (edição). */
function valoresDaMaquina(maquina: Maquina): NovaMaquinaFormValues {
  return {
    nome: maquina.nome,
    tipo: maquina.tipo,
    marca: textoOuVazio(maquina.marca),
    modelo: textoOuVazio(maquina.modelo),
    anoFabricacao: numeroOuVazio(maquina.anoFabricacao),
    numeroSerie: textoOuVazio(maquina.numeroSerie),
    placa: textoOuVazio(maquina.placa),
    potenciaCv: numeroOuVazio(maquina.potenciaCv),
    combustivel: maquina.combustivel ?? DEFAULT_VALUES.combustivel,
    horimetro: numeroOuVazio(maquina.horimetroInicial),
    possuiHorimetro: maquina.categoria === 'implemento' ? DEFAULT_VALUES.possuiHorimetro : maquina.possuiHorimetro,
    tanqueLitros: numeroOuVazio(maquina.tanqueLitros),
    larguraTrabalhoM: numeroOuVazio(maquina.larguraTrabalhoM),
    dataAquisicao: maquina.dataAquisicao,
  };
}

/**
 * Estado, validação e envio do cadastro de máquina. Com `maquina`, edita o
 * cadastro dela (o formulário começa preenchido).
 */
export function useNovaMaquinaForm(onSaved: (maquina: Maquina) => void, maquina?: Maquina | null) {
  const form = useForm<NovaMaquinaFormValues>({
    resolver: zodResolver(novaMaquinaSchema),
    defaultValues: maquina ? valoresDaMaquina(maquina) : DEFAULT_VALUES,
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      const salva = maquina
        ? await atualizarMaquina(maquina.id, paraNovaMaquina(values))
        : await cadastrarMaquina(paraNovaMaquina(values));
      if (!maquina) form.reset(DEFAULT_VALUES);
      onSaved(salva);
    } catch (erro) {
      Alert.alert('Não foi possível salvar', erro instanceof Error ? erro.message : 'Tente novamente.');
    }
  });

  const tipo = useWatch({ control: form.control, name: 'tipo' });
  const possuiHorimetro = useWatch({ control: form.control, name: 'possuiHorimetro' });
  return {
    control: form.control,
    clearErrors: form.clearErrors,
    submit,
    saving: form.formState.isSubmitting,
    /** Plantadeira e implemento: sem motor (largura no lugar de combustível e horímetro) */
    implemento: categoriaDoTipo(tipo) === 'implemento',
    possuiHorimetro,
  };
}
