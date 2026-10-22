import { Model, Query, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children, writer } from '@nozbe/watermelondb/decorators';
import type Cobertura from './Cobertura';
import type Talhao from './Talhao';
import type Tratamento from './Tratamento';

export default class Animal extends Model {
  static table = 'animais';

  static associations = {
    talhoes: { type: 'belongs_to' as const, key: 'talhao_id' },
    tratamentos: { type: 'has_many' as const, foreignKey: 'animal_id' },
    coberturas: { type: 'has_many' as const, foreignKey: 'animal_id' },
  };

  @field('brinco') brinco: string;
  @field('nome') nome?: string;
  @field('raca') raca?: string;
  @field('peso_kg') pesoKg?: number;
  @field('producao_leite_l') producaoLeiteL?: number;
  @field('crias') crias?: number;
  @field('racao_kg_dia') racaoKgDia?: number;
  @field('talhao_id') talhaoId?: string;
  @field('pai_brinco') paiBrinco?: string;
  @field('mae_brinco') maeBrinco?: string;
  @date('data_nascimento') dataNascimento?: Date;

  @relation('talhoes', 'talhao_id') talhao: Relation<Talhao>;
  @children('tratamentos') tratamentos: Query<Tratamento>;
  @children('coberturas') coberturas: Query<Cobertura>;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;

  @writer async deleteCascade(): Promise<void> {
    await this.tratamentos.markAllAsDeleted();
    await this.coberturas.markAllAsDeleted();
    await this.markAsDeleted();
  }
}
