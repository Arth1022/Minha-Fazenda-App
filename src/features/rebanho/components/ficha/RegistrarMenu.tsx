import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName, BottomSheet, IconeRedondo, type TomFicha } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';

export type TipoRegistro = 'tratamento' | 'pesagem' | 'leite' | 'cobertura' | 'parto' | 'saida' | 'ocorrencia';

interface OpcaoRegistro {
  tipo: TipoRegistro;
  titulo: string;
  descricao: string;
  icone: AppIconName;
  tom: TomFicha;
  /** Só para fêmea em idade reprodutiva (novilha ou vaca) */
  reprodutiva?: boolean;
  /** Só para vaca de fazenda que produz leite */
  leiteira?: boolean;
}

const OPCOES: OpcaoRegistro[] = [
  {
    tipo: 'ocorrencia',
    titulo: 'Relatar problema',
    descricao: 'Incidente, cerca ou nota de voz',
    icone: 'alert',
    tom: 'saude',
  },
  {
    tipo: 'tratamento',
    titulo: 'Tratamento ou vacina',
    descricao: 'Doses, período e lembretes',
    icone: 'syringe',
    tom: 'saude',
  },
  { tipo: 'pesagem', titulo: 'Pesagem', descricao: 'Peso atual do animal', icone: 'weight', tom: 'sucesso' },
  {
    tipo: 'leite',
    titulo: 'Registro de leite',
    descricao: 'Litros que a vaca deu no dia',
    icone: 'milk',
    tom: 'sucesso',
    leiteira: true,
  },
  {
    tipo: 'cobertura',
    titulo: 'Cobertura',
    descricao: 'Monta natural ou inseminação',
    icone: 'heart',
    tom: 'reproducao',
    reprodutiva: true,
  },
  {
    tipo: 'parto',
    titulo: 'Parto',
    descricao: 'Nascimento de cria',
    icone: 'baby',
    tom: 'reproducao',
    reprodutiva: true,
  },
  { tipo: 'saida', titulo: 'Saída', descricao: 'Venda, morte ou descarte', icone: 'logOut', tom: 'neutro' },
];

export interface RegistrarMenuProps {
  visible: boolean;
  /** "Mimosa · Brinco #104" */
  identificacao: string;
  /** Fêmea novilha ou vaca: mostra Cobertura e Parto */
  reprodutiva: boolean;
  /** Vaca de fazenda que produz leite: mostra o Registro de leite */
  leiteira: boolean;
  onClose: () => void;
  onSelect: (tipo: TipoRegistro) => void;
}

/** Menu do botão "Registrar" da ficha. */
export function RegistrarMenu({ visible, identificacao, reprodutiva, leiteira, onClose, onSelect }: RegistrarMenuProps) {
  const opcoes = OPCOES.filter(
    (opcao) => (reprodutiva || !opcao.reprodutiva) && (leiteira || !opcao.leiteira)
  );

  return (
    <BottomSheet visible={visible} title="O que deseja registrar?" subtitle={identificacao} onClose={onClose}>
      {opcoes.map((opcao) => (
        <Pressable
          key={opcao.tipo}
          onPress={() => onSelect(opcao.tipo)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.opcao, pressed && styles.pressed]}>
          <IconeRedondo nome={opcao.icone} tom={opcao.tom} tamanho={52} />
          <View style={styles.textos}>
            <Text style={styles.titulo}>{opcao.titulo}</Text>
            <Text style={styles.descricao}>{opcao.descricao}</Text>
          </View>
          <AppIcon name="chevronRight" size={IconSize.lg} color={AgroColors.textSecondary} />
        </Pressable>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.subtleBg,
  },
  pressed: {
    backgroundColor: AgroColors.mintSurface,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  titulo: {
    ...Typography.bodyBold,
    fontSize: 17,
    lineHeight: 22,
  },
  descricao: {
    ...Typography.bodyMedium,
    color: AgroColors.textMuted,
  },
});
