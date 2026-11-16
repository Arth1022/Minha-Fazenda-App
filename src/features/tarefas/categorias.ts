import type { AppIconName } from '@/components/ui';
import type { CategoriaTarefa } from '@/database';

/** Ícone de cada categoria de ocorrência (lista de tarefas, formulário de relato e mapa). */
export const ICONE_CATEGORIA_TAREFA: Record<CategoriaTarefa, AppIconName> = {
  cerca: 'fence',
  animal: 'cow',
  maquina: 'tractor',
  agua: 'droplet',
  pasto: 'sprout',
  outro: 'moreCircle',
};
