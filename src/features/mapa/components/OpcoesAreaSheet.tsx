import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, BottomSheet, IconeRedondo, type AppIconName, type TomFicha } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import type { Talhao } from '@/database';
import { opcoesDaArea, resumoDaArea, type OpcaoArea } from '../services/areas';

const VISUAL: Record<OpcaoArea, { titulo: string; descricao: string; icone: AppIconName; tom: TomFicha }> = {
  cercar: {
    titulo: 'Cercar esta área',
    descricao: 'Arame, mourões e esticadores pelo perímetro',
    icone: 'fence',
    tom: 'verde',
  },
  insumos: {
    titulo: 'Calcular insumos',
    descricao: 'Sementes, adubo e calcário pelo tamanho da área',
    icone: 'sprout',
    tom: 'verde',
  },
  editar: { titulo: 'Renomear ou mudar o tipo', descricao: 'Nome e tipo da área', icone: 'edit', tom: 'verde' },
  redesenhar: {
    titulo: 'Redesenhar',
    descricao: 'Novo contorno; nome, tipo e histórico continuam',
    icone: 'pentagon',
    tom: 'verde',
  },
  pontoAtencao: {
    titulo: 'Ponto de atenção',
    descricao: 'Praga, planta daninha ou erosão aqui',
    icone: 'mapPin',
    tom: 'saude',
  },
  excluir: { titulo: 'Excluir área', descricao: 'Sai do mapa; o histórico fica', icone: 'trash', tom: 'neutro' },
};

export interface OpcoesAreaSheetProps {
  visible: boolean;
  area: Talhao | null;
  podeEditarGeometria: boolean;
  onClose: () => void;
  onSelect: (opcao: OpcaoArea) => void;
}

/** Menu "⋮" do painel da área: as calculadoras e o que não é do dia a dia (renomear, redesenhar, excluir). */
export function OpcoesAreaSheet({ visible, area, podeEditarGeometria, onClose, onSelect }: OpcoesAreaSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={area?.nome ?? ''}
      subtitle={area ? resumoDaArea(area) : undefined}
      onClose={onClose}>
      {(area ? opcoesDaArea(podeEditarGeometria, area.tipo) : []).map((opcao) => {
        const { titulo, descricao, icone, tom } = VISUAL[opcao];
        const perigo = opcao === 'excluir';
        return (
          <Pressable
            key={opcao}
            onPress={() => onSelect(opcao)}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.opcao, pressed && estilos.pressionado]}>
            <IconeRedondo nome={icone} tom={tom} tamanho={48} />
            <View style={estilos.textos}>
              <Text style={[estilos.titulo, perigo && estilos.tituloPerigo]}>{titulo}</Text>
              <Text style={estilos.descricao}>{descricao}</Text>
            </View>
            <AppIcon name="chevronRight" size={IconSize.lg} color={AgroColors.textSecondary} />
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.subtleBg,
  },
  pressionado: { backgroundColor: AgroColors.mintSurface },
  textos: { flex: 1, gap: Spacing.half },
  titulo: { ...Typography.bodyBold, fontSize: 16.5, lineHeight: 22 },
  tituloPerigo: { color: AgroColors.danger },
  descricao: { ...Typography.bodyMedium, color: AgroColors.textMuted },
});
