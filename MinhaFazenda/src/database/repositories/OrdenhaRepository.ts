import { Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import Ordenha, { PeriodoOrdenha } from '../models/Ordenha';

export interface CreateOrdenhaDTO {
  periodo: PeriodoOrdenha;
  horarioPrevisto?: string;
  horarioNotificacao?: string;
  volumeLitros?: number;
  dataRegistro: Date;
}

export interface UpdateOrdenhaDTO {
  periodo?: PeriodoOrdenha;
  horarioPrevisto?: string;
  horarioNotificacao?: string;
  volumeLitros?: number;
  dataRegistro?: Date;
}

export class OrdenhaRepository extends BaseRepository<Ordenha> {
  constructor() {
    super(Ordenha.table);
  }

  /**
   * Registra uma ordenha.
   */
  async createOrdenha(dto: CreateOrdenhaDTO): Promise<Ordenha> {
    return await this.create((ordenha) => {
      ordenha.periodo = dto.periodo;
      ordenha.dataRegistro = dto.dataRegistro;
      if (dto.horarioPrevisto !== undefined) ordenha.horarioPrevisto = dto.horarioPrevisto;
      if (dto.horarioNotificacao !== undefined) ordenha.horarioNotificacao = dto.horarioNotificacao;
      if (dto.volumeLitros !== undefined) ordenha.volumeLitros = dto.volumeLitros;
    });
  }

  /**
   * Atualiza registro de ordenha.
   */
  async updateOrdenha(id: string, dto: UpdateOrdenhaDTO): Promise<Ordenha> {
    return await this.update(id, (ordenha) => {
      if (dto.periodo !== undefined) ordenha.periodo = dto.periodo;
      if (dto.dataRegistro !== undefined) ordenha.dataRegistro = dto.dataRegistro;
      if (dto.horarioPrevisto !== undefined) ordenha.horarioPrevisto = dto.horarioPrevisto;
      if (dto.horarioNotificacao !== undefined) ordenha.horarioNotificacao = dto.horarioNotificacao;
      if (dto.volumeLitros !== undefined) ordenha.volumeLitros = dto.volumeLitros;
    });
  }

  /**
   * Busca registros de ordenha em um intervalo de datas.
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<Ordenha[]> {
    return await this.collection
      .query(
        Q.where('data_registro', Q.gte(startDate.getTime())),
        Q.where('data_registro', Q.lte(endDate.getTime()))
      )
      .fetch();
  }

  /**
   * Busca registros de ordenha de uma data específica (dia).
   */
  async getByDate(date: Date): Promise<Ordenha[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return await this.getByDateRange(start, end);
  }

  /**
   * Observa registros de ordenha de uma data específica.
   */
  observeByDate(date: Date): Observable<Ordenha[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this.collection
      .query(
        Q.where('data_registro', Q.gte(start.getTime())),
        Q.where('data_registro', Q.lte(end.getTime()))
      )
      .observe();
  }

  /**
   * Calcula o volume total de leite ordenhado em um dia específico.
   */
  async getTotalVolumeByDate(date: Date): Promise<number> {
    const registros = await this.getByDate(date);
    return registros.reduce((sum, item) => sum + (item.volumeLitros || 0), 0);
  }
}

export const ordenhaRepository = new OrdenhaRepository();
