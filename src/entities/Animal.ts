import { Model, Query, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children, writer } from '@nozbe/watermelondb/decorators';
import type Talhao from './Talhao';
import type Tratamento from './Tratamento';

export default class Animal extends Model {
  static table = 'animais';

  static associations = {
    talhoes: { type: 'belongs_to' as const, key: 'talhao_id' },
    tratamentos: { type: 'has_many' as const, foreignKey: 'animal_id' },
  };

  @field('brinco') brinco!: string;
  @field('nome') nome?: string;
  @field('raca') raca?: string;
  @field('peso_kg') pesoKg?: number;
  @field('producao_leite_l') producaoLeiteL?: number;
  @field('crias') crias?: number;
  @field('racao_kg_dia') racaoKgDia?: number;
  @field('talhao_id') talhaoId?: string;

  @relation('talhoes', 'talhao_id') talhao!: Relation<Talhao>;
  @children('tratamentos') tratamentos!: Query<Tratamento>;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @writer async deleteCascade(): Promise<void> {
    await this.tratamentos.markAllAsDeleted();
    await this.markAsDeleted();
  }
}
