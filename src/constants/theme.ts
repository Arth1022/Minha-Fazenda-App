/**
 * Design System & Tokens Visuais — Minha Fazenda App
 * Alinhado Pixel Perfect ao protótipo oficial do Figma.
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';

export const AgroColors = {
  // Verdes principais (Cabeçalho, Botões, Destaques)
  headerGreen: '#14532D',      // Verde escuro da barra superior (Figma Header)
  primaryDark: '#166534',      // Verde escuro institucional
  primary: '#1E7A3C',          // Verde folha principal (sub-header, botões primários)
  primaryLight: '#22C55E',     // Verde vibrante (FAB +, checks, borda selecionada, status ativo)
  fabGreen: '#2E8B57',         // Botão flutuante central (+)

  // Fundos e Superfícies
  screenBg: '#F4F6F4',         // Fundo geral das telas (cinza-esverdeado muito claro)
  cardBg: '#FFFFFF',           // Fundo branco puro dos cartões
  mintBg: '#ECFDF5',           // Fundo verde suave (dias de tratamento, seleção ativa)
  mintSurface: '#F0FDF4',      // Fundo de card selecionado
  mintBorder: '#BBF7D0',       // Borda verde suave
  inputBg: '#FFFFFF',          // Fundo de inputs
  subtleBg: '#F9FAFB',         // Fundo secundário neutro

  // Mapa e Talhões
  mapTerrainBg: '#4F6D44',     // Fundo satélite/terreno do mapa
  mapPolygonPasto: '#3B873E',  // Preenchimento polígono de pasto
  mapPolygonPastoBorder: '#DCFCE7',
  mapPolygonLavoura: '#9A7B3E',// Preenchimento polígono de lavoura
  mapPolygonLavouraBorder: '#FEF08A',

  // Protótipo "Minha Fazenda" (PDF): tela de Mapa e barra de abas
  forest: '#1D6B39',           // Verde dos botões, ícones e links do protótipo
  forestTint: '#E3EDE5',       // Pílula atrás do ícone da aba ativa
  surfaceMuted: '#F1F4F1',     // Fundo do resultado das calculadoras, ícones e botão fechar

  // Semânticas e Indicadores
  waterBlue: '#0EA5E9',        // Informativo (badge info)
  waterBlueBg: '#E0F2FE',      // Fundo suave azul
  milk: '#A16207',             // Produção de leite (ícone e valor em litros)
  milkBg: '#FEF6E4',           // Fundo creme do leite
  wheatGold: '#EAB308',        // Indicador de lavoura / sol manhã
  sunsetOrange: '#F97316',     // Indicador pôr do sol / tarde
  warning: '#D97706',          // Alerta / Estoque baixo / Manutenção devida
  warningBg: '#FEF3C7',        // Fundo badge de estoque baixo
  warningBorder: '#FDE68A',    // Borda alerta
  danger: '#DC2626',           // Erro de validação / Crítico
  dangerBg: '#FEE2E2',         // Fundo de erro
  soilBrown: '#78350F',        // Detalhes de insumos / terra
  purpleMed: '#7C3AED',        // Ícone de antibióticos
  purpleMedBg: '#F3E8FF',      // Fundo ícone de antibióticos
  health: '#B45309',           // Saúde: seringa, pendências e progresso de dose (Ficha)
  healthBg: '#FFEDD5',         // Fundo do ícone/chip de saúde
  healthProgress: '#E08A1E',   // Barra de dias do tratamento
  breeding: '#1E5AA8',         // Reprodução: situação e ícones (Ficha)
  breedingBg: '#E6EEF9',       // Fundo do chip/ícone de reprodução

  // Textos
  textPrimary: '#111827',      // Títulos e valores principais
  textSecondary: '#4B5563',    // Subtítulos e rótulos
  textMuted: '#6B7280',        // Textos auxiliares e legendas
  textPlaceholder: '#9CA3AF',  // Placeholders de formulário
  textInverse: '#FFFFFF',      // Texto sobre fundo escuro

  // Bordas e Divisores
  border: '#E5E7EB',           // Borda padrão de cards
  borderStrong: '#D1D5DB',     // Borda de inputs
  divider: '#F3F4F6',          // Linha divisória interna
} as const;

/**
 * Escala tipográfica padronizada conforme o Figma
 */
export const Typography: Record<string, TextStyle> = {
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: AgroColors.textInverse,
  },
  screenTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: AgroColors.textPrimary,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: AgroColors.textMuted,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: AgroColors.textPrimary,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: AgroColors.textSecondary,
  },
  bodyBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  metricLarge: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: AgroColors.textPrimary,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: AgroColors.textMuted,
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: AgroColors.textMuted,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
};

export const Spacing = {
  half: 2,
  one: 4,
  xs: 6,
  two: 8,
  sm: 10,
  md: 12,
  three: 16,
  lg: 20,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Tamanhos padrão dos ícones vetoriais (AppIcon) */
export const IconSize = {
  sm: 12,
  md: 16,
  lg: 20,
} as const;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadows: Record<'sm' | 'md' | 'fab', ViewStyle> = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  fab: {
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const BottomTabInset = Platform.select({ ios: 76, android: 80, web: 76 }) ?? 76;
export const MaxContentWidth = 480;
