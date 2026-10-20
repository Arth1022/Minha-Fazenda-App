import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from '@/database/BaseRepository';
import EstoqueItem, { CategoriaEstoque } from '@/entities/EstoqueItem';

export interface CreateEstoqueItemDTO {
  categoria: CategoriaEstoque;
  nome: string;
  quantidade: number;
  unidade: string;
  estoqueMinimo?: number;
}

export interface UpdateEstoqueItemDTO {
  categoria?: CategoriaEstoque;
  nome?: string;
  quantidade?: number;
  unidade?: string;
  estoqueMinimo?: number;
}

export class EstoqueRepository extends BaseRepository<EstoqueItem> {
  constructor(db?: Database) {
    super(EstoqueItem.table, db);
  }

  async createItem(dto: CreateEstoqueItemDTO): Promise<EstoqueItem> {
    return await this.create((item) => {
      item.categoria = dto.categoria;
      item.nome = dto.nome;
      item.quantidade = dto.quantidade;
      item.unidade = dto.unidade;
      item.estoqueMinimo = dto.estoqueMinimo ?? 0;
    });
  }

  async updateItem(id: string, dto: UpdateEstoqueItemDTO): Promise<EstoqueItem> {
    return await this.update(id, (item) => {
      if (dto.categoria !== undefined) item.categoria = dto.categoria;
      if (dto.nome !== undefined) item.nome = dto.nome;
      if (dto.quantidade !== undefined) item.quantidade = dto.quantidade;
      if (dto.unidade !== undefined) item.unidade = dto.unidade;
      if (dto.estoqueMinimo !== undefined) item.estoqueMinimo = dto.estoqueMinimo;
    });
  }

  async adjustQuantity(id: string, delta: number): Promise<EstoqueItem> {
    return await this.update(id, (item) => {
      item.quantidade = Math.max(0, (item.quantidade || 0) + delta);
    });
  }

  async getByCategory(categoria: CategoriaEstoque): Promise<EstoqueItem[]> {
    return await this.collection.query(Q.where('categoria', categoria)).fetch();
  }

  observeByCategory(categoria: CategoriaEstoque): Observable<EstoqueItem[]> {
    return this.collection.query(Q.where('categoria', categoria)).observe();
  }

  async getLowStockItems(): Promise<EstoqueItem[]> {
    const allItems = await this.getAll();
    return allItems.filter(
      (item) => item.estoqueMinimo !== undefined && item.quantidade <= item.estoqueMinimo
    );
  }
}

export const estoqueRepository = new EstoqueRepository();
