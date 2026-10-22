import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from '@/database/BaseRepository';
import Animal from '@/entities/Animal';

export interface CreateAnimalDTO {
  brinco: string;
  nome?: string;
  raca?: string;
  pesoKg?: number;
  producaoLeiteL?: number;
  crias?: number;
  racaoKgDia?: number;
  talhaoId?: string;
  paiBrinco?: string;
  maeBrinco?: string;
  dataNascimento?: Date;
}

export interface UpdateAnimalDTO {
  brinco?: string;
  nome?: string;
  raca?: string;
  pesoKg?: number;
  producaoLeiteL?: number;
  crias?: number;
  racaoKgDia?: number;
  talhaoId?: string;
  paiBrinco?: string;
  maeBrinco?: string;
  dataNascimento?: Date;
}

export class AnimalRepository extends BaseRepository<Animal> {
  constructor(db?: Database) {
    super(Animal.table, db);
  }

  async createAnimal(dto: CreateAnimalDTO): Promise<Animal> {
    return await this.create((animal) => {
      animal.brinco = dto.brinco;
      animal.nome = dto.nome;
      animal.raca = dto.raca;
      animal.pesoKg = dto.pesoKg;
      animal.producaoLeiteL = dto.producaoLeiteL;
      animal.crias = dto.crias ?? 0;
      animal.racaoKgDia = dto.racaoKgDia;
      animal.talhaoId = dto.talhaoId;
      animal.paiBrinco = dto.paiBrinco;
      animal.maeBrinco = dto.maeBrinco;
      animal.dataNascimento = dto.dataNascimento;
    });
  }

  async updateAnimal(id: string, dto: UpdateAnimalDTO): Promise<Animal> {
    return await this.update(id, (animal) => {
      if (dto.brinco !== undefined) animal.brinco = dto.brinco;
      if (dto.nome !== undefined) animal.nome = dto.nome;
      if (dto.raca !== undefined) animal.raca = dto.raca;
      if (dto.pesoKg !== undefined) animal.pesoKg = dto.pesoKg;
      if (dto.producaoLeiteL !== undefined) animal.producaoLeiteL = dto.producaoLeiteL;
      if (dto.crias !== undefined) animal.crias = dto.crias;
      if (dto.racaoKgDia !== undefined) animal.racaoKgDia = dto.racaoKgDia;
      if (dto.talhaoId !== undefined) animal.talhaoId = dto.talhaoId;
      if (dto.paiBrinco !== undefined) animal.paiBrinco = dto.paiBrinco;
      if (dto.maeBrinco !== undefined) animal.maeBrinco = dto.maeBrinco;
      if (dto.dataNascimento !== undefined) animal.dataNascimento = dto.dataNascimento;
    });
  }

  async findByBrinco(brinco: string): Promise<Animal | null> {
    const results = await this.collection.query(Q.where('brinco', brinco)).fetch();
    return results.length > 0 ? results[0] : null;
  }

  async getByTalhao(talhaoId: string): Promise<Animal[]> {
    return await this.collection.query(Q.where('talhao_id', talhaoId)).fetch();
  }

  observeByTalhao(talhaoId: string): Observable<Animal[]> {
    return this.collection.query(Q.where('talhao_id', talhaoId)).observe();
  }
}

export const animalRepository = new AnimalRepository();
