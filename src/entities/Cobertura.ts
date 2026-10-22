import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type Animal from './Animal';

export type TipoCobertura = 'monta_natural' | 'inseminacao';

export default class Cobertura extends Model {
  static table = 'coberturas';

  static associations = {
    animais: { type: 'belongs_to' as const, key: 'animal_id' },
  };

  @field('animal_id') animalId: string;
  @date('data') data: Date;
  @field('tipo') tipo: TipoCobertura;
  @field('touro_semen') touroSemen?: string;

  @relation('animais', 'animal_id') animal: Relation<Animal>;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
