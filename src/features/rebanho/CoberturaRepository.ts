import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from '@/database/BaseRepository';
import Cobertura, { type TipoCobertura } from '@/entities/Cobertura';

export interface CreateCoberturaDTO {
  animalId: string;
  data: Date;
  tipo: TipoCobertura;
  touroSemen?: string;
}

export class CoberturaRepository extends BaseRepository<Cobertura> {
  constructor(db?: Database) {
    super(Cobertura.table, db);
  }

  async createCobertura(dto: CreateCoberturaDTO): Promise<Cobertura> {
    return await this.create((cobertura) => {
      cobertura.animalId = dto.animalId;
      cobertura.data = dto.data;
      cobertura.tipo = dto.tipo;
      cobertura.touroSemen = dto.touroSemen;
    });
  }

  async getByAnimal(animalId: string): Promise<Cobertura[]> {
    return await this.collection
      .query(Q.where('animal_id', animalId), Q.sortBy('data', Q.desc))
      .fetch();
  }

  observeByAnimal(animalId: string): Observable<Cobertura[]> {
    return this.collection
      .query(Q.where('animal_id', animalId), Q.sortBy('data', Q.desc))
      .observe();
  }
}

export const coberturaRepository = new CoberturaRepository();
