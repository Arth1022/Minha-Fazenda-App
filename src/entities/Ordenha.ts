import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export type PeriodoOrdenha = 'manha' | 'tarde';

export default class Ordenha extends Model {
  static table = 'ordenhas';

  @field('periodo') periodo!: PeriodoOrdenha;
  @field('horario_previsto') horarioPrevisto?: string;
  @field('horario_notificacao') horarioNotificacao?: string;
  @field('volume_litros') volumeLitros?: number;
  @date('data_registro') dataRegistro!: Date;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
