import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Shadows } from '@/constants/theme';
import type { OcorrenciaNoMapa } from '@/services/ocorrenciaService';
import { LinhaDePinos } from './CamadaOcorrenciasMapa';
import { CoresTexto } from './elementos';

export interface RotuloAreaProps {
  nome: string;
  /** Segunda linha em cinza (ex.: "Milho silagem", "Vazia", "APP") */
  legenda: string | null;
  /** Pasto ocupado: selo verde com a vaca e quantas cabeças estão nele */
  cabecas?: number | null;
  /** Ocorrências abertas no centro da área (relatadas sem GPS): pinos presos no canto do cartão */
  ocorrencias?: readonly OcorrenciaNoMapa[];
  ocorrenciaSelecionadaId?: string | null;
  onPressOcorrencia?: (ocorrenciaId: string) => void;
  /** Sem `onPress` o rótulo é só leitura (ex.: durante o desenho) */
  onPress?: () => void;
}

/**
 * Cartão branco no centro da área: nome em negrito, a situação embaixo e o
 * selo de cabeças. As ocorrências do centro da área ficam no canto de cima do
 * cartão, cada uma tocável, em vez de um pino solto por cima do nome.
 */
export function RotuloArea({
  nome,
  legenda,
  cabecas = null,
  ocorrencias,
  ocorrenciaSelecionadaId = null,
  onPressOcorrencia,
  onPress,
}: RotuloAreaProps) {
  const conteudo = (
    <>
      <View style={estilos.cartao}>
        <Text style={estilos.nome} numberOfLines={1}>
          {nome}
        </Text>
        {legenda ? (
          <Text style={estilos.legenda} numberOfLines={1}>
            {legenda}
          </Text>
        ) : null}
      </View>
      {cabecas ? (
        <View style={estilos.selo}>
          <AppIcon name="cow" size={16} color={AgroColors.textInverse} />
          <Text style={estilos.seloTexto}>{cabecas}</Text>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={estilos.coluna}>
      {ocorrencias && ocorrencias.length > 0 ? (
        // Antes do cartão no layout e por cima dele no desenho (zIndex), encostado no canto
        <View style={estilos.pinos}>
          <LinhaDePinos
            ocorrencias={ocorrencias}
            selecionadaId={ocorrenciaSelecionadaId}
            compacto
            onPress={onPressOcorrencia}
          />
        </View>
      ) : null}
      {onPress ? (
        <Pressable
          onPress={onPress}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={[nome, legenda, cabecas ? `${cabecas} cabeças` : null].filter(Boolean).join(', ')}
          style={({ pressed }) => [estilos.corpo, pressed && estilos.pressionado]}>
          {conteudo}
        </Pressable>
      ) : (
        <View style={estilos.corpo}>{conteudo}</View>
      )}
    </View>
  );
}

/** Quanto os pinos descem sobre a borda de cima do cartão */
const SOBRE_O_CARTAO = 9;

const estilos = StyleSheet.create({
  coluna: { alignItems: 'center' },
  corpo: { alignItems: 'center', gap: 5 },
  pinos: { alignSelf: 'flex-end', marginBottom: -SOBRE_O_CARTAO, zIndex: 1 },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.forest,
    ...Shadows.sm,
  },
  seloTexto: { fontSize: 13.5, lineHeight: 17, fontWeight: '800', color: AgroColors.textInverse },
  cartao: {
    maxWidth: 160,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: AgroColors.cardBg,
    ...Shadows.sm,
  },
  nome: { fontSize: 13.5, lineHeight: 18, fontWeight: '700', color: CoresTexto.escuro },
  legenda: { fontSize: 11.5, lineHeight: 15, fontWeight: '500', color: CoresTexto.suave },
  pressionado: { opacity: 0.75 },
});
