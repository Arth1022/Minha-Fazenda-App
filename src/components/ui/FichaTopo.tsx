import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import { AppIcon, type AppIconName } from './AppIcon';

export interface AbaFichaTopo<K extends string> {
  key: K;
  label: string;
  /** Número ao lado do nome (ex.: doses pendentes); 0 ou vazio não mostra */
  contador?: number;
}

export interface AcaoFichaTopo {
  icone: AppIconName;
  /** Texto para o leitor de tela */
  label: string;
  onPress: () => void;
}

export interface FichaTopoProps<K extends string> {
  /** Título da barra (ex.: "Ficha do animal") */
  titulo: string;
  /** Círculo à esquerda do nome */
  avatar: React.ReactNode;
  nome: string;
  /** Etiqueta abaixo do subtítulo (ex.: "Brinco 23232", "Parada") */
  etiqueta?: string | null;
  /** 'alerta' destaca a etiqueta em laranja com ícone (ex.: "Parada por problema") */
  etiquetaTom?: 'padrao' | 'alerta';
  subtitulo: string;
  /** Botões redondos na linha do nome, encostados à direita (QR Code, editar) */
  acoes: AcaoFichaTopo[];
  /** Sem abas (ex.: tela do lote), o topo termina no perfil */
  abas?: AbaFichaTopo<K>[];
  aba?: K;
  onAbaChange?: (aba: K) => void;
}

/**
 * Topo verde das fichas (animal e máquina): voltar, identificação com ações e
 * as abas sublinhadas.
 */
export function FichaTopo<K extends string>({
  titulo,
  avatar,
  nome,
  etiqueta,
  etiquetaTom = 'padrao',
  subtitulo,
  acoes,
  abas = [],
  aba,
  onAbaChange,
}: FichaTopoProps<K>) {
  const router = useRouter();
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
        <Text style={styles.tituloTela}>{titulo}</Text>
      </View>

      <View style={styles.perfil}>
        {avatar}
        <View style={styles.perfilTextos}>
          <Text style={styles.nome} numberOfLines={2}>
            {nome}
          </Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            {subtitulo}
          </Text>
          {etiqueta ? (
            <View style={[styles.etiqueta, etiquetaTom === 'alerta' && styles.etiquetaAlerta]}>
              {etiquetaTom === 'alerta' ? <AppIcon name="alert" size={13} color={AgroColors.health} /> : null}
              <Text style={[styles.etiquetaTexto, etiquetaTom === 'alerta' && styles.etiquetaTextoAlerta]}>
                {etiqueta}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.acoes}>
          {acoes.map((acao) => (
            <Pressable
              key={acao.label}
              onPress={acao.onPress}
              hitSlop={6}
              style={({ pressed }) => [styles.acao, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={acao.label}>
              <AppIcon name={acao.icone} size={20} color={AgroColors.textInverse} />
            </Pressable>
          ))}
        </View>
      </View>

      {abas.length > 0 ? (
        <View style={styles.abas} accessibilityRole="tablist">
          {abas.map(({ key, label, contador }) => {
            const ativa = key === aba;
            return (
              <Pressable
                key={key}
                onPress={() => onAbaChange?.(key)}
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
      ) : (
        // Sem abas, um respiro no fim do topo verde
        <View style={styles.semAbas} />
      )}
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
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.three,
  },
  perfilTextos: {
    flex: 1,
    gap: Spacing.xs,
  },
  nome: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    color: AgroColors.textInverse,
  },
  acoes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  acao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  etiqueta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  etiquetaTexto: {
    ...Typography.captionBold,
    fontSize: 13,
    color: AgroColors.textInverse,
  },
  etiquetaAlerta: {
    backgroundColor: AgroColors.healthBg,
  },
  etiquetaTextoAlerta: {
    fontSize: 12,
    color: AgroColors.health,
  },
  subtitulo: {
    ...Typography.bodyMedium,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  semAbas: { height: Spacing.sm },
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
