import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Badge, Button, IconeRedondo, type AppIconName } from '@/components/ui';
import { AgroColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import type { CategoriaProblema, OcorrenciaMaquina } from '@/dtos';
import { CATEGORIA_PROBLEMA_LABEL } from '../constants';
import { resolverProblema } from '../data/ocorrencias';
import { formatarMomento } from '../services/historico';

const ICONE_CATEGORIA: Record<CategoriaProblema, AppIconName> = {
  motor: 'wrench',
  hidraulico: 'droplet',
  pneu: 'wrench',
  eletrico: 'zap',
  vazamento: 'droplet',
  outro: 'alert',
};

export interface ProblemasSecaoProps {
  /** Problemas em aberto, do mais recente para o mais antigo */
  problemas: OcorrenciaMaquina[];
  /** "+ Relatar" no cabeçalho da seção */
  onRelatar: () => void;
}

function confirmarResolvido(problema: OcorrenciaMaquina) {
  Alert.alert(
    'Problema resolvido?',
    `${CATEGORIA_PROBLEMA_LABEL[problema.categoria]}: a máquina volta a ficar liberada e a tarefa do conserto é concluída. O registro do problema fica no histórico.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Resolvido', onPress: () => resolverProblema(problema.id).catch(() => undefined) },
    ]
  );
}

/** Problemas em aberto: mudam a situação da máquina até alguém marcar como resolvido. */
export function ProblemasSecao({ problemas, onRelatar }: ProblemasSecaoProps) {
  if (problemas.length === 0) return null;
  return (
    <View style={styles.secao}>
      <View style={styles.cabecalho}>
        <Text style={styles.secaoTitulo}>Problemas em aberto</Text>
        <View style={styles.contador}>
          <Text style={styles.contadorTexto}>{problemas.length}</Text>
        </View>
        <Pressable
          onPress={onRelatar}
          hitSlop={8}
          style={({ pressed }) => [styles.relatar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Relatar problema">
          <AppIcon name="plus" size={18} color={AgroColors.forest} />
          <Text style={styles.relatarTexto}>Relatar</Text>
        </Pressable>
      </View>

      {problemas.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.topo}>
            <IconeRedondo nome={ICONE_CATEGORIA[p.categoria]} tom={p.podeUsar ? 'neutro' : 'saude'} tamanho={40} />
            <View style={styles.topoTextos}>
              <Text style={styles.titulo} numberOfLines={1}>
                {CATEGORIA_PROBLEMA_LABEL[p.categoria]}
              </Text>
              <Text style={styles.quando} numberOfLines={1}>
                {[p.operador, formatarMomento(p.registradoEm), p.fotoUri ? 'com foto' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Badge
              label={p.podeUsar ? 'Dá para usar' : 'Impede o uso'}
              variant={p.podeUsar ? 'neutral' : 'danger'}
            />
          </View>
          {p.descricao ? <Text style={styles.texto}>{p.descricao}</Text> : null}
          <Button
            label="Marcar como resolvido"
            variant="outline"
            fullWidth
            leftIcon={<AppIcon name="check" size={18} color={AgroColors.forest} />}
            style={styles.botao}
            textStyle={styles.botaoTexto}
            onPress={() => confirmarResolvido(p)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.md,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.half,
  },
  secaoTitulo: {
    ...Typography.sectionTitle,
    fontSize: 16,
    color: AgroColors.textSecondary,
  },
  contador: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.healthBg,
  },
  contadorTexto: {
    fontSize: 12,
    fontWeight: '800',
    color: AgroColors.health,
  },
  relatar: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  relatarTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: AgroColors.forest,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    gap: Spacing.md,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
    ...Shadows.sm,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  topoTextos: {
    flex: 1,
    gap: Spacing.half,
  },
  titulo: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  quando: {
    ...Typography.caption,
    fontSize: 13,
    lineHeight: 17,
    color: AgroColors.textSecondary,
  },
  texto: {
    ...Typography.body,
    color: AgroColors.textPrimary,
  },
  botao: {
    borderColor: AgroColors.forest,
    borderRadius: Radius.lg,
  },
  botaoTexto: {
    color: AgroColors.forest,
  },
});
