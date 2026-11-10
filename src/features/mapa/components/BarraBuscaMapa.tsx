import React, { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';
import { buscarLocais, type ResultadoBusca } from '../services/busca';
import { CoresTexto } from './elementos';

const MARGEM = 12;

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

/** Voltar + busca "Cidade, endereço ou coordenada", com a lista de resultados. */
export function BarraBuscaMapa({
  topo,
  onVoltar,
  onEscolher,
  controles,
}: {
  topo: number;
  onVoltar: () => void;
  onEscolher: (resultado: ResultadoBusca) => void;
  controles: React.ReactNode;
}) {
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusca[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const buscaAtual = useRef(0);

  const buscar = async () => {
    const termo = texto.trim();
    if (!termo) return;
    const id = ++buscaAtual.current;
    setBuscando(true);
    setErro(null);
    try {
      const encontrados = await buscarLocais(termo);
      if (id !== buscaAtual.current) return;
      if (encontrados.length === 1) {
        escolher(encontrados[0]);
      } else {
        setResultados(encontrados);
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

  const escolher = (resultado: ResultadoBusca) => {
    Keyboard.dismiss();
    setResultados(null);
    setErro(null);
    onEscolher(resultado);
  };

  const listaAberta = (resultados !== null && resultados.length > 0) || erro !== null;

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
                setResultados(null);
                setErro(null);
              }
            }}
            onSubmitEditing={buscar}
            placeholder="Cidade, endereço ou coordenada"
            placeholderTextColor={CoresTexto.suave}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar cidade, endereço ou coordenada"
            style={estilos.buscaTexto}
          />
        </View>
      </View>

      {listaAberta ? (
        <View style={estilos.resultados}>
          {erro ? <Text style={estilos.resultadoErro}>{erro}</Text> : null}
          {resultados?.map((r, indice) => (
            <Pressable
              key={r.id}
              onPress={() => escolher(r)}
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
});
