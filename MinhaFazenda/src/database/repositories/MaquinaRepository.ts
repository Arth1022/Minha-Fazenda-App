import { Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import Maquina from '../models/Maquina';

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
  constructor() {
    super(Maquina.table);
  }

  /**
   * Registra uma nova máquina ou equipamento.
   */
  async createMaquina(dto: CreateMaquinaDTO): Promise<Maquina> {
    return await this.create((maquina) => {
      maquina.nome = dto.nome;
      if (dto.statusPercentual !== undefined) maquina.statusPercentual = dto.statusPercentual;
      if (dto.manutencaoDevida !== undefined) maquina.manutencaoDevida = dto.manutencaoDevida;
    });
  }

  /**
   * Atualiza os dados de uma máquina.
   */
  async updateMaquina(id: string, dto: UpdateMaquinaDTO): Promise<Maquina> {
    return await this.update(id, (maquina) => {
      if (dto.nome !== undefined) maquina.nome = dto.nome;
      if (dto.statusPercentual !== undefined) maquina.statusPercentual = dto.statusPercentual;
      if (dto.manutencaoDevida !== undefined) maquina.manutencaoDevida = dto.manutencaoDevida;
    });
  }

  /**
   * Retorna máquinas que precisam de manutenção (manutenção devida ou status crítico < 50%).
   */
  async getNeedingMaintenance(): Promise<Maquina[]> {
    return await this.collection
      .query(Q.or(Q.where('manutencao_devida', true), Q.where('status_percentual', Q.lte(50))))
      .fetch();
  }

  /**
   * Observa máquinas precisando de manutenção em tempo real.
   */
  observeNeedingMaintenance(): Observable<Maquina[]> {
    return this.collection
      .query(Q.or(Q.where('manutencao_devida', true), Q.where('status_percentual', Q.lte(50))))
      .observe();
  }
}

export const maquinaRepository = new MaquinaRepository();
