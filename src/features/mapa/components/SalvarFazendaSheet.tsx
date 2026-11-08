import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { formatarDistancia, formatarHectares } from '../services/calculos';
import { BotaoMapa, CampoMapa, CoresTexto, RotuloCampo } from './elementos';

export interface SalvarFazendaSheetProps {
  visible: boolean;
  /** Nome já salvo (ao redesenhar a divisa) */
  nomeAtual?: string;
  areaHa: number;
  perimetroKm: number;
  erro?: string;
  onSalvar: (nome: string) => void;
  onClose: () => void;
}

/** Fim do desenho da divisa: confere as medidas e dá nome à fazenda. */
export function SalvarFazendaSheet({
  visible,
  nomeAtual = '',
  areaHa,
  perimetroKm,
  erro,
  onSalvar,
  onClose,
}: SalvarFazendaSheetProps) {
  const [nome, setNome] = useState(nomeAtual);
  const [erroNome, setErroNome] = useState<string | undefined>();

  // Cada abertura começa com o nome salvo (ajuste no render, sem efeito)
  const [abertaAntes, setAbertaAntes] = useState(visible);
  if (visible !== abertaAntes) {
    setAbertaAntes(visible);
    if (visible) {
      setNome(nomeAtual);
      setErroNome(undefined);
    }
  }

  const salvar = () => {
    if (!nome.trim()) {
      setErroNome('Dê um nome à fazenda (ex.: Fazenda Recanto Verde).');
      return;
    }
    onSalvar(nome.trim());
  };

  const mensagemErro = erroNome ?? erro;

  return (
    <BottomSheet
      visible={visible}
      title="Salvar fazenda"
      subtitle="Confira a divisa e dê um nome"
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
          <RotuloCampo titulo="Nome da fazenda" />
          <CampoMapa
            valor={nome}
            onChange={(texto) => {
              setNome(texto);
              if (erroNome) setErroNome(undefined);
            }}
            numerico={false}
            placeholder="Ex.: Fazenda Recanto Verde"
            acessibilidade="Nome da fazenda"
          />
          {mensagemErro ? <Text style={estilos.erro}>{mensagemErro}</Text> : null}
        </View>

        <Text style={estilos.proximo}>
          Depois de salvar, você separa a fazenda em talhões: pastos, lavouras e reservas.
        </Text>

        <BotaoMapa rotulo="Salvar fazenda" onPress={salvar} />
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
  erro: { fontSize: 13, fontWeight: '600', color: AgroColors.danger },
  proximo: { fontSize: 14, lineHeight: 20, color: CoresTexto.suave },
});
