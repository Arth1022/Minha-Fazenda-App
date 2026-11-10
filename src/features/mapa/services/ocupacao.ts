import { diasEntre } from '@/utils/date';
import { formatarHectares, formatarNumero } from './calculos';

/**
 * Ocupação dos pastos (M2): cabeças, lotação e descanso. Funções puras sobre o
 * que `ocupacaoDasAreas` (movimentacaoService) lê do banco.
 */

export interface OcupacaoArea {
  /** Animais no pasto agora */
  cabecas: number;
  /** Entrada mais antiga dos que estão lá: ocupado desde */
  desde: Date | null;
  /** Última saída de um animal: o descanso conta daqui (RN-008) */
  ultimaSaida: Date | null;
}

/** Linha de `ocupacaoDasAreas()` (datas em milissegundos). */
export interface LinhaOcupacao {
  areaId: string;
  cabecas: number;
  desdeMs: number | null;
  ultimaSaidaMs: number | null;
}

const paraData = (ms: number | null) => (ms === null ? null : new Date(Number(ms)));

/** Linhas da consulta → ocupação por id da área. */
export function mapaDeOcupacao(linhas: readonly LinhaOcupacao[]): Map<string, OcupacaoArea> {
  return new Map(
    linhas.map((l) => [
      l.areaId,
      { cabecas: Number(l.cabecas), desde: paraData(l.desdeMs), ultimaSaida: paraData(l.ultimaSaidaMs) },
    ])
  );
}

/** Cabeças por hectare; null sem área. */
export function lotacao(cabecas: number, areaHectares: number): number | null {
  return areaHectares > 0 ? cabecas / areaHectares : null;
}

/** "0,63 cab/ha"; "—" sem área. */
export function formatarLotacao(valor: number | null): string {
  return valor === null ? '—' : `${formatarNumero(valor, 2)} cab/ha`;
}

/** "1 dia", "8 dias". */
export function textoDias(dias: number): string {
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

export interface SituacaoPasto {
  /** Com animais: ocupado; sem animais: em descanso (RN-008) */
  estado: 'ocupado' | 'descanso';
  cabecas: number;
  /** Cabeças por hectare agora; null sem área */
  lotacao: number | null;
  /** Dias desde que entrou o animal mais antigo; só ocupado */
  diasOcupado: number | null;
  /** Dias desde a última saída; null se nunca teve animais */
  diasDescanso: number | null;
}

export function situacaoDoPasto(
  areaHectares: number,
  ocupacao: OcupacaoArea | undefined,
  agora = new Date()
): SituacaoPasto {
  const cabecas = ocupacao?.cabecas ?? 0;
  if (cabecas > 0) {
    return {
      estado: 'ocupado',
      cabecas,
      lotacao: lotacao(cabecas, areaHectares),
      diasOcupado: ocupacao?.desde ? diasEntre(ocupacao.desde, agora) : null,
      diasDescanso: null,
    };
  }
  return {
    estado: 'descanso',
    cabecas: 0,
    lotacao: lotacao(0, areaHectares),
    diasOcupado: null,
    diasDescanso: ocupacao?.ultimaSaida ? diasEntre(ocupacao.ultimaSaida, agora) : null,
  };
}

/** "Descanso · 8 dias"; só "Descanso" se nunca teve animais. */
export function legendaDescanso(diasDescanso: number | null): string {
  return diasDescanso === null ? 'Descanso' : `Descanso · ${textoDias(diasDescanso)}`;
}

/**
 * Linha de cada pasto na escolha do destino: "Descanso · 8 dias · 22,1 ha" ou
 * "12 cab. · 18,0 ha".
 */
export function detalheDoDestino(
  areaHectares: number,
  ocupacao: OcupacaoArea | undefined,
  agora = new Date()
): string {
  const situacao = situacaoDoPasto(areaHectares, ocupacao, agora);
  const estado =
    situacao.estado === 'ocupado' ? `${situacao.cabecas} cab.` : legendaDescanso(situacao.diasDescanso);
  return `${estado} · ${formatarHectares(areaHectares)}`;
}

/** Lotação do destino depois de receber os animais (folha "Mover"). */
export function lotacaoDepois(
  areaHectares: number,
  ocupacao: OcupacaoArea | undefined,
  chegando: number
): number | null {
  return lotacao((ocupacao?.cabecas ?? 0) + chegando, areaHectares);
}

export interface GrupoAnimais {
  /** null: "Sem lote" */
  loteId: string | null;
  nome: string;
  quantidade: number;
}

/** "Animais aqui": um grupo por lote (o maior primeiro) e "Sem lote" por último. */
export function gruposPorLote(
  animais: readonly { loteId: string | null; loteNome: string | null }[]
): GrupoAnimais[] {
  const porLote = new Map<string, GrupoAnimais>();
  let semLote = 0;
  for (const a of animais) {
    if (!a.loteId) {
      semLote += 1;
      continue;
    }
    const grupo = porLote.get(a.loteId);
    if (grupo) grupo.quantidade += 1;
    else porLote.set(a.loteId, { loteId: a.loteId, nome: `Lote ${a.loteNome ?? ''}`.trim(), quantidade: 1 });
  }
  const grupos = [...porLote.values()].sort(
    (x, y) => y.quantidade - x.quantidade || x.nome.localeCompare(y.nome)
  );
  if (semLote > 0) grupos.push({ loteId: null, nome: 'Sem lote', quantidade: semLote });
  return grupos;
}

/** Animais do lote que não estão no pasto dele (RF-021); 0 se o lote não tem pasto. */
export function foraDoPastoDoLote(
  animais: readonly { areaId: string | null }[],
  pastoDoLote: string | null
): number {
  if (pastoDoLote === null) return 0;
  return animais.filter((a) => a.areaId !== pastoDoLote).length;
}

/** "Estrela · 10388"; sem nome, "Brinco 10388". */
export function identificacaoAnimal(animal: { nome: string | null; brinco: string }): string {
  return animal.nome ? `${animal.nome} · ${animal.brinco}` : `Brinco ${animal.brinco}`;
}

/**
 * Destinos para mover animais: primeiro os pastos em descanso (o que nunca teve
 * animais, depois o que descansa há mais tempo), depois os ocupados, do menos
 * lotado ao mais lotado. É a ordem de quem roda pasto.
 */
export function ordenarDestinos<T extends { id: string; areaHectares: number; nome: string }>(
  pastos: readonly T[],
  ocupacoes: ReadonlyMap<string, OcupacaoArea>,
  agora = new Date()
): T[] {
  const nota = (pasto: T): [number, number] => {
    const s = situacaoDoPasto(pasto.areaHectares, ocupacoes.get(pasto.id), agora);
    if (s.estado === 'descanso') return [0, s.diasDescanso === null ? -Infinity : -s.diasDescanso];
    return [1, s.lotacao ?? 0];
  };
  return pastos
    .map((pasto) => ({ pasto, nota: nota(pasto) }))
    .sort(
      (a, b) =>
        a.nota[0] - b.nota[0] ||
        (a.nota[1] === b.nota[1] ? 0 : a.nota[1] < b.nota[1] ? -1 : 1) ||
        a.pasto.nome.localeCompare(b.pasto.nome)
    )
    .map(({ pasto }) => pasto);
}

export interface LinhaHistoricoArea {
  animalId: string;
  nome: string | null;
  brinco: string;
  loteId: string | null;
  loteNome: string | null;
  entradaEm: Date;
  saidaEm: Date | null;
}

export interface PeriodoOcupacao {
  chave: string;
  /** "Lote Novilhas · 17 animais", "Estrela · 10388" ou "3 animais" */
  titulo: string;
  entrada: Date;
  /** null: ainda tem animal desse grupo no pasto */
  saida: Date | null;
  dias: number;
  quantidade: number;
}

/**
 * Histórico de ocupação do pasto: as entradas feitas juntas (mesma hora e mesmo
 * lote) viram um período só, do mais recente para o mais antigo.
 */
export function periodosDeOcupacao(
  linhas: readonly LinhaHistoricoArea[],
  agora = new Date()
): PeriodoOcupacao[] {
  const grupos = new Map<string, LinhaHistoricoArea[]>();
  for (const linha of linhas) {
    const chave = `${linha.entradaEm.getTime()}|${linha.loteId ?? ''}`;
    const grupo = grupos.get(chave);
    if (grupo) grupo.push(linha);
    else grupos.set(chave, [linha]);
  }
  return [...grupos.entries()]
    .map(([chave, grupo]) => {
      const primeiro = grupo[0];
      const aberto = grupo.some((l) => l.saidaEm === null);
      const saida = aberto ? null : new Date(Math.max(...grupo.map((l) => l.saidaEm!.getTime())));
      const qtd = grupo.length;
      const titulo = primeiro.loteId
        ? `Lote ${primeiro.loteNome ?? ''} · ${qtd === 1 ? '1 animal' : `${qtd} animais`}`
        : qtd === 1
          ? identificacaoAnimal(primeiro)
          : `${qtd} animais`;
      return {
        chave,
        titulo,
        entrada: primeiro.entradaEm,
        saida,
        dias: diasEntre(primeiro.entradaEm, saida ?? agora),
        quantidade: qtd,
      };
    })
    .sort((a, b) => b.entrada.getTime() - a.entrada.getTime());
}
