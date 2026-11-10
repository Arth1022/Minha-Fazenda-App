import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import { AppIcon, type AppIconName } from './AppIcon';
import { Button } from './Button';

export interface ItemConfirmacao {
  icone: AppIconName;
  texto: string;
  /** `ok`: o que continua valendo (check verde, texto mais claro) */
  tom?: 'aviso' | 'ok';
}

export interface ConfirmacaoSheetProps {
  visible: boolean;
  titulo: string;
  /** O que muda (e o que continua) se confirmar */
  itens: ItemConfirmacao[];
  /** Texto do botão de confirmar (ex.: "Redesenhar") */
  confirmar: string;
  /** Ação destrutiva: botão e ícone vermelhos */
  perigo?: boolean;
  carregando?: boolean;
  onConfirmar: () => void;
  onClose: () => void;
}

/**
 * Confirmação que sobe do rodapé (ex.: "Redesenhar Pasto 1?"): ícone de aviso,
 * a lista do que muda e os botões Cancelar / confirmar.
 */
export function ConfirmacaoSheet({
  visible,
  titulo,
  itens,
  confirmar,
  perigo = false,
  carregando = false,
  onConfirmar,
  onClose,
}: ConfirmacaoSheetProps) {
  const insets = useSafeAreaInsets();
  const corAviso = perigo ? AgroColors.danger : AgroColors.health;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={estilos.overlay}>
        <Pressable
          style={estilos.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
        <View style={[estilos.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={estilos.alca} />
          <View style={[estilos.icone, { backgroundColor: perigo ? AgroColors.dangerBg : AgroColors.healthBg }]}>
            <AppIcon name="alert" size={26} color={corAviso} />
          </View>
          <Text style={estilos.titulo}>{titulo}</Text>

          <View style={estilos.itens}>
            {itens.map((item) => {
              const ok = item.tom === 'ok';
              return (
                <View key={item.texto} style={estilos.item}>
                  <AppIcon
                    name={item.icone}
                    size={20}
                    color={ok ? AgroColors.primary : AgroColors.textSecondary}
                  />
                  <Text style={[estilos.itemTexto, ok && estilos.itemTextoOk]}>{item.texto}</Text>
                </View>
              );
            })}
          </View>

          <View style={estilos.botoes}>
            <Button
              label="Cancelar"
              variant="outline"
              size="lg"
              onPress={onClose}
              disabled={carregando}
              style={estilos.botaoCancelar}
              textStyle={estilos.textoCancelar}
            />
            <Button
              label={confirmar}
              variant={perigo ? 'danger' : 'primary'}
              size="lg"
              onPress={onConfirmar}
              loading={carregando}
              style={estilos.botao}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
  },
  sheet: {
    backgroundColor: AgroColors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.three,
  },
  alca: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.borderStrong,
    marginBottom: Spacing.two,
  },
  icone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    ...Typography.screenTitle,
    fontSize: 22,
    lineHeight: 28,
  },
  itens: { gap: Spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  itemTexto: { ...Typography.body, fontSize: 15.5, lineHeight: 21, flex: 1 },
  itemTextoOk: { color: AgroColors.textSecondary },
  botoes: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.two },
  botao: { flex: 1 },
  botaoCancelar: { flex: 1, borderColor: AgroColors.borderStrong, backgroundColor: AgroColors.cardBg },
  textoCancelar: { color: AgroColors.textPrimary },
});
