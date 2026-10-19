import { Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import Talhao from '../models/Talhao';

export interface CreateTalhaoDTO {
  nome: string;
  tipo?: string;
  areaHa?: number;
  poligonoGeoJson?: string;
  possuiCerca?: boolean;
}

export interface UpdateTalhaoDTO {
  nome?: string;
  tipo?: string;
  areaHa?: number;
  poligonoGeoJson?: string;
  possuiCerca?: boolean;
}

export class TalhaoRepository extends BaseRepository<Talhao> {
  constructor() {
    super(Talhao.table);
  }

  /**
   * Cria um talhão a partir de um DTO.
   */
  async createTalhao(dto: CreateTalhaoDTO): Promise<Talhao> {
    return await this.create((talhao) => {
      talhao.nome = dto.nome;
      if (dto.tipo !== undefined) talhao.tipo = dto.tipo;
      if (dto.areaHa !== undefined) talhao.areaHa = dto.areaHa;
      if (dto.poligonoGeoJson !== undefined) talhao.poligonoGeoJson = dto.poligonoGeoJson;
      if (dto.possuiCerca !== undefined) talhao.possuiCerca = dto.possuiCerca;
    });
  }

  /**
   * Atualiza um talhão a partir de um DTO.
   */
  async updateTalhao(id: string, dto: UpdateTalhaoDTO): Promise<Talhao> {
    return await this.update(id, (talhao) => {
      if (dto.nome !== undefined) talhao.nome = dto.nome;
      if (dto.tipo !== undefined) talhao.tipo = dto.tipo;
      if (dto.areaHa !== undefined) talhao.areaHa = dto.areaHa;
      if (dto.poligonoGeoJson !== undefined) talhao.poligonoGeoJson = dto.poligonoGeoJson;
      if (dto.possuiCerca !== undefined) talhao.possuiCerca = dto.possuiCerca;
    });
  }

  /**
   * Busca um talhão pelo nome.
   */
  async findByName(nome: string): Promise<Talhao | null> {
    const results = await this.collection.query(Q.where('nome', nome)).fetch();
    return results.length > 0 ? results[0] : null;
  }
}

export const talhaoRepository = new TalhaoRepository();
