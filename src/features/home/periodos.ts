import type { AppIconName } from '@/components/ui';
import type { PeriodoOrdenha } from '@/database';

export interface PeriodoConfig {
  value: PeriodoOrdenha;
  label: string;
  icon: AppIconName;
  iconColor: string;
}

/** Turnos de ordenha, na ordem em que aparecem na Home. */
export const PERIODOS: PeriodoConfig[] = [
  { value: 'manha', label: 'Manhã', icon: 'sun', iconColor: '#D97706' },
  { value: 'tarde', label: 'Tarde', icon: 'sunset', iconColor: '#EA580C' },
  { value: 'noite', label: 'Noite', icon: 'moon', iconColor: '#6366F1' },
];

/** Exibido no lugar do horário enquanto o turno não foi agendado. */
export const SEM_HORARIO = '--:--';
