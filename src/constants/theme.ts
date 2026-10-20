/**
 * Tema visual do Minha Fazenda App
 * Projetado com alto contraste para legibilidade no campo sob luz solar intensa,
 * seguindo a identidade visual do protótipo oficial.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const AgroColors = {
  primaryDark: '#1B5E20',     // Verde cabeçalho principal
  primary: '#2E7D32',         // Verde folha principal (botões, destaques)
  primaryLight: '#4CAF50',    // Verde vibrante (indicadores de sucesso/online/offline ativo)
  mintBg: '#E8F5E9',          // Fundo verde suave para cards de ação (Calcular Área, Cercas, etc.)
  mintBorder: '#C8E6C9',      // Borda verde suave
  warning: '#D97706',         // Alerta / Estoque baixo / Manutenção
  warningBg: '#FEF3C7',       // Fundo de alerta
  danger: '#DC2626',          // Crítico / Isolamento sanitário
  dangerBg: '#FEE2E2',        // Fundo crítico
  waterBlue: '#0284C7',       // Indicador de produção de leite / água
  soilBrown: '#78350F',       // Detalhes de terra / talhão lavoura
  wheatGold: '#F59E0B',       // Cor de destaque para lavoura / grãos
} as const;

export const Colors = {
  light: {
    text: '#112211',
    background: '#F4F7F4',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8F5E9',
    textSecondary: '#4A5D4E',
    primary: '#1B5E20',
    primaryAction: '#2E7D32',
    border: '#DCE5DC',
    cardMint: '#E8F5E9',
    warning: '#D97706',
    danger: '#DC2626',
  },
  dark: {
    text: '#ECFDF5',
    background: '#0C170E',
    backgroundElement: '#162619',
    backgroundSelected: '#1E3A24',
    textSecondary: '#A7F3D0',
    primary: '#1B5E20',
    primaryAction: '#4CAF50',
    border: '#26402B',
    cardMint: '#1A3320',
    warning: '#FBBF24',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 70, android: 76, web: 72 }) ?? 72;
export const MaxContentWidth = 800;
