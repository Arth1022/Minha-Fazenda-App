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

  /**
   * Cria um novo item de estoque.
   */
  async createItem(dto: CreateEstoqueDTO): Promise<EstoqueItem> {
    return await this.create((item) => {
      item.categoria = dto.categoria;
      item.nome = dto.nome;
      item.quantidade = dto.quantidade;
      item.unidade = dto.unidade;
      if (dto.estoqueMinimo !== undefined) item.estoqueMinimo = dto.estoqueMinimo;
    });
  }

  /**
   * Atualiza um item de estoque existente.
   */
  async updateItem(id: string, dto: UpdateEstoqueDTO): Promise<EstoqueItem> {
    return await this.update(id, (item) => {
      if (dto.categoria !== undefined) item.categoria = dto.categoria;
      if (dto.nome !== undefined) item.nome = dto.nome;
      if (dto.quantidade !== undefined) item.quantidade = dto.quantidade;
      if (dto.unidade !== undefined) item.unidade = dto.unidade;
      if (dto.estoqueMinimo !== undefined) item.estoqueMinimo = dto.estoqueMinimo;
    });
  }

  /**
   * Ajusta a quantidade de um item (positiva para entrada, negativa para saída).
   */
  async adjustQuantity(id: string, delta: number): Promise<EstoqueItem> {
    const item = await this.getById(id);
    return await this.update(id, (rec) => {
      rec.quantidade = Math.max(0, (item.quantidade || 0) + delta);
    });
  }

  /**
   * Busca itens por categoria (ex: 'insumo', 'medicamento', 'peca_maquina').
   */
  async getByCategoria(categoria: string): Promise<EstoqueItem[]> {
    return await this.collection.query(Q.where('categoria', categoria)).fetch();
  }

  /**
   * Observa itens por categoria.
   */
  observeByCategoria(categoria: string): Observable<EstoqueItem[]> {
    return this.collection.query(Q.where('categoria', categoria)).observe();
  }

  /**
   * Retorna itens com estoque baixo (quantidade <= estoque_minimo).
   */
  async getLowStockItems(): Promise<EstoqueItem[]> {
    const all = await this.getAll();
    return all.filter(
      (item) => item.estoqueMinimo != null && item.quantidade <= item.estoqueMinimo
    );
  }
}

export const estoqueRepository = new EstoqueRepository();
