import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AgroColors } from '@/constants/theme';

/**
 * `/mapa-fazenda?talhao=…&vista=ciclo` e `?uso=…`: endereço dos avisos (inclusive
 * os já agendados). O mapa agora é a aba Mapa; esta rota só volta para ela com o
 * pedido (`navigate` desfaz a pilha até as abas em vez de abrir outra cópia).
 */
export default function AbrirMapaScreen() {
  const { talhao, vista, uso } = useLocalSearchParams<{ talhao?: string; vista?: string; uso?: string }>();

  useEffect(() => {
    const params: Record<string, string> = {};
    if (talhao) params.talhao = talhao;
    if (vista) params.vista = vista;
    if (uso) params.uso = uso;
    router.navigate({ pathname: '/mapa', params });
  }, [talhao, vista, uso]);

  return <View style={estilos.fundo} />;
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: AgroColors.mapTerrainBg },
});
