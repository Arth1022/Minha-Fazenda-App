import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AgroColors, Spacing } from '@/constants/theme';
import { useConsultaAoVivo } from '@/database';
import { historicoDaArea, TABELAS_HISTORICO_AREA } from '@/services/movimentacaoService';
import { formatDiaMes } from '@/utils/date';
import { CoresTexto } from '../elementos';
import { periodosDeOcupacao, textoDias } from '../../services/ocupacao';
import { CabecalhoPainel } from './elementosPainel';

type LinhaHistorico = Awaited<ReturnType<typeof historicoDaArea>>[number];

export interface HistoricoOcupacaoProps {
  areaId: string;
  nomeArea: string;
  onFechar: () => void;
}

/** Quem passou pelo pasto e por quanto tempo, do mais recente (RF-024/RF-026). */
export function HistoricoOcupacao({ areaId, nomeArea, onFechar }: HistoricoOcupacaoProps) {
  const { height } = useWindowDimensions();
  const { dados, carregado } = useConsultaAoVivo<LinhaHistorico[]>(
    () => historicoDaArea(areaId),
    TABELAS_HISTORICO_AREA,
    areaId,
    []
  );
  const periodos = useMemo(() => periodosDeOcupacao(dados), [dados]);

  return (
    <>
      <CabecalhoPainel titulo="Histórico de ocupação" subtitulo={nomeArea} onFechar={onFechar} />
      {carregado && periodos.length === 0 ? (
        <Text style={estilos.vazio}>Nenhum animal passou por este pasto ainda.</Text>
      ) : (
        <ScrollView style={{ maxHeight: height * 0.45 }}>
          {periodos.map((periodo, indice) => {
            const atual = periodo.saida === null;
            return (
              <View key={periodo.chave} style={estilos.item}>
                <View style={estilos.trilho}>
                  <View style={[estilos.ponto, atual && estilos.pontoAtual]} />
                  {indice < periodos.length - 1 ? <View style={estilos.linhaTrilho} /> : null}
                </View>
                <View style={estilos.textos}>
                  <View style={estilos.linhaTitulo}>
                    <Text style={estilos.titulo} numberOfLines={1}>
                      {periodo.titulo}
                    </Text>
                    <Text style={estilos.dias}>{textoDias(periodo.dias)}</Text>
                  </View>
                  <Text style={estilos.datas}>
                    {formatDiaMes(periodo.entrada)} → {periodo.saida ? formatDiaMes(periodo.saida) : 'hoje'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  vazio: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave, paddingVertical: Spacing.sm },
  item: { flexDirection: 'row', gap: Spacing.md },
  trilho: { width: 16, alignItems: 'center' },
  ponto: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
    borderWidth: 2,
    borderColor: AgroColors.textMuted,
    backgroundColor: AgroColors.cardBg,
  },
  pontoAtual: { borderColor: AgroColors.forest, backgroundColor: AgroColors.forest },
  linhaTrilho: { flex: 1, width: 2, marginVertical: 2, backgroundColor: AgroColors.border },
  textos: { flex: 1, gap: 2, paddingBottom: Spacing.three },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titulo: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '700', color: CoresTexto.escuro },
  dias: { fontSize: 14, color: CoresTexto.suave },
  datas: { fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
});
