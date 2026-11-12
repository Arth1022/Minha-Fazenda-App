import { randomUUID } from 'expo-crypto';

/** UUID v4 em texto, gerado no aparelho. */
export const newId = (): string => randomUUID();
