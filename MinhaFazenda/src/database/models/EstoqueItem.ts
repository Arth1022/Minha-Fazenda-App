import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class EstoqueItem extends Model {
  static table = 'estoque_itens';

  @field('categoria') categoria!: string; // 'insumo' | 'medicamento' | 'peca_maquina' | etc.
  @field('nome') nome!: string;
  @field('quantidade') quantidade!: number;
  @field('unidade') unidade!: string;
  @field('estoque_minimo') estoqueMinimo?: number;

  @readonly @date('criado_em') criadoEm!: Date;
  @readonly @date('atualizado_em') atualizadoEm!: Date;
}
