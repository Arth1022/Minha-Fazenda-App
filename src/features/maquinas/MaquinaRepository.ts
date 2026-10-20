import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from '@/database';
import Maquina from '@/entities/Maquina';

export interface CreateMaquinaDTO {
  nome: string;
  statusPercentual?: number;
  manutencaoDevida?: boolean;
}

export interface UpdateMaquinaDTO {
  nome?: string;
  statusPercentual?: number;
  manutencaoDevida?: boolean;
}

export class MaquinaRepository extends BaseRepository<Maquina> {
  constructor(db?: Database) {
    super(Maquina.table, db);
  }

  async createMaquina(dto: CreateMaquinaDTO): Promise<Maquina> {
    return await this.create((maquina) => {
      maquina.nome = dto.nome;
      maquina.statusPercentual = dto.statusPercentual ?? 100;
      maquina.manutencaoDevida = dto.manutencaoDevida ?? false;
    });
  }

  async updateMaquina(id: string, dto: UpdateMaquinaDTO): Promise<Maquina> {
    return await this.update(id, (maquina) => {
      if (dto.nome !== undefined) maquina.nome = dto.nome;
      if (dto.statusPercentual !== undefined) maquina.statusPercentual = dto.statusPercentual;
      if (dto.manutencaoDevida !== undefined) maquina.manutencaoDevida = dto.manutencaoDevida;
    });
  }

  async getMaintenanceDue(): Promise<Maquina[]> {
    return await this.collection.query(Q.where('manutencao_devida', true)).fetch();
  }

  observeMaintenanceDue(): Observable<Maquina[]> {
    return this.collection.query(Q.where('manutencao_devida', true)).observe();
  }
}

export const maquinaRepository = new MaquinaRepository();
