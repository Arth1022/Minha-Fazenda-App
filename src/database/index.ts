/**
 * Único ponto de acesso ao banco local (PowerSync + Drizzle) para telas e
 * features: o banco, as tabelas e helpers de `src/entities` e as consultas ao vivo.
 */
export { db, powersync } from '@/features/sync/db';
export { useLiveQuery } from './consultaDrizzle';
export { useConsultaAoVivo, type ConsultaAoVivo } from './consultaAoVivo';
export * from '@/entities';
export { useBancoPronto } from './bancoPronto';
