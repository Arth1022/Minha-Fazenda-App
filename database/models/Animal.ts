import { Model, Query, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import Talhao from './Talhao';
import Tratamento from './Tratamento';

export default class Animal extends Model {
  static table = 'animais';

  
  static associations = {
    talhoes: { type: 'belongs_to', key: 'talhao_id' },
    tratamentos: { type: 'has_many', foreignKey: 'animal_id' },
  } as const; //validando relacionamento

  @field('brinco') brinco!: string;
  @field('nome') nome?: string;
  @field('raca') raca?: string;
  @field('peso_kg') pesoKg?: number;
  @field('producao_leite_l') producaoLeiteL?: number;
  @field('crias') crias?: number;
  @field('racao_kg_dia') racaoKgDia?: number;
  @field('talhao_id') talhaoId?: string;

  // Relacionamentos
  @relation('talhoes', 'talhao_id') talhao!: Relation<Talhao>;
  @children('tratamentos') tratamentos!: Query<Tratamento>;

  @readonly @date('criado_em') criadoEm!: Date;
  @readonly @date('atualizado_em') atualizadoEm!: Date;
}