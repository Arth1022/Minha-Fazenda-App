import React, { createContext, useContext, useEffect, useState } from 'react';
import { Database } from '@nozbe/watermelondb';
import {
  database,
  talhaoRepository,
  animalRepository,
  estoqueRepository,
  maquinaRepository,
  ordenhaRepository,
  tratamentoRepository,
} from './index';

export interface LocalDatabaseStatus {
  database: Database;
  isInitialized: boolean;
  isOfflineReady: boolean;
  schemaVersion: number;
  error: string | null;
  seedSampleFarmData: () => Promise<void>;
}

const LocalDatabaseContext = createContext<LocalDatabaseStatus>({
  database,
  isInitialized: false,
  isOfflineReady: true,
  schemaVersion: 1,
  error: null,
  seedSampleFarmData: async () => {},
});

/**
 * Popula dados iniciais da fazenda ("Fazenda Recanto Verde") caso o banco esteja vazio,
 * permitindo que o produtor visualize imediatamente os exemplos no primeiro uso offline.
 */
export async function seedSampleFarmDataIfEmpty(): Promise<void> {
  const existingTalhoes = await talhaoRepository.count();
  if (existingTalhoes > 0) {
    return;
  }

  // 1. Talhões iniciais conforme o protótipo
  const pasto1 = await talhaoRepository.createTalhao({
    nome: 'Pasto 1',
    tipo: 'Pastagem',
    areaHa: 15.2,
    possuiCerca: true,
    poligonoGeoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[-47.92, -15.78], [-47.91, -15.78], [-47.91, -15.79], [-47.92, -15.78]]],
    }),
  });

  await talhaoRepository.createTalhao({
    nome: 'Lavoura 2',
    tipo: 'Lavoura - Milho',
    areaHa: 28.0,
    possuiCerca: true,
    poligonoGeoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[-47.93, -15.78], [-47.92, -15.78], [-47.92, -15.80], [-47.93, -15.78]]],
    }),
  });

  // 2. Animais iniciais conforme o protótipo
  const bessie = await animalRepository.createAnimal({
    brinco: '#101',
    nome: 'Bessie',
    raca: 'Holandesa',
    pesoKg: 512,
    producaoLeiteL: 22.1,
    crias: 3,
    racaoKgDia: 6.5,
    talhaoId: pasto1.id,
  });

  await animalRepository.createAnimal({
    brinco: '#102',
    nome: 'Estrela',
    raca: 'Nelore',
    pesoKg: 480,
    producaoLeiteL: 0,
    crias: 2,
    racaoKgDia: 5.0,
    talhaoId: pasto1.id,
  });

  // 3. Tratamento inicial
  await tratamentoRepository.createTratamento({
    animalId: bessie.id,
    medicamento: 'Antibiótico X',
    dataInicio: new Date(),
    diasConfirmados: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
    notificacaoAtiva: true,
  });

  // 4. Itens de estoque iniciais conforme o protótipo
  await estoqueRepository.createItem({
    categoria: 'insumo',
    nome: 'Ração',
    quantidade: 4200,
    unidade: 'kg',
    estoqueMinimo: 500,
  });

  await estoqueRepository.createItem({
    categoria: 'insumo',
    nome: 'Sementes',
    quantidade: 310,
    unidade: 'kg',
    estoqueMinimo: 100,
  });

  await estoqueRepository.createItem({
    categoria: 'insumo',
    nome: 'Adubo',
    quantidade: 80,
    unidade: 'sacas',
    estoqueMinimo: 20,
  });

  await estoqueRepository.createItem({
    categoria: 'medicamento',
    nome: 'Vacinas Aftosa',
    quantidade: 45,
    unidade: 'doses',
    estoqueMinimo: 15,
  });

  await estoqueRepository.createItem({
    categoria: 'peca_maquina',
    nome: 'Filtro de Óleo Hidráulico',
    quantidade: 3,
    unidade: 'un',
    estoqueMinimo: 5, // Alerta de estoque baixo!
  });

  // 5. Máquinas e Ordenhas iniciais
  await maquinaRepository.createMaquina({
    nome: 'Trator JD 6110J',
    statusPercentual: 100,
    manutencaoDevida: false,
  });

  await maquinaRepository.createMaquina({
    nome: 'Caminhão Boiadeiro',
    statusPercentual: 60,
    manutencaoDevida: true,
  });

  await ordenhaRepository.createOrdenha({
    periodo: 'manha',
    horarioPrevisto: '05:30',
    horarioNotificacao: '05:15',
    volumeLitros: 155,
    dataRegistro: new Date(),
  });

  await ordenhaRepository.createOrdenha({
    periodo: 'tarde',
    horarioPrevisto: '17:00',
    horarioNotificacao: '16:45',
    volumeLitros: 130,
    dataRegistro: new Date(),
  });
}

export function LocalDatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initLocalDb() {
      try {
        // Realiza uma leitura inicial para garantir que o banco WatermelonDB/SQLite
        // crie todas as tabelas na primeira execução 100% offline.
        await seedSampleFarmDataIfEmpty();
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err: any) {
        console.error('Erro ao inicializar banco local:', err);
        if (mounted) {
          setError(err?.message || 'Erro desconhecido ao iniciar banco local');
          setIsInitialized(true);
        }
      }
    }

    initLocalDb();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LocalDatabaseContext.Provider
      value={{
        database,
        isInitialized,
        isOfflineReady: true,
        schemaVersion: database.schema.version,
        error,
        seedSampleFarmData: seedSampleFarmDataIfEmpty,
      }}>
      {children}
    </LocalDatabaseContext.Provider>
  );
}

export function useLocalDatabase() {
  return useContext(LocalDatabaseContext);
}
