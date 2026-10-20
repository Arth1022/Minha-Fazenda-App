import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class EstoqueItem extends Model {
  static table = 'estoque_itens';

  @field('categoria') categoria!: string;
  @field('nome') nome!: string;
  @field('quantidade') quantidade!: number;
  @field('unidade') unidade!: string;
  @field('estoque_minimo') estoqueMinimo?: number;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
