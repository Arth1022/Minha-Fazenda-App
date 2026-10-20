import Constants from 'expo-constants';

/**
 * Nome oficial da aplicação centralizado a partir da configuração do Expo (app.json).
 * Fallback para "Minha Fazenda".
 */
export const APP_NAME =
  Constants.expoConfig?.name ??
  'Minha Fazenda';

export const APP_VERSION =
  Constants.expoConfig?.version ??
  '1.0.0';
