import type { EtapaCiclo } from '@/database';
import type { NovaNotificacao } from '@/dtos';
import { adicionarDias, formatDiaMes } from '@/utils/date';

import { horarioDoAviso } from './lembretes';
import { cancelarNotificacoesDe, substituirNotificacoesDe } from './vinculos';

export interface DadosLembretesCiclo {
  cicloId: string;
  areaId: string;
  nomeArea: string;
  cultura: string;
  etapas: readonly Pick<EtapaCiclo, 'id' | 'nome' | 'previstaEm' | 'realizadaEm'>[];
}

/**
 * Avisos das etapas do ciclo (RF-043): na véspera ("Amanhã: Pulverização") e no
 * dia seguinte, se ainda não foi marcada ("Atrasada: ..."), às 7h. Marcar a
 * etapa feita reagenda e o aviso de atraso some. Tocar abre a linha do tempo.
 */
export function lembretesDoCiclo(dados: DadosLembretesCiclo, agora = new Date()): Omit<NovaNotificacao, 'id'>[] {
  const url = `/mapa-fazenda?talhao=${encodeURIComponent(dados.areaId)}&vista=ciclo`;
  const local = `${dados.nomeArea} · ${dados.cultura}`;
  const avisos: Omit<NovaNotificacao, 'id'>[] = [];
  for (const etapa of dados.etapas) {
    if (etapa.realizadaEm) continue;
    const comum = {
      canal: 'lavoura' as const,
      url,
      dados: { cicloId: dados.cicloId, etapaId: etapa.id, areaId: dados.areaId },
    };
    const vespera = horarioDoAviso(adicionarDias(etapa.previstaEm, -1));
    if (vespera > agora) {
      avisos.push({ ...comum, titulo: `Amanhã: ${etapa.nome}`, mensagem: local, quando: { tipo: 'data', data: vespera } });
    }
    const atraso = horarioDoAviso(adicionarDias(etapa.previstaEm, 1));
    if (atraso > agora) {
      avisos.push({
        ...comum,
        titulo: `Atrasada: ${etapa.nome}`,
        mensagem: `${local} · prevista para ${formatDiaMes(etapa.previstaEm)}`,
        quando: { tipo: 'data', data: atraso },
      });
    }
  }
  return avisos;
}

/** Troca os avisos do ciclo pelos das etapas pendentes de agora. */
export function reagendarLembretesDoCiclo(dados: DadosLembretesCiclo, agora = new Date()): Promise<string[]> {
  return substituirNotificacoesDe({ entidade: 'ciclo', entidadeId: dados.cicloId }, lembretesDoCiclo(dados, agora), agora);
}

/** Ciclo colhido ou cancelado: sem avisos. */
export function cancelarLembretesDoCiclo(cicloId: string): Promise<void> {
  return cancelarNotificacoesDe({ entidade: 'ciclo', entidadeId: cicloId });
}
