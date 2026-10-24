/**
 * UUID v4 em texto fora do app (drizzle-kit e testes em Node).
 * No Android/iOS o Metro usa id.native.ts (expo-crypto).
 */
export const newId = (): string => globalThis.crypto.randomUUID();
