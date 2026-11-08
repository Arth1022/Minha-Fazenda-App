import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type { Maquina, ParadaUso, UsoMaquina } from '@/dtos';
import { listarTalhoesAtivos } from '@/services/talhaoService';
import { usuarioAtual } from '@/services/usuario';
import { maquinaPorId } from '../data/maquinas';
import { paradasDoUso, pontosGpsDoUso, usoAbertoDoOperador } from '../data/usos';
import { faixaDeTrabalhoKmh } from '../services/padroes';
import { estadoAgora, kmAndados, type EstadoAgora, type PontoLido, type TalhaoDoRastro } from '../services/rastro';
import { useRelogio } from './useRelogio';

/** O estado ("sem sinal") também muda sem ponto novo: confere a cada 5 s. */
const CONFERIR_ESTADO_MS = 5000;

export interface UsoAtual {
  uso: UsoMaquina;
  maquina: Maquina;
  implemento: Maquina | null;
  /** Início da pausa em aberto; null fora de pausa */
  pausaDesde: Date | null;
  /** KM até agora (só com GPS) */
  km: number | null;
  /** Estado pelo último trecho do GPS; null sem GPS */
  agora: EstadoAgora | null;
  /** Rastro até agora, para o desenho da tela Em uso */
  pontos: PontoLido[];
}

/**
 * O uso em andamento de quem está com o celular (no máximo um), com KM e estado
 * calculados a cada ponto novo do GPS. Null quando não há uso aberto.
 */
export function useUsoAtual(): UsoAtual | null {
  const operadorId = usuarioAtual().id;
  const { data: abertos } = useLiveQuery(usoAbertoDoOperador(operadorId), [operadorId]);
  const uso = abertos[0] ?? null;
  const usoId = uso?.id ?? '';

  const { data: maquina } = useLiveQuery(maquinaPorId(uso?.maquinaId ?? ''), [uso?.maquinaId]);
  const { data: implemento } = useLiveQuery(maquinaPorId(uso?.implementoId ?? ''), [uso?.implementoId]);
  const { data: linhasGps } = useLiveQuery(pontosGpsDoUso(usoId), [usoId]);
  const { data: paradas } = useLiveQuery(paradasDoUso(usoId), [usoId]);
  const { data: talhoesBanco } = useLiveQuery(listarTalhoesAtivos());
  const relogio = useRelogio(uso?.rastreado ? CONFERIR_ESTADO_MS : null);

  const talhoes = useMemo<TalhaoDoRastro[]>(
    () =>
      talhoesBanco
        .filter((t) => t.geometriaJson?.coordinates?.[0]?.length >= 4)
        .map((t) => ({
          id: t.id,
          nome: t.nome,
          anel: t.geometriaJson.coordinates[0],
          caixa: { minLat: t.minLat, maxLat: t.maxLat, minLng: t.minLng, maxLng: t.maxLng },
        })),
    [talhoesBanco]
  );

  return useMemo(() => {
    if (!uso || !maquina) return null;
    const pontos: PontoLido[] = linhasGps.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      precisaoM: p.precisaoM,
      velocidadeMs: p.velocidadeMs,
      simulado: p.simulado,
      em: p.registradoEm.getTime(),
    }));
    const pausa = paradas.find((p: ParadaUso) => p.motivo === 'pausa' && p.fim === null) ?? null;
    return {
      uso,
      maquina,
      implemento: implemento ?? null,
      pausaDesde: pausa?.inicio ?? null,
      km: uso.rastreado ? kmAndados(pontos) : null,
      agora: uso.rastreado
        ? estadoAgora(pontos, talhoes, faixaDeTrabalhoKmh(maquina.tipo), relogio.getTime())
        : null,
      pontos,
    };
  }, [uso, maquina, implemento, linhasGps, paradas, talhoes, relogio]);
}
