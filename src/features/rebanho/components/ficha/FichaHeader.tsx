import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { FichaAnimal } from '@/dtos';
import { FASE_LABEL, SITUACAO_LEITE_LABEL } from '../../services/fase';
import { AnimalAvatar } from '../AnimalAvatar';

export type AbaFicha = 'resumo' | 'saude' | 'reproducao';

export interface FichaHeaderProps {
  ficha: FichaAnimal;
  aba: AbaFicha;
  onAbaChange: (aba: AbaFicha) => void;
  /** Doses de hoje ainda não aplicadas: número ao lado de "Saúde" */
  pendentesHoje: number;
  /** Lápis do topo: abre a edição do cadastro */
  onEditar: () => void;
  /** Mostra o QR Code do animal (para imprimir) */
  onVerQrCode: () => void;
}

/**
 * Topo verde da Ficha do animal: voltar, identificação (nome, brinco, fase,
 * raça, idade) e as abas Resumo / Saúde / Reprodução (essa só para novilha e vaca).
 */
export function FichaHeader({
  ficha,
  aba,
  onAbaChange,
  pendentesHoje,
  onEditar,
  onVerQrCode,
}: FichaHeaderProps) {
  const router = useRouter();
  const { animal, fase, idade, situacaoLeite, podeReproduzir } = ficha;
  const brinco = `Brinco ${animal.brinco}`;
  const subtitulo = [
    FASE_LABEL[fase],
    animal.raca,
    idade,
    situacaoLeite ? SITUACAO_LEITE_LABEL[situacaoLeite] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const abas: { key: AbaFicha; label: string; contador?: number }[] = [
    { key: 'resumo', label: 'Resumo' },
    { key: 'saude', label: 'Saúde', contador: pendentesHoje },
    ...(podeReproduzir ? [{ key: 'reproducao' as const, label: 'Reprodução' }] : []),
  ];

  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.container}>
      <View style={styles.barra}>
        <Pressable
          onPress={voltar}
          hitSlop={10}
          style={({ pressed }) => [styles.voltar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Voltar">
          <AppIcon name="arrowLeft" size={24} color={AgroColors.textInverse} />
        </Pressable>
        <Text style={styles.tituloTela}>Ficha do animal</Text>
      </View>

      <View style={styles.perfil}>
        <AnimalAvatar size={60} variant="translucido" />
        <View style={styles.perfilTextos}>
          <View style={styles.nomeLinha}>
            <Text style={styles.nome} numberOfLines={1}>
              {animal.nome || brinco}
            </Text>
            {animal.nome ? (
              <View style={styles.brincoChip}>
                <Text style={styles.brincoTexto}>{brinco}</Text>
              </View>
            ) : null}
            {/* QR Code e editar: na linha do nome/brinco, encostados à direita */}
            <View style={styles.acoes}>
              <Pressable
                onPress={onVerQrCode}
                hitSlop={6}
                style={({ pressed }) => [styles.acao, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Ver QR Code do animal">
                <AppIcon name="qrcode" size={20} color={AgroColors.textInverse} />
              </Pressable>
              <Pressable
                onPress={onEditar}
                hitSlop={6}
                style={({ pressed }) => [styles.acao, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Editar animal">
                <AppIcon name="edit" size={20} color={AgroColors.textInverse} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.subtitulo}>{subtitulo}</Text>
        </View>
      </View>

      <View style={styles.abas} accessibilityRole="tablist">
        {abas.map(({ key, label, contador }) => {
          const ativa = key === aba;
          return (
            <Pressable
              key={key}
              onPress={() => onAbaChange(key)}
              style={styles.aba}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}>
              <View style={styles.abaConteudo}>
                <Text style={[styles.abaTexto, ativa && styles.abaTextoAtiva]}>{label}</Text>
                {contador ? (
                  <View style={styles.contador}>
                    <Text style={styles.contadorTexto}>{contador}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.sublinhado, ativa && styles.sublinhadoAtivo]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AgroColors.headerGreen,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.md,
  },
  voltar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  tituloTela: {
    ...Typography.headerTitle,
    fontSize: 19,
    lineHeight: 24,
  },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.three,
  },
  perfilTextos: {
    flex: 1,
    gap: Spacing.one,
  },
  nomeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  nome: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: AgroColors.textInverse,
    flexShrink: 1,
  },
  acoes: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  acao: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  brincoChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  brincoTexto: {
    ...Typography.captionBold,
    fontSize: 13,
    color: AgroColors.textInverse,
  },
  subtitulo: {
    ...Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  abas: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.two,
  },
  aba: {
    flex: 1,
    alignItems: 'stretch',
  },
  abaConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  abaTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.72)',
  },
  abaTextoAtiva: {
    color: AgroColors.textInverse,
    fontWeight: '800',
  },
  contador: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.healthBg,
  },
  contadorTexto: {
    fontSize: 12,
    fontWeight: '800',
    color: AgroColors.health,
  },
  sublinhado: {
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: 'transparent',
  },
  sublinhadoAtivo: {
    backgroundColor: AgroColors.textInverse,
  },
});
