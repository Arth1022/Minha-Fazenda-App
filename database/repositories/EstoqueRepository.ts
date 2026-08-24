import { Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import EstoqueItem from '../models/EstoqueItem';

export interface CreateEstoqueDTO {
  categoria: string;
  nome: string;
  quantidade: number;
  unidade: string;
  estoqueMinimo?: number;
}

export interface UpdateEstoqueDTO {
  categoria?: string;
  nome?: string;
  quantidade?: number;
  unidade?: string;
  estoqueMinimo?: number;
}

export class EstoqueRepository extends BaseRepository<EstoqueItem> {
  constructor() {
    super(EstoqueItem.table);
  }

  async createItem(dto: CreateEstoqueDTO): Promise<EstoqueItem> {
    return await this.create((item) => {
      item.categoria = dto.categoria;
      item.nome = dto.nome;
      item.quantidade = dto.quantidade;
      item.unidade = dto.unidade;
      if (dto.estoqueMinimo !== undefined) item.estoqueMinimo = dto.estoqueMinimo;
    });
  }

  async updateItem(id: string, dto: UpdateEstoqueDTO): Promise<EstoqueItem> {
    return await this.update(id, (item) => {
      if (dto.categoria !== undefined) item.categoria = dto.categoria;
      if (dto.nome !== undefined) item.nome = dto.nome;
      if (dto.quantidade !== undefined) item.quantidade = dto.quantidade;
      if (dto.unidade !== undefined) item.unidade = dto.unidade;
      if (dto.estoqueMinimo !== undefined) item.estoqueMinimo = dto.estoqueMinimo;
    });
  }

  async adjustQuantity(id: string, delta: number): Promise<EstoqueItem> {
    const item = await this.getById(id);
    return await this.update(id, (rec) => {
      rec.quantidade = Math.max(0, (item.quantidade || 0) + delta);
    });
  }

  async getByCategoria(categoria: string): Promise<EstoqueItem[]> {
    return await this.collection.query(Q.where('categoria', categoria)).fetch();
  }

  observeByCategoria(categoria: string): Observable<EstoqueItem[]> {
    return this.collection.query(Q.where('categoria', categoria)).observe();
  }

  async getLowStockItems(): Promise<EstoqueItem[]> {
    const all = await this.getAll();
    return all.filter(
      (item) => item.estoqueMinimo != null && item.quantidade <= item.estoqueMinimo
    );
  }
}

export const estoqueRepository = new EstoqueRepository();
