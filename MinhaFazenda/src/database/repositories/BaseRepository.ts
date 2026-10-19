import { Collection, Database, Model, Query } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { database } from '../index';

export class BaseRepository<T extends Model> {
  private _db?: Database;
  protected readonly tableName: string;

  constructor(tableName: string, db?: Database) {
    this.tableName = tableName;
    this._db = db;
  }

  get db(): Database {
    return this._db || database;
  }

  get collection(): Collection<T> {
    return this.db.get<T>(this.tableName);
  }

  /**
   * Busca todos os registros da tabela.
   */
  async getAll(): Promise<T[]> {
    return await this.collection.query().fetch();
  }

  /**
   * Busca um registro por ID. Lança erro caso não encontre.
   */
  async getById(id: string): Promise<T> {
    return await this.collection.find(id);
  }

  /**
   * Busca um registro por ID de forma segura (retorna null se não encontrar).
   */
  async find(id: string): Promise<T | null> {
    try {
      return await this.collection.find(id);
    } catch {
      return null;
    }
  }

  /**
   * Retorna um Observable com todos os registros para reatividade no React/UI.
   */
  observeAll(): Observable<T[]> {
    return this.collection.query().observe();
  }

  /**
   * Retorna um Observable de um registro específico pelo ID.
   */
  observeById(id: string): Observable<T> {
    return this.collection.findAndObserve(id);
  }

  /**
   * Executa uma consulta customizada usando cláusulas Q do WatermelonDB.
   */
  query(...clauses: Parameters<Collection<T>['query']>): Query<T> {
    return this.collection.query(...clauses);
  }

  /**
   * Cria um novo registro em transação.
   */
  async create(recordBuilder: (record: T) => void): Promise<T> {
    return await this.db.write(async () => {
      return await this.collection.create(recordBuilder);
    });
  }

  /**
   * Atualiza um registro existente em transação.
   */
  async update(id: string, recordUpdater: (record: T) => void): Promise<T> {
    const record = await this.getById(id);
    return await this.db.write(async () => {
      return await record.update(recordUpdater);
    });
  }

  /**
   * Deleta (soft-delete ou marca para sincronização) um registro por ID.
   */
  async delete(id: string): Promise<void> {
    const record = await this.getById(id);
    await this.db.write(async () => {
      await record.markAsDeleted();
    });
  }

  /**
   * Remove permanentemente um registro por ID.
   */
  async destroyPermanently(id: string): Promise<void> {
    const record = await this.getById(id);
    await this.db.write(async () => {
      await record.destroyPermanently();
    });
  }

  /**
   * Deleta permanentemente todos os registros da tabela (útil para testes/resets).
   */
  async deleteAll(): Promise<void> {
    const allRecords = await this.getAll();
    if (allRecords.length === 0) return;

    await this.db.write(async () => {
      const batchOperations = allRecords.map((record) => record.prepareDestroyPermanently());
      await this.db.batch(...batchOperations);
    });
  }

  /**
   * Retorna a contagem total de registros na tabela.
   */
  async count(): Promise<number> {
    return await this.collection.query().fetchCount();
  }
}
