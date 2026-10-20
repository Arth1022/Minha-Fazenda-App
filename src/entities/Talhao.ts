import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children, writer } from '@nozbe/watermelondb/decorators';
import type Animal from './Animal';

export type TipoTalhao = 'pastagem' | 'lavoura' | 'reserva' | 'outro';

export default class Talhao extends Model {
  static table = 'talhoes';

  static associations = {
    animais: { type: 'has_many' as const, foreignKey: 'talhao_id' },
  };

  @field('nome') nome!: string;
  @field('tipo') tipo?: TipoTalhao;
  @field('area_ha') areaHa?: number;
  @field('poligono_geojson') poligonoGeoJson?: string;
  @field('possui_cerca') possuiCerca?: boolean;

  @children('animais') animais!: Query<Animal>;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @writer async deleteCascade(): Promise<void> {
    const animais = await this.animais.fetch();
    for (const animal of animais) {
      await animal.tratamentos.markAllAsDeleted();
    }
    await this.animais.markAllAsDeleted();
    await this.markAsDeleted();
  }
}
