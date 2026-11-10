import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';
import type { Talhao } from '@/database';
import { buscarAreas, detalheDaArea } from '../services/areas';
import { buscarLocais, type ResultadoBusca } from '../services/busca';
import { CoresTexto } from './elementos';

const MARGEM = 12;
const MAX_AREAS = 6;

/** Botão branco quadrado do canto do mapa (camadas, centralizar no GPS). */
export function BotaoQuadrado({
  icone,
  rotulo,
  onPress,
}: {
  icone: 'layers' | 'locate';
  rotulo: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [estilos.botaoQuadrado, pressed && estilos.pressionado]}>
      <AppIcon name={icone} size={24} color={CoresTexto.escuro} />
    </Pressable>
  );
}

/**
 * O que a busca procura: lugares (antes da divisa, para achar a terra; usa a
 * internet) ou as áreas da fazenda (offline, enquanto digita).
 */
export type ModoBuscaMapa =
  | { tipo: 'locais'; onEscolher: (resultado: ResultadoBusca) => void }
  | { tipo: 'areas'; areas: Talhao[]; onEscolher: (area: Talhao) => void };

/** Voltar + campo de busca, com a lista de resultados embaixo. */
export function BarraBuscaMapa({
  topo,
  onVoltar,
  modo,
  controles,
}: {
  topo: number;
  onVoltar: () => void;
  modo: ModoBuscaMapa;
  controles: React.ReactNode;
}) {
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [locais, setLocais] = useState<ResultadoBusca[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const buscaAtual = useRef(0);

  const areas = modo.tipo === 'areas' ? modo.areas : null;
  const areasEncontradas = useMemo(
    () => (areas ? buscarAreas(areas, texto).slice(0, MAX_AREAS) : []),
    [areas, texto],
  );

  const limpar = () => {
    Keyboard.dismiss();
    setTexto('');
    setLocais(null);
    setErro(null);
  };

  const escolherLocal = (resultado: ResultadoBusca) => {
    if (modo.tipo !== 'locais') return;
    Keyboard.dismiss();
    setLocais(null);
    setErro(null);
    modo.onEscolher(resultado);
  };

  const escolherArea = (area: Talhao) => {
    if (modo.tipo !== 'areas') return;
    limpar();
    modo.onEscolher(area);
  };

  const buscarLocal = async () => {
    const termo = texto.trim();
    if (!termo) return;
    const id = ++buscaAtual.current;
    setBuscando(true);
    setErro(null);
    try {
      const encontrados = await buscarLocais(termo);
      if (id !== buscaAtual.current) return;
      if (encontrados.length === 1) {
        escolherLocal(encontrados[0]);
      } else {
        setLocais(encontrados);
        if (encontrados.length === 0) setErro('Nenhum lugar encontrado. Tente outro nome.');
      }
    } catch {
      if (id === buscaAtual.current) {
        setErro('Sem conexão para buscar. Digite a coordenada (ex.: -15.78, -47.93).');
      }
    } finally {
      if (id === buscaAtual.current) setBuscando(false);
    }
  };

  const aoEnviar = () => {
    if (modo.tipo === 'locais') buscarLocal();
    else if (areasEncontradas[0]) escolherArea(areasEncontradas[0]);
  };

  const digitando = texto.trim().length > 0;
  const erroAreas = modo.tipo === 'areas' && digitando && areasEncontradas.length === 0
    ? 'Nenhuma área com esse nome.'
    : null;
  const mensagem = modo.tipo === 'locais' ? erro : erroAreas;
  const listaAberta =
    mensagem !== null ||
    (modo.tipo === 'locais' ? (locais?.length ?? 0) > 0 : areasEncontradas.length > 0);

  return (
    <View style={[estilos.topo, { top: topo }]} pointerEvents="box-none">
      <View style={estilos.linhaBusca}>
        <Pressable
          onPress={onVoltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [estilos.botaoVoltar, pressed && estilos.pressionado]}>
          <AppIcon name="arrowLeft" size={24} color={CoresTexto.escuro} />
        </Pressable>
        <View style={estilos.busca}>
          {buscando ? (
            <ActivityIndicator size="small" color={CoresTexto.suave} />
          ) : (
            <AppIcon name="search" size={22} color={CoresTexto.suave} />
          )}
          <TextInput
            value={texto}
            onChangeText={(novo) => {
              setTexto(novo);
              if (!novo) {
                setLocais(null);
                setErro(null);
              }
            }}
            onSubmitEditing={aoEnviar}
            placeholder={modo.tipo === 'locais' ? 'Cidade, endereço ou coordenada' : 'Buscar área'}
            placeholderTextColor={CoresTexto.suave}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={modo.tipo === 'locais' ? 'Buscar cidade, endereço ou coordenada' : 'Buscar área'}
            style={estilos.buscaTexto}
          />
          {digitando ? (
            <Pressable onPress={limpar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar busca">
              <AppIcon name="x" size={20} color={CoresTexto.suave} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {listaAberta ? (
        <View style={estilos.resultados}>
          {mensagem ? <Text style={estilos.resultadoErro}>{mensagem}</Text> : null}
          {modo.tipo === 'locais'
            ? locais?.map((r, indice) => (
                <Pressable
                  key={r.id}
                  onPress={() => escolherLocal(r)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    estilos.resultado,
                    indice > 0 && estilos.resultadoDivisor,
                    pressed && estilos.pressionado,
                  ]}>
                  <AppIcon name="mapPin" size={20} color={AgroColors.forest} />
                  <View style={estilos.resultadoTextos}>
                    <Text style={estilos.resultadoNome} numberOfLines={1}>
                      {r.nome}
                    </Text>
                    {r.detalhe ? (
                      <Text style={estilos.resultadoDetalhe} numberOfLines={1}>
                        {r.detalhe}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))
            : areasEncontradas.map((area, indice) => (
                <Pressable
                  key={area.id}
                  onPress={() => escolherArea(area)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    estilos.resultado,
                    indice > 0 && estilos.resultadoDivisor,
                    pressed && estilos.pressionado,
                  ]}>
                  <View style={[estilos.corArea, { backgroundColor: COR_POR_TIPO_AREA[area.tipo] }]} />
                  <View style={estilos.resultadoTextos}>
                    <Text style={estilos.resultadoNome} numberOfLines={1}>
                      {area.nome}
                    </Text>
                    <Text style={estilos.resultadoDetalhe} numberOfLines={1}>
                      {detalheDaArea(area)}
                    </Text>
                  </View>
                </Pressable>
              ))}
        </View>
      ) : (
        controles
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.8 },
  topo: { position: 'absolute', left: MARGEM, right: MARGEM, gap: Spacing.three },
  linhaBusca: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  botaoVoltar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AgroColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  busca: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: AgroColors.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  buscaTexto: { flex: 1, fontSize: 16, color: CoresTexto.escuro, paddingVertical: 0 },
  botaoQuadrado: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  resultados: {
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
  },
  resultadoDivisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  resultadoTextos: { flex: 1, gap: 1 },
  resultadoNome: { fontSize: 15, fontWeight: '700', color: CoresTexto.escuro },
  resultadoDetalhe: { fontSize: 13, color: CoresTexto.suave },
  resultadoErro: {
    fontSize: 14,
    lineHeight: 20,
    color: CoresTexto.suave,
    padding: Spacing.three,
  },
  corArea: { width: 14, height: 14, borderRadius: 3 },
});
