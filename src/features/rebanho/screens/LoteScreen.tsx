import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  AppIcon,
  Button,
  ConfirmacaoSheet,
  EmptyState,
  FichaCard,
  FichaTopo,
  Header,
  ScreenContainer,
} from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { useConsultaAoVivo } from '@/database';
import {
  MoverParaPastoSheet,
  foraDoPastoDoLote,
  formatarLotacao,
  identificacaoAnimal,
  lotacao,
  usePastosComOcupacao,
} from '@/features/mapa';
import { excluirLote, listarLotes, TABELAS_LOTES, type LoteResumo } from '@/services/loteService';
import {
  animaisComLocal,
  moverLote,
  TABELAS_ANIMAIS_COM_LOCAL,
} from '@/services/movimentacaoService';
import { formatDiaMes } from '@/utils/date';
import { AnimaisDoLoteSheet } from '../components/lotes/AnimaisDoLoteSheet';
import { LoteFormSheet } from '../components/lotes/LoteFormSheet';

type AnimalComLocal = Awaited<ReturnType<typeof animaisComLocal>>[number];

/** Animais à vista antes do "Ver todos" */
const VISIVEIS = 4;

/**
 * Tela do lote (protótipo, tela 19): o pasto do lote com "Mover lote para…",
 * o aviso de quem está fora do pasto do lote (RF-021) e os animais dele.
 */
export default function LoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loteId = id ?? '';
  const { dados: lotes, carregado } = useConsultaAoVivo<LoteResumo[]>(
    () => listarLotes(),
    TABELAS_LOTES,
    'lotes',
    []
  );
  const { dados: animais } = useConsultaAoVivo<AnimalComLocal[]>(
    () => animaisComLocal({ loteId }),
    TABELAS_ANIMAIS_COM_LOCAL,
    loteId,
    []
  );
  const { ocupacoes } = usePastosComOcupacao();
  const [verTodos, setVerTodos] = useState(false);
  const [editando, setEditando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [movendo, setMovendo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const lote = lotes.find((l) => l.id === loteId) ?? null;

  if (!lote) {
    return (
      <ScreenContainer withTabInset={false} header={<Header title="Lote" showBack />}>
        <EmptyState message={carregado ? 'Este lote não existe mais.' : 'Carregando lote...'} />
      </ScreenContainer>
    );
  }

  const fora = foraDoPastoDoLote(animais, lote.areaId);
  const ocupacao = lote.areaId ? ocupacoes.get(lote.areaId) : undefined;
  const lotacaoDoPasto =
    lote.areaHectares !== null ? formatarLotacao(lotacao(ocupacao?.cabecas ?? 0, lote.areaHectares)) : null;
  const visiveis = verTodos ? animais : animais.slice(0, VISIVEIS);
  const qtd = (n: number) => (n === 1 ? '1 animal' : `${n} animais`);

  return (
    <ScreenContainer
      withTabInset={false}
      header={
        <FichaTopo
          titulo="Lote"
          avatar={
            <View style={estilos.avatar}>
              <AppIcon name="cow" size={30} color={AgroColors.textInverse} />
            </View>
          }
          nome={lote.nome}
          subtitulo={qtd(lote.animais)}
          acoes={[{ icone: 'edit', label: 'Editar lote', onPress: () => setEditando(true) }]}
        />
      }>
      <FichaCard>
        <View style={estilos.local}>
          <View style={estilos.localIcone}>
            <AppIcon name="mapPin" size={22} color={AgroColors.forest} />
          </View>
          <View style={estilos.localTextos}>
            <Text style={estilos.localTitulo}>{lote.areaNome ?? 'Sem local definido'}</Text>
            <Text style={estilos.localDetalhe}>
              {lote.areaNome
                ? [lote.areaDesde ? `desde ${formatDiaMes(lote.areaDesde)}` : null, lotacaoDoPasto]
                    .filter(Boolean)
                    .join(' · ')
                : 'Escolha um pasto para o lote'}
            </Text>
          </View>
        </View>
        <Button
          label="Mover lote para…"
          size="lg"
          fullWidth
          disabled={lote.animais === 0}
          onPress={() => setMovendo(true)}
        />
      </FichaCard>

      {fora > 0 ? (
        <View style={estilos.aviso} accessibilityRole="alert">
          <AppIcon name="alert" size={20} color={AgroColors.health} />
          <Text style={estilos.avisoTexto}>
            {fora === 1 ? '1 animal fora do pasto do lote' : `${fora} animais fora do pasto do lote`}
          </Text>
        </View>
      ) : null}

      <View style={estilos.secao}>
        <Text style={estilos.secaoTitulo}>Animais</Text>
        <Pressable onPress={() => setAdicionando(true)} hitSlop={8} accessibilityRole="button" style={estilos.adicionar}>
          <AppIcon name="plus" size={IconSize.lg} color={AgroColors.forest} />
          <Text style={estilos.adicionarTexto}>Adicionar</Text>
        </Pressable>
      </View>

      <FichaCard style={estilos.lista}>
        {animais.length === 0 ? (
          <Text style={estilos.vazio}>Nenhum animal neste lote. Toque em Adicionar.</Text>
        ) : (
          <>
            {visiveis.map((animal, indice) => {
              const noPastoDoLote = lote.areaId !== null && animal.areaId === lote.areaId;
              return (
                <Pressable
                  key={animal.id}
                  onPress={() => router.push({ pathname: '/animal/[id]', params: { id: animal.id } })}
                  accessibilityRole="button"
                  style={({ pressed }) => [estilos.linha, indice > 0 && estilos.divisor, pressed && estilos.pressionado]}>
                  <Text style={estilos.nome} numberOfLines={1}>
                    {identificacaoAnimal(animal)}
                  </Text>
                  {lote.areaId === null || noPastoDoLote ? (
                    <Text style={estilos.localAnimal}>{animal.areaNome ?? 'Sem local'}</Text>
                  ) : (
                    <View style={estilos.fora}>
                      <Text style={estilos.foraTexto}>{animal.areaNome ?? 'Sem local'}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            {animais.length > VISIVEIS ? (
              <Pressable onPress={() => setVerTodos((v) => !v)} accessibilityRole="button" style={estilos.verTodos}>
                <Text style={estilos.verTodosTexto}>{verTodos ? 'Ver menos' : `Ver todos os ${animais.length}`}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </FichaCard>

      {movendo ? (
        <MoverParaPastoSheet
          titulo={`Mover lote ${lote.nome}`}
          subtitulo={`${qtd(lote.animais)}${lote.areaNome ? ` · hoje no ${lote.areaNome}` : ''}`}
          quantidade={lote.animais}
          origemId={lote.areaId}
          onConfirmar={async (destinoId) => {
            if (destinoId) await moverLote(lote.id, destinoId);
          }}
          onClose={() => setMovendo(false)}
        />
      ) : null}

      {editando ? (
        <LoteFormSheet
          lote={lote}
          onClose={() => setEditando(false)}
          onSalvo={() => setEditando(false)}
          onExcluir={() => {
            setEditando(false);
            setExcluindo(true);
          }}
        />
      ) : null}

      {adicionando ? (
        <AnimaisDoLoteSheet loteId={lote.id} nomeLote={lote.nome} onClose={() => setAdicionando(false)} />
      ) : null}

      <ConfirmacaoSheet
        visible={excluindo}
        titulo={`Excluir lote ${lote.nome}?`}
        itens={[
          ...(lote.animais > 0 ? [{ icone: 'cow' as const, texto: `Os ${qtd(lote.animais)} ficam sem lote` }] : []),
          { icone: 'check', texto: 'Ninguém sai do pasto; o histórico continua', tom: 'ok' },
        ]}
        confirmar="Excluir"
        perigo
        onConfirmar={async () => {
          setExcluindo(false);
          await excluirLote(lote.id);
          router.back();
        }}
        onClose={() => setExcluindo(false)}
      />
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  local: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  localIcone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.surfaceMuted,
  },
  localTextos: { flex: 1, gap: 2 },
  localTitulo: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: AgroColors.textPrimary },
  localDetalhe: { ...Typography.bodyMedium },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.healthBg,
  },
  avisoTexto: { flex: 1, ...Typography.bodyBold, color: AgroColors.health },
  secao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  secaoTitulo: { ...Typography.sectionTitle, fontSize: 16, color: AgroColors.textSecondary },
  adicionar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  adicionarTexto: { ...Typography.bodyBold, fontSize: 15, color: AgroColors.forest },
  lista: { gap: 0, paddingVertical: Spacing.sm },
  vazio: { ...Typography.body, color: AgroColors.textSecondary, paddingVertical: Spacing.sm },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56 },
  divisor: { borderTopWidth: 1, borderTopColor: AgroColors.border },
  pressionado: { opacity: 0.7 },
  nome: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '600', color: AgroColors.textPrimary },
  localAnimal: { ...Typography.bodyMedium },
  fora: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.xs, backgroundColor: AgroColors.healthBg },
  foraTexto: { fontSize: 13, fontWeight: '700', color: AgroColors.health },
  verTodos: { alignItems: 'center', paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: AgroColors.border },
  verTodosTexto: { ...Typography.bodyBold, fontSize: 15, color: AgroColors.forest },
});
