import { Database, Q } from '@nozbe/watermelondb';
import { BaseRepository } from '@/database/BaseRepository';
import Talhao from '@/entities/Talhao';

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
  constructor(db?: Database) {
    super(Talhao.table, db);
  }

  async createTalhao(dto: CreateTalhaoDTO): Promise<Talhao> {
    return await this.create((talhao) => {
      talhao.nome = dto.nome;
      talhao.tipo = dto.tipo;
      talhao.areaHa = dto.areaHa;
      talhao.poligonoGeoJson = dto.poligonoGeoJson;
      talhao.possuiCerca = dto.possuiCerca ?? false;
    });
  }

  async updateTalhao(id: string, dto: UpdateTalhaoDTO): Promise<Talhao> {
    return await this.update(id, (talhao) => {
      if (dto.nome !== undefined) talhao.nome = dto.nome;
      if (dto.tipo !== undefined) talhao.tipo = dto.tipo;
      if (dto.areaHa !== undefined) talhao.areaHa = dto.areaHa;
      if (dto.poligonoGeoJson !== undefined) talhao.poligonoGeoJson = dto.poligonoGeoJson;
      if (dto.possuiCerca !== undefined) talhao.possuiCerca = dto.possuiCerca;
    });
  }

  async findByName(nome: string): Promise<Talhao | null> {
    const results = await this.collection.query(Q.where('nome', nome)).fetch();
    return results.length > 0 ? results[0] : null;
  }

  async getFencedTalhoes(): Promise<Talhao[]> {
    return await this.collection.query(Q.where('possui_cerca', true)).fetch();
  }
}

export const talhaoRepository = new TalhaoRepository();
