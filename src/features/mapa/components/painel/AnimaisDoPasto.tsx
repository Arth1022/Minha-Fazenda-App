import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, IconSize, Spacing } from '@/constants/theme';
import { diasEntre } from '@/utils/date';
import { CoresTexto } from '../elementos';
import { gruposPorLote, identificacaoAnimal, textoDias } from '../../services/ocupacao';
import { CabecalhoPainel } from './elementosPainel';
import type { AnimalNoPasto } from './ResumoPasto';

export interface AnimaisDoPastoProps {
  nomeArea: string;
  animais: readonly AnimalNoPasto[];
  onAbrirAnimal: (animalId: string) => void;
  onFechar: () => void;
}

/** "Ver todos": os animais do pasto, separados por lote; tocar abre a ficha. */
export function AnimaisDoPasto({ nomeArea, animais, onAbrirAnimal, onFechar }: AnimaisDoPastoProps) {
  const { height } = useWindowDimensions();
  const secoes = useMemo(() => {
    const agora = new Date();
    return gruposPorLote(animais).map((grupo) => ({
      ...grupo,
      animais: animais
        .filter((a) => (a.loteId ?? null) === grupo.loteId)
        .map((a) => ({ ...a, dias: diasEntre(a.entradaEm, agora) })),
    }));
  }, [animais]);

  return (
    <>
      <CabecalhoPainel
        titulo={`Animais no ${nomeArea}`}
        subtitulo={animais.length === 1 ? '1 cabeça' : `${animais.length} cabeças`}
        onFechar={onFechar}
      />
      <ScrollView style={{ maxHeight: height * 0.45 }} contentContainerStyle={estilos.lista}>
        {secoes.map((secao) => (
          <View key={secao.loteId ?? 'sem-lote'} style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>
              {secao.nome} · {secao.quantidade}
            </Text>
            {secao.animais.map((animal, indice) => (
              <Pressable
                key={animal.id}
                onPress={() => onAbrirAnimal(animal.id)}
                accessibilityRole="button"
                style={({ pressed }) => [estilos.linha, indice > 0 && estilos.divisor, pressed && estilos.pressionado]}>
                <Text style={estilos.nome} numberOfLines={1}>
                  {identificacaoAnimal(animal)}
                </Text>
                <Text style={estilos.dias}>há {textoDias(animal.dias)}</Text>
                <AppIcon name="chevronRight" size={IconSize.lg} color={CoresTexto.suave} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: Spacing.three },
  secao: { gap: 2 },
  secaoTitulo: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: CoresTexto.suave, paddingBottom: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 },
  divisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  nome: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '600', color: CoresTexto.escuro },
  dias: { fontSize: 14, color: CoresTexto.suave },
  pressionado: { opacity: 0.7 },
});
