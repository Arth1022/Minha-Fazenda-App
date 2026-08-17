import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';

// Importação dos Models
import Talhao from './models/Talhao';
import Animal from './models/Animal';
import Tratamento from './models/Tratamento';
import EstoqueItem from './models/EstoqueItem';
import Maquina from './models/Maquina';
import Ordenha from './models/Ordenha';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true, // Habilita JSI para melhor performance no Android/iOS(ver se funfa mesmo)
  onSetUpError: (error) => {
    console.error('Erro ao configurar o bd:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Talhao,
    Animal,
    Tratamento,
    EstoqueItem,
    Maquina,
    Ordenha,
  ],
});