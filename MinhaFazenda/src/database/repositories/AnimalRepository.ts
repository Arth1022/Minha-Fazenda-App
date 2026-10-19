import { Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import Animal from '../models/Animal';

export interface CreateAnimalDTO {
  brinco: string;
  nome?: string;
  raca?: string;
  pesoKg?: number;
  producaoLeiteL?: number;
  crias?: number;
  racaoKgDia?: number;
  talhaoId?: string;
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
}

export class AnimalRepository extends BaseRepository<Animal> {
  constructor() {
    super(Animal.table);
  }

  /**
   * Cria um animal a partir de um DTO.
   */
  async createAnimal(dto: CreateAnimalDTO): Promise<Animal> {
    return await this.create((animal) => {
      animal.brinco = dto.brinco;
      if (dto.nome !== undefined) animal.nome = dto.nome;
      if (dto.raca !== undefined) animal.raca = dto.raca;
      if (dto.pesoKg !== undefined) animal.pesoKg = dto.pesoKg;
      if (dto.producaoLeiteL !== undefined) animal.producaoLeiteL = dto.producaoLeiteL;
      if (dto.crias !== undefined) animal.crias = dto.crias;
      if (dto.racaoKgDia !== undefined) animal.racaoKgDia = dto.racaoKgDia;
      if (dto.talhaoId !== undefined) animal.talhaoId = dto.talhaoId;
    });
  }

  /**
   * Atualiza um animal a partir de um DTO.
   */
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
    });
  }

  /**
   * Busca um animal pelo número do brinco.
   */
  async findByBrinco(brinco: string): Promise<Animal | null> {
    const results = await this.collection.query(Q.where('brinco', brinco)).fetch();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Retorna todos os animais vinculados a um talhão.
   */
  async getByTalhao(talhaoId: string): Promise<Animal[]> {
    return await this.collection.query(Q.where('talhao_id', talhaoId)).fetch();
  }

  /**
   * Retorna um Observable de animais vinculados a um talhão.
   */
  observeByTalhao(talhaoId: string): Observable<Animal[]> {
    return this.collection.query(Q.where('talhao_id', talhaoId)).observe();
  }
}

export const animalRepository = new AnimalRepository();
