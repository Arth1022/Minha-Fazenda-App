import type { CicloPlantio, EtapaCiclo, EtapaModelo, ModeloCultura, TipoEtapa } from '@/database';
import { normalizarTexto } from '@/utils/formatters';
import { adicionarDias, diasEntre, formatDataBR, formatDiaMes, inicioDoDia } from '@/utils/date';
import { CULTURAS, formatarNumero, type ResultadoSementes } from './calculos';

/**
 * Plantio na lavoura (M4, telas 15, 22 e 23): modelos de cultura, linha do
 * tempo prevista a partir do plantio, progresso do ciclo e os textos de prazo.
 * Funções puras: a tela só desenha o resultado.
 */

/** Um modelo para o "Plantar": os prontos do app ou um criado pelo admin (RF-042). */
export interface ModeloPlantio {
  /** Chave do pronto ("milho-silagem") ou id do modelo do admin */
  id: string;
  nome: string;
  /** Taxa de semeadura sugerida (kg/ha); null: informar ao plantar */
  taxaKgHa: number | null;
  /** Embalagem da semente (kg) */
  sacoKg: number;
  etapas: readonly EtapaModelo[];
  pronto: boolean;
}

/**
 * Modelos prontos (RF-042). O de milho silagem bate com o protótipo: plantio
 * em 20/10 → adubação de cobertura 14/11, pulverização 24/11, colheita 07/02
 * ("dia 21 de 110"). Forrageiras fecham o ciclo no primeiro pastejo.
 */
export const MODELOS_PRONTOS: readonly ModeloPlantio[] = [
  {
    id: 'milho-silagem',
    nome: CULTURAS.milho.rotulo,
    taxaKgHa: CULTURAS.milho.taxaKgHa,
    sacoKg: CULTURAS.milho.sacoKg,
    pronto: true,
    etapas: [
      { nome: 'Preparo do solo', tipo: 'preparo', dias: -10 },
      { nome: 'Plantio', tipo: 'plantio', dias: 0 },
      { nome: 'Adubação de cobertura', tipo: 'trato', dias: 25 },
      { nome: 'Pulverização', tipo: 'trato', dias: 35 },
      { nome: 'Colheita', tipo: 'colheita', dias: 110 },
    ],
  },
  {
    id: 'braquiaria',
    nome: CULTURAS.braquiaria.rotulo,
    taxaKgHa: CULTURAS.braquiaria.taxaKgHa,
    sacoKg: CULTURAS.braquiaria.sacoKg,
    pronto: true,
    etapas: [
      { nome: 'Preparo do solo', tipo: 'preparo', dias: -15 },
      { nome: 'Plantio', tipo: 'plantio', dias: 0 },
      { nome: 'Controle de invasoras', tipo: 'trato', dias: 30 },
      { nome: 'Adubação de cobertura', tipo: 'trato', dias: 45 },
      { nome: 'Primeiro pastejo', tipo: 'colheita', dias: 90 },
    ],
  },
  {
    id: 'mombaca',
    nome: CULTURAS.mombaca.rotulo,
    taxaKgHa: CULTURAS.mombaca.taxaKgHa,
    sacoKg: CULTURAS.mombaca.sacoKg,
    pronto: true,
    etapas: [
      { nome: 'Preparo do solo', tipo: 'preparo', dias: -15 },
      { nome: 'Plantio', tipo: 'plantio', dias: 0 },
      { nome: 'Controle de invasoras', tipo: 'trato', dias: 30 },
      { nome: 'Adubação de cobertura', tipo: 'trato', dias: 50 },
      { nome: 'Primeiro pastejo', tipo: 'colheita', dias: 100 },
    ],
  },
];

export function modeloDoAdmin(modelo: ModeloCultura): ModeloPlantio {
  return {
    id: modelo.id,
    nome: modelo.nome,
    taxaKgHa: modelo.taxaKgHa,
    sacoKg: modelo.sacoKg,
    etapas: modelo.etapas,
    pronto: false,
  };
}

/** Etapa com data prevista, antes de virar linha no banco. */
export interface EtapaPrevista {
  nome: string;
  tipo: TipoEtapa;
  previstaEm: Date;
}

/** Linha do tempo do modelo com as datas a partir do plantio (RF-038), em ordem de data. */
export function linhaDoTempoPrevista(etapas: readonly EtapaModelo[], dataPlantio: Date): EtapaPrevista[] {
  return etapas
    .map((etapa, indice) => ({ etapa, indice }))
    .sort((a, b) => a.etapa.dias - b.etapa.dias || a.indice - b.indice)
    .map(({ etapa }) => ({
      nome: etapa.nome,
      tipo: etapa.tipo,
      previstaEm: adicionarDias(dataPlantio, etapa.dias),
    }));
}

export interface EtapaInicial extends EtapaPrevista {
  realizadaEm: Date | null;
}

/**
 * Etapas gravadas ao começar o ciclo. Plantio de hoje ou do passado (registrar
 * uma lavoura já plantada): preparo e plantio já aconteceram e entram feitos na
 * data prevista; os tratos ficam pendentes para o produtor marcar.
 */
export function etapasDoInicio(
  linha: readonly EtapaPrevista[],
  dataPlantio: Date,
  hoje = new Date()
): EtapaInicial[] {
  const plantado = diasEntre(dataPlantio, hoje) >= 0;
  return linha.map((etapa) => {
    const jaFoi =
      plantado &&
      (etapa.tipo === 'preparo' || etapa.tipo === 'plantio') &&
      diasEntre(etapa.previstaEm, hoje) >= 0;
    return { ...etapa, realizadaEm: jaFoi ? inicioDoDia(etapa.previstaEm) : null };
  });
}

/** "252 kg · 13 sacos"; sem taxa, "—" */
export function textoSementes(sementes: Pick<ResultadoSementes, 'totalKg' | 'sacos'>): string {
  if (sementes.totalKg <= 0) return '—';
  return `${formatarNumero(sementes.totalKg)} kg · ${sementes.sacos === 1 ? '1 saco' : `${sementes.sacos} sacos`}`;
}

type EtapaDoCiclo = Pick<EtapaCiclo, 'id' | 'ordem' | 'nome' | 'tipo' | 'previstaEm' | 'realizadaEm'>;

export interface ProgressoCiclo {
  /** O plantio já foi feito: a contagem de dias começou */
  plantado: boolean;
  /** Dias desde o plantio (0 antes dele) */
  dia: number;
  /** Dias do plantio à colheita prevista */
  total: number;
  /** De 0 a 1, para a barra */
  fracao: number;
  /** A etapa pendente de data mais cedo e quantos dias faltam (negativo: atrasada) */
  proxima: { etapa: EtapaDoCiclo; dias: number } | null;
}

/** "dia 21 de 110" e a próxima etapa (tela 15). */
export function progressoDoCiclo(
  ciclo: { dataPlantio: Date },
  etapas: readonly EtapaDoCiclo[],
  agora = new Date()
): ProgressoCiclo {
  const plantio = etapas.find((e) => e.tipo === 'plantio');
  const colheita = etapas.find((e) => e.tipo === 'colheita');
  const plantado = plantio ? plantio.realizadaEm !== null : diasEntre(ciclo.dataPlantio, agora) >= 0;
  const total = Math.max(1, colheita ? diasEntre(ciclo.dataPlantio, colheita.previstaEm) : 1);
  const dia = plantado ? Math.max(0, diasEntre(ciclo.dataPlantio, agora)) : 0;
  const pendente = etapas
    .filter((e) => e.realizadaEm === null)
    .sort((a, b) => a.previstaEm.getTime() - b.previstaEm.getTime() || a.ordem - b.ordem)[0];
  return {
    plantado,
    dia,
    total,
    fracao: Math.min(1, dia / total),
    proxima: pendente ? { etapa: pendente, dias: diasEntre(agora, pendente.previstaEm) } : null,
  };
}

/** Prazo de uma etapa: "hoje", "amanhã", "em 4 dias", "atrasada há 2 dias". */
export function textoPrazo(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias > 1) return `em ${dias} dias`;
  return dias === -1 ? 'atrasada há 1 dia' : `atrasada há ${-dias} dias`;
}

/** Subtítulo do ciclo: "dia 21 de 110"; antes do plantio, "plantio em 15 dias". */
export function textoDiaDoCiclo(progresso: ProgressoCiclo, ciclo: { dataPlantio: Date }, agora = new Date()): string {
  if (progresso.plantado) return `dia ${progresso.dia} de ${progresso.total}`;
  const faltam = diasEntre(agora, ciclo.dataPlantio);
  if (faltam === 0) return 'plantio hoje';
  if (faltam === 1) return 'plantio amanhã';
  if (faltam > 1) return `plantio em ${faltam} dias`;
  return faltam === -1 ? 'plantio atrasado há 1 dia' : `plantio atrasado há ${-faltam} dias`;
}

/** Data da etapa: "25/11" no ano corrente; "15/03/2027" em outro ano (tela 22). */
export function dataDaEtapa(data: Date, agora = new Date()): string {
  return data.getFullYear() === agora.getFullYear() ? formatDiaMes(data) : formatDataBR(data);
}

export type EstadoEtapa = 'feita' | 'proxima' | 'atrasada' | 'pendente';

/** Como a etapa aparece na linha do tempo (tela 23). */
export function estadoDaEtapa(
  etapa: Pick<EtapaCiclo, 'id' | 'previstaEm' | 'realizadaEm'>,
  proximaId: string | null,
  agora = new Date()
): EstadoEtapa {
  if (etapa.realizadaEm) return 'feita';
  if (diasEntre(agora, etapa.previstaEm) < 0) return 'atrasada';
  return etapa.id === proximaId ? 'proxima' : 'pendente';
}

/** Ciclo que saiu do painel: "colhido em 07/02/2027" ou "cancelado em ...". */
export function textoCicloEncerrado(ciclo: Pick<CicloPlantio, 'status' | 'encerradoEm'>): string {
  const quando = ciclo.encerradoEm ? ` em ${formatDataBR(ciclo.encerradoEm)}` : '';
  return `${ciclo.status === 'cancelado' ? 'cancelado' : 'colhido'}${quando}`;
}

/** Trato de um modelo novo: nome e dias depois do plantio. */
export interface TratoRascunho {
  nome: string;
  dias: number;
}

/** O que o admin preenche em "Nova cultura" (RF-042). */
export interface RascunhoModelo {
  nome: string;
  /** Dias de preparo do solo antes do plantio */
  diasPreparo: number;
  tratos: readonly TratoRascunho[];
  /** Dias do plantio à colheita */
  diasColheita: number;
}

/** Etapas do modelo novo: preparo, plantio, os tratos em ordem de data e a colheita. */
export function etapasDoRascunho(rascunho: RascunhoModelo): EtapaModelo[] {
  const tratos = [...rascunho.tratos]
    .sort((a, b) => a.dias - b.dias)
    .map((trato) => ({ nome: trato.nome.trim(), tipo: 'trato' as const, dias: trato.dias }));
  return [
    { nome: 'Preparo do solo', tipo: 'preparo', dias: -Math.abs(rascunho.diasPreparo) },
    { nome: 'Plantio', tipo: 'plantio', dias: 0 },
    ...tratos,
    { nome: 'Colheita', tipo: 'colheita', dias: rascunho.diasColheita },
  ];
}

/** Por que o modelo novo ainda não pode ser salvo; null quando pode. */
export function problemaDoModelo(rascunho: RascunhoModelo, nomesExistentes: readonly string[]): string | null {
  const nome = rascunho.nome.trim();
  if (!nome) return 'Dê um nome à cultura.';
  const chave = normalizarTexto(nome);
  if (nomesExistentes.some((existente) => normalizarTexto(existente) === chave)) {
    return 'Já existe uma cultura com esse nome.';
  }
  if (!(rascunho.diasColheita > 0)) return 'A colheita vem depois do plantio: informe os dias até ela.';
  if (rascunho.tratos.some((trato) => !trato.nome.trim())) return 'Dê um nome a cada etapa.';
  if (rascunho.tratos.some((trato) => !(trato.dias > 0) || trato.dias >= rascunho.diasColheita)) {
    return 'Cada etapa fica entre o plantio e a colheita.';
  }
  return null;
}
