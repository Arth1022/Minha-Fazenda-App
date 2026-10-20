import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from '@/database';
import Ordenha, { PeriodoOrdenha } from '@/entities/Ordenha';

export interface CreateOrdenhaDTO {
  periodo: PeriodoOrdenha;
  horarioPrevisto?: string;
  horarioNotificacao?: string;
  volumeLitros?: number;
  dataRegistro?: Date;
}

export interface UpdateOrdenhaDTO {
  periodo?: PeriodoOrdenha;
  horarioPrevisto?: string;
  horarioNotificacao?: string;
  volumeLitros?: number;
  dataRegistro?: Date;
}

export class OrdenhaRepository extends BaseRepository<Ordenha> {
  constructor(db?: Database) {
    super(Ordenha.table, db);
  }

  async createOrdenha(dto: CreateOrdenhaDTO): Promise<Ordenha> {
    return await this.create((ordenha) => {
      ordenha.periodo = dto.periodo;
      ordenha.horarioPrevisto = dto.horarioPrevisto;
      ordenha.horarioNotificacao = dto.horarioNotificacao;
      ordenha.volumeLitros = dto.volumeLitros ?? 0;
      ordenha.dataRegistro = dto.dataRegistro ?? new Date();
    });
  }

  async updateOrdenha(id: string, dto: UpdateOrdenhaDTO): Promise<Ordenha> {
    return await this.update(id, (ordenha) => {
      if (dto.periodo !== undefined) ordenha.periodo = dto.periodo;
      if (dto.horarioPrevisto !== undefined) ordenha.horarioPrevisto = dto.horarioPrevisto;
      if (dto.horarioNotificacao !== undefined) ordenha.horarioNotificacao = dto.horarioNotificacao;
      if (dto.volumeLitros !== undefined) ordenha.volumeLitros = dto.volumeLitros;
      if (dto.dataRegistro !== undefined) ordenha.dataRegistro = dto.dataRegistro;
    });
  }

  async getByPeriodo(periodo: PeriodoOrdenha): Promise<Ordenha[]> {
    return await this.collection.query(Q.where('periodo', periodo)).fetch();
  }

  async getByDate(date: Date): Promise<Ordenha[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return await this.collection
      .query(Q.where('data_registro', Q.between(start.getTime(), end.getTime())))
      .fetch();
  }

  observeByDate(date: Date): Observable<Ordenha[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this.collection
      .query(Q.where('data_registro', Q.between(start.getTime(), end.getTime())))
      .observe();
  }

  async getTotalVolumeByDate(date: Date): Promise<number> {
    const registros = await this.getByDate(date);
    return registros.reduce((sum, item) => sum + (item.volumeLitros || 0), 0);
  }
}

export const ordenhaRepository = new OrdenhaRepository();
