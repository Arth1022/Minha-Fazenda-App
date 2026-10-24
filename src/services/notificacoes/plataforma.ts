export type Plataforma = 'android' | 'ios' | 'web';

/**
 * Fora do app (testes em Node) age como Android. No app o Metro usa
 * plataforma.native.ts (Android/iOS) ou plataforma.web.ts.
 */
export const plataforma: Plataforma = 'android';
