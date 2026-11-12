import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { useEstadoSync, useAppDesatualizado, type EstadoSync } from './estadoSync';

const TEXTO: Record<EstadoSync, string> = {
  sincronizado: 'Sincronizado',
  pendente: 'Pendente',
  'sem-internet': 'Sem internet',
  'app-desatualizado': 'App desatualizado',
};

const COR: Record<EstadoSync, string> = {
  sincronizado: '#22C55E',
  pendente: '#EAB308',
  'sem-internet': '#9CA3AF',
  'app-desatualizado': '#DC2626',
};

/** Indicador discreto do sync (cabeçalho): nuvem na cor do estado e uma palavra. */
export function IndicadorSync() {
  const estado = useEstadoSync();
  return (
    <View style={estilos.linha} accessibilityLabel={`Sincronização: ${TEXTO[estado]}`}>
      <AppIcon name="cloud" size={16} color={COR[estado]} />
      <Text style={estilos.texto}>{TEXTO[estado]}</Text>
    </View>
  );
}

/** Aviso fixo quando a API recusou a versão do app (426). */
export function BannerAppDesatualizado() {
  const desatualizado = useAppDesatualizado();
  if (!desatualizado) return null;
  return (
    <View style={estilos.banner} accessibilityRole="alert">
      <Text style={estilos.bannerTexto}>Atualize o app para continuar sincronizando</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  texto: { fontSize: 12, color: '#FFFFFF' },
  banner: { backgroundColor: '#FEE2E2', paddingVertical: 8, paddingHorizontal: 16 },
  bannerTexto: { color: '#991B1B', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
