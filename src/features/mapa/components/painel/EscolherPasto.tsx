import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { Talhao } from '@/database';
import { BotaoMapa, CoresTexto } from '../elementos';
import {
  detalheDoDestino,
  formatarLotacao,
  lotacaoDepois,
  ordenarDestinos,
  type OcupacaoArea,
} from '../../services/ocupacao';
import { BolinhaEscolha } from './elementosPainel';

export interface EscolherPastoProps {
  /** Pastos que podem receber (sem o de origem) */
  pastos: readonly Talhao[];
  ocupacoes: ReadonlyMap<string, OcupacaoArea>;
  /** Quantos animais vão (lotação depois e texto do botão) */
  quantidade: number;
  /** undefined: nada escolhido ainda; null: "Sem local definido" */
  destinoId: string | null | undefined;
  onDestino: (destinoId: string | null) => void;
  /** Animal sozinho pode sair do pasto e ficar sem local */
  permitirSemLocal?: boolean;
  salvando: boolean;
  onConfirmar: () => void;
}

/**
 * "Para qual pasto?" (protótipo, tela 17): os pastos na ordem de quem roda
 * pasto (descanso mais longo primeiro), a lotação que o destino vai ter e o
 * botão "Mover N animais".
 */
export function EscolherPasto({
  pastos,
  ocupacoes,
  quantidade,
  destinoId,
  onDestino,
  permitirSemLocal = false,
  salvando,
  onConfirmar,
}: EscolherPastoProps) {
  const { height } = useWindowDimensions();
  const ordenados = useMemo(() => ordenarDestinos(pastos, ocupacoes), [pastos, ocupacoes]);
  const destino = pastos.find((p) => p.id === destinoId) ?? null;
  const rotuloQtd = quantidade === 1 ? '1 animal' : `${quantidade} animais`;

  return (
    <View style={estilos.conteudo}>
      <Text style={estilos.rotulo}>Para qual pasto?</Text>
      {ordenados.length === 0 && !permitirSemLocal ? (
        <Text style={estilos.vazio}>Não há outro pasto no mapa. Desenhe um pasto para mover os animais.</Text>
      ) : (
        <ScrollView style={{ maxHeight: height * 0.32 }} contentContainerStyle={estilos.lista} nestedScrollEnabled>
          {ordenados.map((pasto) => (
            <Opcao
              key={pasto.id}
              titulo={pasto.nome}
              detalhe={detalheDoDestino(pasto.areaHectares, ocupacoes.get(pasto.id))}
              escolhida={destinoId === pasto.id}
              onPress={() => onDestino(pasto.id)}
            />
          ))}
          {permitirSemLocal ? (
            <Opcao
              titulo="Sem local definido"
              detalhe="Tira do pasto (ex.: no curral ou fora do mapa)"
              escolhida={destinoId === null}
              onPress={() => onDestino(null)}
            />
          ) : null}
        </ScrollView>
      )}

      {destino ? (
        <View style={estilos.lotacao}>
          <Text style={estilos.lotacaoRotulo}>Lotação depois</Text>
          <Text style={estilos.lotacaoValor}>
            {formatarLotacao(lotacaoDepois(destino.areaHectares, ocupacoes.get(destino.id), quantidade))}
          </Text>
        </View>
      ) : null}

      <BotaoMapa
        rotulo={destinoId === null ? `Tirar ${rotuloQtd} do pasto` : `Mover ${rotuloQtd}`}
        desabilitado={destinoId === undefined || quantidade === 0}
        carregando={salvando}
        onPress={onConfirmar}
      />
    </View>
  );
}

function Opcao({
  titulo,
  detalhe,
  escolhida,
  onPress,
}: {
  titulo: string;
  detalhe: string;
  escolhida: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: escolhida }}
      style={({ pressed }) => [estilos.opcao, escolhida && estilos.opcaoEscolhida, pressed && estilos.pressionado]}>
      <BolinhaEscolha escolhida={escolhida} />
      <View style={estilos.opcaoTextos}>
        <Text style={estilos.opcaoTitulo} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={estilos.opcaoDetalhe} numberOfLines={1}>
          {detalhe}
        </Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.md },
  rotulo: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: '#3A403C' },
  vazio: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
  lista: { gap: Spacing.sm },
  pressionado: { opacity: 0.8 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
  },
  opcaoEscolhida: { borderColor: AgroColors.forest },
  opcaoTextos: { flex: 1, gap: 2 },
  opcaoTitulo: { fontSize: 16.5, lineHeight: 22, fontWeight: '700', color: CoresTexto.escuro },
  opcaoDetalhe: { fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
  lotacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.surfaceMuted,
  },
  lotacaoRotulo: { fontSize: 15, color: CoresTexto.suave },
  lotacaoValor: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: CoresTexto.escuro },
});
