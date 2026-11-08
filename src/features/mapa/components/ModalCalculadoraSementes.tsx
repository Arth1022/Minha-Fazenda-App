import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import type { Talhao } from '@/database';
import {
  CULTURAS,
  ORDEM_CULTURAS,
  calcularSementes,
  formatarNumero,
  lerNumero,
  paraCampo,
  type CulturaSemente,
} from '../services/calculos';
import {
  CaixaResultado,
  CampoMapa,
  CoresTexto,
  GradeOpcoes,
  LinkMapa,
  RotuloCampo,
  SeletorTalhao,
} from './elementos';

const OPCOES_CULTURA = ORDEM_CULTURAS.map((valor) => ({ valor, rotulo: CULTURAS[valor].rotulo }));

export interface ModalCalculadoraSementesProps {
  visible: boolean;
  talhoes: Talhao[];
  onClose: () => void;
}

/** "Calculadora de sementes": área × taxa de semeadura → kg e sacos para comprar. */
export function ModalCalculadoraSementes({ visible, talhoes, onClose }: ModalCalculadoraSementesProps) {
  const [areaTexto, setAreaTexto] = useState('');
  const [cultura, setCultura] = useState<CulturaSemente>('braquiaria');
  const [taxaTexto, setTaxaTexto] = useState(String(CULTURAS.braquiaria.taxaKgHa));
  const [escolhendoTalhao, setEscolhendoTalhao] = useState(false);

  // Reabrir a calculadora fecha a lista de talhões (ajuste no render, sem efeito)
  const [abertaAntes, setAbertaAntes] = useState(visible);
  if (visible !== abertaAntes) {
    setAbertaAntes(visible);
    if (visible) setEscolhendoTalhao(false);
  }

  const trocarCultura = (nova: CulturaSemente) => {
    setCultura(nova);
    const sugerida = CULTURAS[nova].taxaKgHa;
    setTaxaTexto(sugerida === null ? '' : String(sugerida));
  };

  const config = CULTURAS[cultura];
  const { totalKg, sacos, sacoKg } = calcularSementes(
    lerNumero(areaTexto),
    lerNumero(taxaTexto),
    config.sacoKg,
  );

  return (
    <BottomSheet
      visible={visible}
      title="Calculadora de sementes"
      subtitle="Quanto comprar para plantar"
      alturaMaxima={0.72}
      onClose={onClose}>
      <View style={estilos.conteudo}>
        <View style={estilos.bloco}>
          <RotuloCampo
            titulo="Área para plantio"
            acao={
              <LinkMapa
                rotulo="Usar um talhão"
                icone="pentagon"
                onPress={() => setEscolhendoTalhao((atual) => !atual)}
              />
            }
          />
          {escolhendoTalhao ? (
            <SeletorTalhao
              talhoes={talhoes}
              medida={(t) => `${formatarNumero(t.areaHectares, 2)} ha`}
              onEscolher={(t) => {
                setAreaTexto(paraCampo(t.areaHectares, 2));
                setEscolhendoTalhao(false);
              }}
            />
          ) : null}
          <CampoMapa
            valor={areaTexto}
            onChange={setAreaTexto}
            unidade="ha"
            placeholder="0"
            acessibilidade="Área para plantio em hectares"
          />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Cultura ou forrageira" />
          <GradeOpcoes opcoes={OPCOES_CULTURA} selecionado={cultura} onChange={trocarCultura} />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Taxa de semeadura" />
          <CampoMapa
            valor={taxaTexto}
            onChange={setTaxaTexto}
            unidade="kg/ha"
            placeholder="0"
            acessibilidade="Taxa de semeadura em quilos por hectare"
          />
          <Text style={estilos.ajuda}>
            {config.taxaKgHa === null
              ? 'Informe a taxa indicada na embalagem da semente.'
              : `Sugestão para ${config.rotulo}. Ajuste conforme a embalagem da semente.`}
          </Text>
        </View>

        <CaixaResultado>
          <Text style={estilos.valorGrande}>{formatarNumero(totalKg)} kg</Text>
          <Text style={estilos.valorDetalhe}>
            {totalKg > 0
              ? `${sacos} ${sacos === 1 ? 'saco' : 'sacos'} de ${sacoKg} kg`
              : 'Informe a área e a taxa para calcular'}
          </Text>
        </CaixaResultado>
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 22, paddingTop: 4 },
  bloco: { gap: 10 },
  ajuda: { fontSize: 13.5, lineHeight: 19, color: CoresTexto.suave },
  valorGrande: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: CoresTexto.escuro,
    letterSpacing: -0.5,
  },
  valorDetalhe: { fontSize: 15, lineHeight: 20, color: CoresTexto.suave },
});
