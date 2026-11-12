import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, BottomSheet, type AppIconName } from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';
import type { OrigemFoto } from '@/services/fotos';

const TITULO = '#1A1F1C';
const TEXTO = '#5F6661';

/** Tempo da folha descer antes de abrir a câmera ou a galeria (as duas telas não brigam) */
const ESPERA_FECHAR_MS = 300;

export interface OpcoesFotoSheetProps {
  visivel: boolean;
  /** Já tem foto: mostra "Remover foto" */
  comFoto: boolean;
  titulo?: string;
  onEscolher: (origem: OrigemFoto) => void;
  onRemover: () => void;
  onFechar: () => void;
}

/** "Foto do perfil": tirar com a câmera, escolher da galeria ou remover a atual. */
export function OpcoesFotoSheet({
  visivel,
  comFoto,
  titulo = 'Foto do perfil',
  onEscolher,
  onRemover,
  onFechar,
}: OpcoesFotoSheetProps) {
  const depoisDeFechar = (acao: () => void) => {
    onFechar();
    setTimeout(acao, ESPERA_FECHAR_MS);
  };

  return (
    <BottomSheet visible={visivel} title={titulo} subtitle="A foto fica redonda, como no perfil." onClose={onFechar}>
      <View style={estilos.opcoes}>
        <Opcao
          icone="camera"
          titulo="Tirar foto"
          descricao="Abre a câmera do celular"
          onPress={() => depoisDeFechar(() => onEscolher('camera'))}
        />
        <Opcao
          icone="image"
          titulo="Escolher da galeria"
          descricao="Usa uma foto que já está no celular"
          onPress={() => depoisDeFechar(() => onEscolher('galeria'))}
        />
        {comFoto ? (
          <Opcao icone="trash" titulo="Remover foto" descricao="Volta a mostrar a inicial do nome" perigo onPress={() => depoisDeFechar(onRemover)} />
        ) : null}
      </View>
    </BottomSheet>
  );
}

function Opcao({
  icone,
  titulo,
  descricao,
  perigo = false,
  onPress,
}: {
  icone: AppIconName;
  titulo: string;
  descricao: string;
  perigo?: boolean;
  onPress: () => void;
}) {
  const cor = perigo ? AgroColors.danger : AgroColors.forest;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={descricao}
      style={({ pressed }) => [estilos.opcao, pressed && estilos.pressionado]}>
      <View style={[estilos.icone, { backgroundColor: perigo ? '#FDECEC' : AgroColors.forestTint }]}>
        <AppIcon name={icone} size={24} color={cor} />
      </View>
      <View style={estilos.textos}>
        <Text style={[estilos.titulo, perigo && { color: AgroColors.danger }]}>{titulo}</Text>
        <Text style={estilos.descricao}>{descricao}</Text>
      </View>
      {perigo ? null : <AppIcon name="chevronRight" size={20} color={TEXTO} />}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.75, backgroundColor: '#F1F4F2' },
  opcoes: { gap: Spacing.sm },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 76,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E1E4E2',
    backgroundColor: AgroColors.cardBg,
  },
  icone: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: 17, fontWeight: '700', color: TITULO },
  descricao: { fontSize: 14.5, color: TEXTO },
});
