import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';
import type { Talhao } from '@/database';
import { formatarDuracao, type UsoNaArea } from '@/features/maquinas';
import { corDaMaquina, textoDiaEHora, textoKm } from '../../services/trajetos';
import { CoresTexto } from '../elementos';
import { CabecalhoPainel } from './elementosPainel';

/**
 * "Horas de máquina" da área (RF-066): os usos que passaram nela, do mais
 * recente, com o tempo e o KM dentro dela. Tocar abre o resumo no mapa.
 */
export function UsosDaArea({
  area,
  usos,
  onAbrir,
  onFechar,
}: {
  area: Talhao;
  usos: readonly UsoNaArea[];
  onAbrir: (usoId: string) => void;
  onFechar: () => void;
}) {
  const { height } = useWindowDimensions();
  return (
    <>
      <CabecalhoPainel titulo="Horas de máquina" subtitulo={area.nome} onFechar={onFechar} />
      <ScrollView style={{ maxHeight: Math.max(220, height * 0.45) }}>
        {usos.map((uso, indice) => (
          <Pressable
            key={uso.id}
            onPress={() => onAbrir(uso.id)}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.linha, indice > 0 && estilos.divisor, pressed && estilos.pressionado]}>
            <View style={[estilos.ponto, { backgroundColor: corDaMaquina(uso.maquinaId) }]} />
            <View style={estilos.textos}>
              <Text style={estilos.nome} numberOfLines={1}>
                {uso.maquinaNome}
              </Text>
              <Text style={estilos.detalhe} numberOfLines={1}>
                {[uso.operador, textoDiaEHora(uso.inicio)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={estilos.valor}>
              {formatarDuracao(uso.segundos * 1000)} · {textoKm(uso.km)}
            </Text>
            <AppIcon name="chevronRight" size={20} color={CoresTexto.suave} />
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.7 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 60 },
  divisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  ponto: { width: 14, height: 14, borderRadius: 7 },
  textos: { flex: 1, gap: 2 },
  nome: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: CoresTexto.escuro },
  detalhe: { fontSize: 13.5, lineHeight: 18, color: CoresTexto.suave },
  valor: { fontSize: 14.5, lineHeight: 20, fontWeight: '600', color: CoresTexto.suave },
});
