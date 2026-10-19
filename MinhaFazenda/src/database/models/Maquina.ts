import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Maquina extends Model {
  static table = 'maquinas';

  @field('nome') nome!: string;
  @field('status_percentual') statusPercentual?: number;
  @field('manutencao_devida') manutencaoDevida?: boolean;

  @readonly @date('criado_em') criadoEm!: Date;
  @readonly @date('atualizado_em') atualizadoEm!: Date;
}
