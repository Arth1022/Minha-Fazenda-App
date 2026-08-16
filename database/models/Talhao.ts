import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import Animal from './Animal';

export default class Talhao extends Model {
  static table = 'talhoes';

  static associations = {
    animais: { type: 'has_many', foreignKey: 'talhao_id' },
  } as const;

  @field('nome') nome!: string;
  @field('tipo') tipo?: string;
  @field('area_ha') areaHa?: number;
  @field('poligono_geojson') poligonoGeoJson?: string; // Armazenado como string JSON(validar depois essa porra)
  @field('possui_cerca') possuiCerca?: boolean;

  // Relacionamento com a classe Animal
  @children('animais') animais!: Query<Animal>;

  @readonly @date('criado_em') criadoEm!: Date;
  @readonly @date('atualizado_em') atualizadoEm!: Date;
}