import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export type PeriodoOrdenha = 'manha' | 'tarde';

export default class Ordenha extends Model {
  static table = 'ordenhas';

  @field('periodo') periodo!: PeriodoOrdenha;
  @field('horario_previsto') horarioPrevisto?: string; // Formato "06:00"
  @field('horario_notificacao') horarioNotificacao?: string;
  @field('volume_litros') volumeLitros?: number;
  @date('data_registro') dataRegistro!: Date;

  @readonly @date('criado_em') criadoEm!: Date;
  @readonly @date('atualizado_em') atualizadoEm!: Date;
}
