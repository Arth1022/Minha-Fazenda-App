import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { formatarDistancia, formatarHectares } from '../services/calculos';
import { BotaoMapa, CoresTexto, RotuloCampo } from './elementos';

export interface SalvarFazendaSheetProps {
  visible: boolean;
  /** Nome da fazenda ativa */
  nomeAtual?: string;
  areaHa: number;
  perimetroKm: number;
  erro?: string;
  onSalvar: () => void;
  onClose: () => void;
}

/** Fim do desenho da divisa: confere as medidas e salva na fazenda ativa. */
export function SalvarFazendaSheet({
  visible,
  nomeAtual = '',
  areaHa,
  perimetroKm,
  erro,
  onSalvar,
  onClose,
}: SalvarFazendaSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title="Salvar fazenda"
      subtitle="Confira a divisa da fazenda"
      alturaMaxima={0.6}
      onClose={onClose}>
      <View style={estilos.conteudo}>
        <View style={estilos.medidas}>
          <View style={estilos.medida}>
            <Text style={estilos.medidaRotulo}>Área total</Text>
            <Text style={estilos.medidaValor}>{formatarHectares(areaHa)}</Text>
          </View>
          <View style={estilos.medida}>
            <Text style={estilos.medidaRotulo}>Divisa</Text>
            <Text style={estilos.medidaValor}>{formatarDistancia(perimetroKm)}</Text>
          </View>
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Fazenda" />
          <Text style={estilos.nome}>{nomeAtual}</Text>
          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        </View>

        <Text style={estilos.proximo}>
          Depois de salvar, você separa a fazenda em talhões: pastos, lavouras e reservas.
        </Text>

        <BotaoMapa rotulo="Salvar fazenda" onPress={onSalvar} />
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 20, paddingTop: 4 },
  bloco: { gap: 10 },
  medidas: {
    flexDirection: 'row',
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.xl,
    padding: Spacing.three,
  },
  medida: { flex: 1, gap: 2 },
  medidaRotulo: { fontSize: 14, fontWeight: '600', color: CoresTexto.suave },
  medidaValor: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: CoresTexto.escuro },
  nome: { fontSize: 18, fontWeight: '700', color: CoresTexto.escuro },
  erro: { fontSize: 13, fontWeight: '600', color: AgroColors.danger },
  proximo: { fontSize: 14, lineHeight: 20, color: CoresTexto.suave },
});
