import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

// Tipo literal para o período da ordenha
export type PeriodoOrdenha = 'manha' | 'tarde';

export default class Ordenha extends Model {
  static table = 'ordenhas';

  @field('periodo') periodo!: PeriodoOrdenha;
  @field('horario_previsto') horarioPrevisto?: string; // Formato de hora,  06:00
  @field('horario_notificacao') horarioNotificacao?: string; // Formato de hora 
  @field('volume_litros') volumeLitros?: number;
  @date('data_registro') dataRegistro!: Date;

  @readonly @date('criado_em') criadoEm!: Date;
  @readonly @date('atualizado_em') atualizadoEm!: Date;
}