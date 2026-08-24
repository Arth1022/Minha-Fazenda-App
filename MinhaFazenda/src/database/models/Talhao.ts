import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type Animal from './Animal';

export default class Talhao extends Model {
  static table = 'talhoes';

  static associations = {
    animais: { type: 'has_many' as const, foreignKey: 'talhao_id' },
  };

  @field('nome') nome!: string;
  @field('tipo') tipo?: string;
  @field('area_ha') areaHa?: number;
  @field('poligono_geojson') poligonoGeoJson?: string;
  @field('possui_cerca') possuiCerca?: boolean;

  // Relacionamento com a classe Animal
  @children('animais') animais!: Query<Animal>;

  @readonly @date('criado_em') criadoEm!: Date;
  @readonly @date('atualizado_em') atualizadoEm!: Date;
}
