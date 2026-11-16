import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon, Button } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { CategoriaTarefa } from '@/database';
import { LIMITE_FOTOS_OCORRENCIA } from '@/services/ocorrenciaService';
import { ICONE_CATEGORIA_TAREFA } from '../categorias';
import { FaixaGravando, PlayerNotaVozOnda, type GravacaoVoz } from '../NotaVozField';
import { BotaoVoltar, LinhaOpcao } from './partes';

/** De onde veio a área do relato (legenda da linha do local) */
export type OrigemLocal = 'buscando' | 'gps' | 'foraDasAreas' | 'semGps' | 'escolhida';

const LEGENDA_LOCAL: Record<OrigemLocal, string> = {
  buscando: 'procurando pelo GPS...',
  gps: 'pelo GPS',
  foraDasAreas: 'pelo GPS · fora das áreas',
  semGps: 'sem GPS agora',
  escolhida: 'escolhido por você',
};

const LADO_FOTO = 76;

export interface CabecalhoDetalhesProps {
  categoria: CategoriaTarefa;
  titulo: string;
  /** Título digitado (null = sugerido) */
  tituloEditado: string | null;
  onEditarTitulo: (titulo: string | null) => void;
  onVoltar: () => void;
}

/** Topo da fase 2: voltar, ícone da categoria, "Ocorrência" + título e o lápis para editar o título. */
export function CabecalhoDetalhes({ categoria, titulo, tituloEditado, onEditarTitulo, onVoltar }: CabecalhoDetalhesProps) {
  const [editando, setEditando] = useState(false);

  return (
    <View style={styles.cabecalho}>
      <BotaoVoltar onPress={onVoltar} />
      <View style={styles.cabecalhoIcone}>
        <AppIcon name={ICONE_CATEGORIA_TAREFA[categoria]} size={24} color={AgroColors.forest} />
      </View>
      <View style={styles.cabecalhoTextos}>
        <Text style={styles.cabecalhoRotulo}>Ocorrência</Text>
        {editando ? (
          <TextInput
            value={tituloEditado ?? titulo}
            onChangeText={onEditarTitulo}
            onBlur={() => setEditando(false)}
            onSubmitEditing={() => setEditando(false)}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            style={[styles.cabecalhoTitulo, styles.cabecalhoTituloEditando]}
            accessibilityLabel="Título da ocorrência"
          />
        ) : (
          <Text style={styles.cabecalhoTitulo} numberOfLines={1}>
            {titulo}
          </Text>
        )}
      </View>
      <Pressable
        onPress={() => setEditando((e) => !e)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Editar título"
        style={({ pressed }) => [styles.cabecalhoEditar, pressed && styles.pressed]}>
        <AppIcon name={editando ? 'check' : 'edit'} size={22} color={AgroColors.textSecondary} />
      </Pressable>
    </View>
  );
}

export interface VinculoRelato {
  tipo: 'animal' | 'maquina';
  /** null = ainda não escolhido */
  nome: string | null;
  viaQr: boolean;
}

export interface EtapaDetalhesProps {
  categoria: CategoriaTarefa;
  fotos: string[];
  onAdicionarFoto: () => void;
  onRemoverFoto: (indice: number) => void;
  descricao: string;
  onDescricao: (texto: string) => void;
  gravacao: GravacaoVoz;
  audioUri: string | null;
  onExcluirAudio: () => void;
  vinculo: VinculoRelato | null;
  onAjustarVinculo: () => void;
  maquinaParada: boolean;
  onMaquinaParada: (parada: boolean) => void;
  urgente: boolean;
  onUrgente: (urgente: boolean) => void;
  local: string | null;
  origemLocal: OrigemLocal;
  onAjustarLocal: () => void;
  salvando: boolean;
  onEnviar: () => void;
}

/** Fase 2 do relato: foto, descrição ou voz, vínculo, urgente e local. */
export function EtapaDetalhes({
  fotos,
  onAdicionarFoto,
  onRemoverFoto,
  descricao,
  onDescricao,
  gravacao,
  audioUri,
  onExcluirAudio,
  vinculo,
  onAjustarVinculo,
  maquinaParada,
  onMaquinaParada,
  urgente,
  onUrgente,
  local,
  origemLocal,
  onAjustarLocal,
  salvando,
  onEnviar,
}: EtapaDetalhesProps) {
  // Com áudio gravado (ou gravando), o microfone sai e a faixa do áudio aparece embaixo
  const mostrarMicrofone = !audioUri && !gravacao.gravando;
  const nomeVinculo = vinculo?.nome ?? null;

  return (
    <View style={styles.corpo}>
      <View style={styles.fotos}>
        {fotos.length < LIMITE_FOTOS_OCORRENCIA ? (
          <Pressable
            onPress={onAdicionarFoto}
            accessibilityRole="button"
            accessibilityLabel="Adicionar foto"
            style={({ pressed }) => [styles.fotoNova, pressed && styles.pressed]}>
            <AppIcon name="camera" size={24} color={AgroColors.forest} />
            <Text style={styles.fotoNovaTexto}>Foto</Text>
          </Pressable>
        ) : null}
        {fotos.map((uri, i) => (
          <View key={`${uri}-${i}`}>
            <Image source={{ uri }} style={styles.foto} contentFit="cover" />
            <Pressable
              onPress={() => onRemoverFoto(i)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Remover foto"
              style={styles.fotoRemover}>
              <AppIcon name="x" size={14} color={AgroColors.textInverse} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.descricaoLinha}>
        <TextInput
          value={descricao}
          onChangeText={onDescricao}
          placeholder="Descreva, se quiser"
          placeholderTextColor={AgroColors.textMuted}
          multiline
          style={styles.descricao}
          accessibilityLabel="Descrição"
        />
        {mostrarMicrofone ? (
          <Pressable
            onPress={() => void gravacao.iniciar()}
            accessibilityRole="button"
            accessibilityLabel="Gravar nota de voz"
            style={({ pressed }) => [styles.microfone, pressed && styles.pressed]}>
            <AppIcon name="mic" size={22} color={AgroColors.forest} />
          </Pressable>
        ) : null}
      </View>

      {gravacao.gravando ? (
        <FaixaGravando segundos={gravacao.segundos} onParar={() => void gravacao.parar()} />
      ) : audioUri ? (
        <PlayerNotaVozOnda audioUri={audioUri} onExcluir={onExcluirAudio} />
      ) : null}

      <View>
        {vinculo ? (
          <LinhaOpcao
            icone="scanQr"
            titulo={nomeVinculo ?? (vinculo.tipo === 'animal' ? 'Qual animal?' : 'Qual máquina?')}
            subtitulo={nomeVinculo ? (vinculo.viaQr ? 'pelo QR Code' : 'escolhido por você') : 'Toque para escolher'}
            acao={{ label: nomeVinculo ? 'Ajustar' : 'Escolher', onPress: onAjustarVinculo }}
          />
        ) : null}

        {vinculo?.tipo === 'maquina' && nomeVinculo ? (
          <LinhaOpcao
            icone="pauseCircle"
            corIcone={AgroColors.textSecondary}
            titulo={`Marcar ${nomeVinculo} como parada`}
            subtitulo="Ninguém inicia uso sem confirmar"
            chave={{ valor: maquinaParada, onChange: onMaquinaParada, cor: AgroColors.forest }}
          />
        ) : null}

        <LinhaOpcao
          icone="alert"
          corIcone={AgroColors.reportOrange}
          titulo="Urgente"
          subtitulo="Avisa o admin na hora"
          chave={{ valor: urgente, onChange: onUrgente, cor: AgroColors.reportOrange }}
        />

        <LinhaOpcao
          icone="mapPin"
          titulo={local ?? 'Sem área'}
          subtitulo={LEGENDA_LOCAL[origemLocal]}
          acao={{ label: 'Ajustar', onPress: onAjustarLocal }}
        />
      </View>

      <Button label="Enviar" size="lg" fullWidth loading={salvando} onPress={onEnviar} style={styles.enviar} />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cabecalhoIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.forestTint,
  },
  cabecalhoTextos: {
    flex: 1,
  },
  cabecalhoRotulo: {
    fontSize: 13,
    lineHeight: 17,
    color: AgroColors.textSecondary,
  },
  cabecalhoTitulo: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    color: AgroColors.textPrimary,
  },
  cabecalhoTituloEditando: {
    padding: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: AgroColors.forest,
  },
  cabecalhoEditar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corpo: {
    gap: Spacing.md,
  },
  fotos: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fotoNova: {
    width: LADO_FOTO,
    height: LADO_FOTO,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: AgroColors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  fotoNovaTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: AgroColors.forest,
  },
  foto: {
    width: LADO_FOTO,
    height: LADO_FOTO,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.surfaceMuted,
  },
  fotoRemover: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.textPrimary,
  },
  descricaoLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  descricao: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
    fontSize: 16,
    lineHeight: 21,
    color: AgroColors.textPrimary,
    textAlignVertical: 'top',
  },
  microfone: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
  },
  enviar: {
    backgroundColor: AgroColors.forest,
    borderRadius: Radius.lg,
  },
});
