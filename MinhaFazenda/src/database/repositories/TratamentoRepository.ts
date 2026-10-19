import { Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import Tratamento from '../models/Tratamento';

export interface CreateTratamentoDTO {
  animalId: string;
  medicamento: string;
  dataInicio: Date;
  dataFim?: Date;
  diasConfirmados?: string;
  proximaDoseEm?: Date;
  notificacaoAtiva?: boolean;
}

export interface UpdateTratamentoDTO {
  medicamento?: string;
  dataInicio?: Date;
  dataFim?: Date;
  diasConfirmados?: string;
  proximaDoseEm?: Date;
  notificacaoAtiva?: boolean;
}

export class TratamentoRepository extends BaseRepository<Tratamento> {
  constructor() {
    super(Tratamento.table);
  }

  /**
   * Cria um tratamento para um animal.
   */
  async createTratamento(dto: CreateTratamentoDTO): Promise<Tratamento> {
    return await this.create((tratamento) => {
      tratamento.animalId = dto.animalId;
      tratamento.medicamento = dto.medicamento;
      tratamento.dataInicio = dto.dataInicio;
      if (dto.dataFim !== undefined) tratamento.dataFim = dto.dataFim;
      if (dto.diasConfirmados !== undefined) tratamento.diasConfirmados = dto.diasConfirmados;
      if (dto.proximaDoseEm !== undefined) tratamento.proximaDoseEm = dto.proximaDoseEm;
      if (dto.notificacaoAtiva !== undefined) tratamento.notificacaoAtiva = dto.notificacaoAtiva;
    });
  }

  /**
   * Atualiza um tratamento existente.
   */
  async updateTratamento(id: string, dto: UpdateTratamentoDTO): Promise<Tratamento> {
    return await this.update(id, (tratamento) => {
      if (dto.medicamento !== undefined) tratamento.medicamento = dto.medicamento;
      if (dto.dataInicio !== undefined) tratamento.dataInicio = dto.dataInicio;
      if (dto.dataFim !== undefined) tratamento.dataFim = dto.dataFim;
      if (dto.diasConfirmados !== undefined) tratamento.diasConfirmados = dto.diasConfirmados;
      if (dto.proximaDoseEm !== undefined) tratamento.proximaDoseEm = dto.proximaDoseEm;
      if (dto.notificacaoAtiva !== undefined) tratamento.notificacaoAtiva = dto.notificacaoAtiva;
    });
  }

  /**
   * Busca tratamentos por ID do animal.
   */
  async getByAnimal(animalId: string): Promise<Tratamento[]> {
    return await this.collection.query(Q.where('animal_id', animalId)).fetch();
  }

  /**
   * Observa tratamentos de um animal específico.
   */
  observeByAnimal(animalId: string): Observable<Tratamento[]> {
    return this.collection.query(Q.where('animal_id', animalId)).observe();
  }

  /**
   * Retorna tratamentos que possuem notificações ativas pendentes.
   */
  async getActiveWithNotification(): Promise<Tratamento[]> {
    return await this.collection.query(Q.where('notificacao_ativa', true)).fetch();
  }
}

export const tratamentoRepository = new TratamentoRepository();
