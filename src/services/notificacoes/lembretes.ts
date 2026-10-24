import type {
  CanalId,
  Lembrete,
  NovaNotificacao,
  PeriodoOrdenha,
  TipoLembrete,
} from '@/dtos';

import { parseHorario } from './gatilhos';
import { cancelarNotificacoesDe, substituirNotificacoesDe } from './vinculos';

/** Datas sem horário (meia-noite) avisam neste horário do dia, não de madrugada. */
export const HORARIO_PADRAO_LEMBRETE = '07:00';

const CANAL_DO_LEMBRETE: Record<TipoLembrete, CanalId> = {
  dose: 'saude',
  fim_carencia: 'saude',
  vacina: 'saude',
  parto: 'reproducao',
};

/** Momento do aviso: a própria data, ou o horário padrão se ela não tem hora. */
export function horarioDoAviso(data: Date): Date {
  const semHora =
    data.getHours() === 0 && data.getMinutes() === 0 && data.getSeconds() === 0;
  if (!semHora) return data;
  const { hora, minuto } = parseHorario(HORARIO_PADRAO_LEMBRETE)!;
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), hora, minuto);
}

/** Converte o lembrete na notificação; tocar nela abre a ficha do animal. */
export function notificacaoDoLembrete(lembrete: Lembrete): Omit<NovaNotificacao, 'id'> {
  return {
    titulo: lembrete.titulo,
    quando: { tipo: 'data', data: horarioDoAviso(lembrete.data) },
    canal: CANAL_DO_LEMBRETE[lembrete.tipo],
    url: `/animal/${lembrete.animalId}`,
    dados: { lembreteId: lembrete.id, tipo: lembrete.tipo, animalId: lembrete.animalId },
  };
}

/**
 * Cancela os lembretes agendados do animal e agenda os novos (os que já passaram
 * ficam de fora). Chamar depois de salvar algo que muda os lembretes do animal.
 */
export function reagendarLembretesDoAnimal(
  animalId: string,
  lembretes: Lembrete[],
  agora = new Date()
): Promise<string[]> {
  const doAnimal = lembretes.filter((l) => l.animalId === animalId);
  return substituirNotificacoesDe(
    { entidade: 'animal', entidadeId: animalId },
    doAnimal.map(notificacaoDoLembrete),
    agora
  );
}

/** Cancela todos os lembretes do animal (saída do rebanho ou exclusão). */
export function cancelarLembretesDoAnimal(animalId: string): Promise<void> {
  return cancelarNotificacoesDe({ entidade: 'animal', entidadeId: animalId });
}

const TURNO: Record<PeriodoOrdenha, string> = {
  manha: 'da manhã',
  tarde: 'da tarde',
  noite: 'da noite',
};

/**
 * Lembrete diário de um turno de ordenha no horário "HH:mm" (o `horarioNotificacao`
 * da ordenha). `horario` null desliga o lembrete do turno.
 */
export async function reagendarLembreteOrdenha(
  periodo: PeriodoOrdenha,
  horario: string | null
): Promise<void> {
  const vinculo = { entidade: 'ordenha', entidadeId: periodo } as const;
  if (!horario) return cancelarNotificacoesDe(vinculo);
  await substituirNotificacoesDe(vinculo, [
    {
      titulo: `Hora da ordenha ${TURNO[periodo]}`,
      quando: { tipo: 'diario', horario },
      canal: 'ordenha',
      url: '/',
    },
  ]);
}
