import { Collection, Database, Model, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';

/**
 * Repositório base genérico para operações de persistência local no WatermelonDB.
 * Recebe opcionalmente uma instância de Database (útil em testes automatizados).
 */
export abstract class BaseRepository<T extends Model> {
  protected readonly tableName: string;
  private readonly customDb?: Database;

  constructor(tableName: string, db?: Database) {
    this.tableName = tableName;
    this.customDb = db;
  }

  protected get db(): Database {
    if (this.customDb) {
      return this.customDb;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { database } = require('./database') as typeof import('./database');
    return database;
  }

  protected get collection(): Collection<T> {
    return this.db.get<T>(this.tableName);
  }

  async getAll(): Promise<T[]> {
    return await this.collection.query().fetch();
  }

  observeAll(): Observable<T[]> {
    return this.collection.query().observe();
  }

  async count(): Promise<number> {
    return await this.collection.query().fetchCount();
  }

  observeCount(): Observable<number> {
    return this.collection.query().observeCount();
  }

  async findById(id: string): Promise<T | null> {
    try {
      return await this.collection.find(id);
    } catch {
      return null;
    }
  }

  async getById(id: string): Promise<T> {
    return await this.collection.find(id);
  }

  async query(...clauses: Q.Clause[]): Promise<T[]> {
    return await this.collection.query(...clauses).fetch();
  }

  observeQuery(...clauses: Q.Clause[]): Observable<T[]> {
    return this.collection.query(...clauses).observe();
  }

  async create(recordBuilder: (record: T) => void): Promise<T> {
    return await this.db.write(async () => {
      return await this.collection.create(recordBuilder);
    });
  }

  async update(id: string, recordUpdater: (record: T) => void): Promise<T> {
    return await this.db.write(async () => {
      const record = await this.collection.find(id);
      return await record.update(recordUpdater);
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.write(async () => {
      const record = await this.collection.find(id);
      await record.markAsDeleted();
    });
  }

  async destroyPermanently(id: string): Promise<void> {
    await this.db.write(async () => {
      const record = await this.collection.find(id);
      await record.destroyPermanently();
    });
  }

  async deleteAll(): Promise<void> {
    await this.db.write(async () => {
      const allRecords = await this.collection.query().fetch();
      if (allRecords.length === 0) return;
      const preparedDeletions = allRecords.map((record) =>
        record.prepareDestroyPermanently()
      );
      await this.db.batch(...preparedDeletions);
    });
  }
}
