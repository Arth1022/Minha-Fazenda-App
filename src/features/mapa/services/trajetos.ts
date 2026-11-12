import type { AtividadeUso, EtapaCiclo, MotivoFimUso, TipoMaquina, TipoTalhao, UsoMaquina } from '@/database';
import { MOTIVOS_AUTOMATICOS, TEMPOS } from '@/features/maquinas/services/padroes';
import { adicionarDias, diasEntre, formatDiaMes, inicioDoDia } from '@/utils/date';
import { normalizarTexto } from '@/utils/formatters';

/**
 * Trajetos das máquinas no mapa (M5, telas 24 a 26): cor fixa por máquina,
 * períodos da camada, "há 3 h", os números do resumo da sessão e a sugestão de
 * etapa da lavoura por onde a máquina passou. Funções puras.
 */

/** Uma cor por máquina, longe das cores das áreas (pasto amarelo, lavoura laranja, reserva verde-água). */
export const CORES_TRAJETO = [
  '#7C3AED',
  '#2563EB',
  '#DB2777',
  '#4F46E5',
  '#C026D3',
  '#0369A1',
  '#65A30D',
  '#92400E',
] as const;

/** Cor fixa da máquina (RF-062): sai do id, então é a mesma em todo celular. */
export function corDaMaquina(maquinaId: string): string {
  let soma = 0;
  for (let i = 0; i < maquinaId.length; i++) soma = (soma * 31 + maquinaId.charCodeAt(i)) >>> 0;
  return CORES_TRAJETO[soma % CORES_TRAJETO.length];
}

/** Períodos da camada Trajetos (RF-060). */
export type PeriodoTrajetos = 'hoje' | 'ontem' | '2dias' | '7dias' | '30dias';
export const ORDEM_PERIODOS: readonly PeriodoTrajetos[] = ['hoje', 'ontem', '2dias', '7dias', '30dias'];
/** Ao abrir a camada o traçado fica 2 dias no mapa: o de ontem ainda aparece hoje. */
export const PERIODO_PADRAO: PeriodoTrajetos = '2dias';
export const ROTULO_PERIODO: Record<PeriodoTrajetos, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  '2dias': '2 dias',
  '7dias': '7 dias',
  '30dias': '30 dias',
};

/** Início (incluído) e fim (excluído) do período, em dias inteiros. */
export function intervaloDoPeriodo(periodo: PeriodoTrajetos, agora = new Date()): { desde: Date; ate: Date } {
  const hoje = inicioDoDia(agora);
  const amanha = adicionarDias(hoje, 1);
  switch (periodo) {
    case 'ontem':
      return { desde: adicionarDias(hoje, -1), ate: hoje };
    case '2dias':
      return { desde: adicionarDias(hoje, -1), ate: amanha };
    case '7dias':
      return { desde: adicionarDias(hoje, -6), ate: amanha };
    case '30dias':
      return { desde: adicionarDias(hoje, -29), ate: amanha };
    default:
      return { desde: hoje, ate: amanha };
  }
}

/** "agora", "há 20 min", "há 3 h", "há 2 dias" (última posição da máquina, RF-064). */
export function textoHa(data: Date, agora = new Date()): string {
  const minutos = Math.floor((agora.getTime() - data.getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

const hora = (data: Date) =>
  `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;

const dia = (data: Date, agora: Date) => {
  const dias = diasEntre(data, agora);
  return dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : formatDiaMes(data);
};

/** "hoje, 07:10 → 08:42"; de outro dia, "08/11, 07:10 → 08:42"; em andamento, "hoje, desde 07:10". */
export function textoHorario(inicio: Date, fim: Date | null, agora = new Date()): string {
  return fim ? `${dia(inicio, agora)}, ${hora(inicio)} → ${hora(fim)}` : `${dia(inicio, agora)}, desde ${hora(inicio)}`;
}

/** "hoje, 07:10", "ontem, 15:30", "08/11, 07:10" (lista de usos da área). */
export function textoDiaEHora(data: Date, agora = new Date()): string {
  return `${dia(data, agora)}, ${hora(data)}`;
}

/** KM no padrão da tela: "8,4 km". */
export function textoKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export interface NumerosDaSessao {
  /** Distância total (só com GPS) */
  km: number | null;
  duracaoMs: number;
  /** Trabalhando + deslocando */
  emMovimentoMs: number | null;
  /** Paradas + pausas */
  paradoMs: number | null;
  /** KM fora de qualquer área ("Fora das áreas"); null quando não sobra quase nada */
  foraDasAreasKm: number | null;
}

/** Os quatro números e o "fora das áreas" do resumo da sessão (tela 25, RF-056). */
export function numerosDaSessao(
  uso: Pick<UsoMaquina, 'inicio' | 'fim' | 'kmTotal' | 'segTrabalhando' | 'segDeslocando' | 'segParada' | 'segPausa'>,
  areas: readonly { km: number }[],
  agora = new Date()
): NumerosDaSessao {
  const fim = uso.fim ?? agora;
  const movimento =
    uso.segTrabalhando === null && uso.segDeslocando === null
      ? null
      : ((uso.segTrabalhando ?? 0) + (uso.segDeslocando ?? 0)) * 1000;
  const parado =
    uso.segParada === null && uso.segPausa === null ? null : ((uso.segParada ?? 0) + (uso.segPausa ?? 0)) * 1000;
  const nasAreas = areas.reduce((soma, a) => soma + a.km, 0);
  const fora = uso.kmTotal !== null ? uso.kmTotal - nasAreas : null;
  return {
    km: uso.kmTotal,
    duracaoMs: Math.max(0, fim.getTime() - uso.inicio.getTime()),
    emMovimentoMs: movimento,
    paradoMs: parado,
    foraDasAreasKm: fora !== null && fora >= 0.05 ? Math.round(fora * 10) / 10 : null,
  };
}

const MOTIVO_CURTO: Partial<Record<MotivoFimUso, string>> = {
  parada: 'ficou parada',
  pausa: 'pausa longa',
  velocidade: 'o celular saiu da máquina',
  fora: 'saiu da fazenda',
};

/** Faixa do resumo: "Encerrada sozinha · ficou parada"; null quando quem encerrou foi a pessoa. */
export function textoFimAutomatico(motivo: MotivoFimUso | null): string | null {
  if (!motivo || !MOTIVOS_AUTOMATICOS.has(motivo)) return null;
  return `Encerrada sozinha · ${MOTIVO_CURTO[motivo] ?? 'regra do app'}`;
}

/** O "Desfazer" aparece para quem operou, no fim automático das últimas 12 h (RF-050). */
export function podeDesfazer(
  uso: Pick<UsoMaquina, 'fim' | 'fimMotivo' | 'operadorId'>,
  operadorId: string,
  agora = new Date()
): boolean {
  return (
    uso.fim !== null &&
    uso.fimMotivo !== null &&
    MOTIVOS_AUTOMATICOS.has(uso.fimMotivo) &&
    uso.operadorId === operadorId &&
    agora.getTime() - uso.fim.getTime() <= TEMPOS.desfazerMs
  );
}

/** Palavras do nome da etapa que combinam com o que a máquina foi fazer. */
const PALAVRAS_DA_ATIVIDADE: Partial<Record<AtividadeUso, readonly string[]>> = {
  plantio: ['plantio', 'semeadura'],
  pulverizacao: ['pulveriz', 'aplicacao'],
  gradagem: ['preparo', 'grade', 'gradagem'],
  trato: ['adubacao', 'cobertura'],
};
const PALAVRAS_DO_TIPO: Partial<Record<TipoMaquina, readonly string[]>> = {
  pulverizador: ['pulveriz', 'aplicacao'],
  plantadeira: ['plantio', 'semeadura'],
  colheitadeira: ['colheita'],
};

/** Etapa prevista até 15 dias antes ou depois do dia em que a máquina passou. */
const JANELA_SUGESTAO_DIAS = 15;
/** Passar menos que isto na área (atravessar) não sugere nada. */
const MINIMO_NA_AREA_S = 5 * 60;

export interface SugestaoDeEtapa {
  areaId: string;
  areaNome: string;
  etapa: Pick<EtapaCiclo, 'id' | 'nome' | 'previstaEm'>;
}

/**
 * "Passou no Talhão 3: marcar Pulverização como feita?" (RF-059, tela 25): a
 * etapa pendente de uma lavoura onde a máquina ficou pelo menos 5 min, que
 * combina com a atividade ou com o tipo da máquina (e do implemento) e está
 * prevista perto do dia do uso. Fica a de data mais próxima; nenhuma, null.
 */
export function sugestaoDeEtapa(dados: {
  dia: Date;
  atividade: AtividadeUso | null;
  /** Tipo da máquina e do implemento engatado */
  tipos: readonly TipoMaquina[];
  areas: readonly { areaId: string; nome: string; tipo: TipoTalhao; segundos: number }[];
  pendentes: readonly { areaId: string; etapa: Pick<EtapaCiclo, 'id' | 'nome' | 'previstaEm'> }[];
}): SugestaoDeEtapa | null {
  const palavras = [
    ...(dados.atividade ? (PALAVRAS_DA_ATIVIDADE[dados.atividade] ?? []) : []),
    ...dados.tipos.flatMap((tipo) => PALAVRAS_DO_TIPO[tipo] ?? []),
  ];
  if (palavras.length === 0) return null;
  let melhor: { sugestao: SugestaoDeEtapa; distancia: number } | null = null;
  for (const area of dados.areas) {
    if (area.tipo !== 'lavoura' || area.segundos < MINIMO_NA_AREA_S) continue;
    for (const pendente of dados.pendentes) {
      if (pendente.areaId !== area.areaId) continue;
      const nome = normalizarTexto(pendente.etapa.nome);
      if (!palavras.some((palavra) => nome.includes(palavra))) continue;
      const distancia = Math.abs(diasEntre(dados.dia, pendente.etapa.previstaEm));
      if (distancia > JANELA_SUGESTAO_DIAS) continue;
      if (!melhor || distancia < melhor.distancia) {
        melhor = { sugestao: { areaId: area.areaId, areaNome: area.nome, etapa: pendente.etapa }, distancia };
      }
    }
  }
  return melhor?.sugestao ?? null;
}
