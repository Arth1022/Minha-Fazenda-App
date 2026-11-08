/**
 * Único ponto de acesso ao banco local (Drizzle + expo-sqlite).
 * Telas e features importam daqui; trocar o driver fica restrito a esta pasta.
 */
export { db } from './client';
export { useLiveQuery } from 'drizzle-orm/expo-sqlite';
export * from './schema';
export { useDatabaseMigrations } from './migracoes';
