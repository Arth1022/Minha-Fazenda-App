import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import type { Talhao } from '@/database';
import {
  CULTURAS,
  INSUMOS_ADUBACAO,
  ORDEM_CULTURAS,
  ORDEM_INSUMOS_ADUBACAO,
  calcularAdubacao,
  calcularSementes,
  formatarNumero,
  lerNumero,
  paraCampo,
  type CulturaSemente,
  type InsumoAdubacao,
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

type ModoInsumo = 'sementes' | 'adubacao';

const OPCOES_MODO: { valor: ModoInsumo; rotulo: string }[] = [
  { valor: 'sementes', rotulo: 'Sementes' },
  { valor: 'adubacao', rotulo: 'Adubo e Calcário' },
];

const OPCOES_CULTURA = ORDEM_CULTURAS.map((valor) => ({ valor, rotulo: CULTURAS[valor].rotulo }));
const OPCOES_ADUBACAO = ORDEM_INSUMOS_ADUBACAO.map((valor) => ({
  valor,
  rotulo: INSUMOS_ADUBACAO[valor].rotulo,
}));

export interface ModalCalculadoraSementesProps {
  visible: boolean;
  talhoes: Talhao[];
  onClose: () => void;
}

/** "Calculadora de insumos": sementes, adubação (NPK/Ureia) e calagem por área. */
export function ModalCalculadoraSementes({ visible, talhoes, onClose }: ModalCalculadoraSementesProps) {
  const [modo, setModo] = useState<ModoInsumo>('sementes');
  const [areaTexto, setAreaTexto] = useState('');
  const [cultura, setCultura] = useState<CulturaSemente>('braquiaria');
  const [taxaTexto, setTaxaTexto] = useState(String(CULTURAS.braquiaria.taxaKgHa));
  const [insumo, setInsumo] = useState<InsumoAdubacao>('npk');
  const [doseTexto, setDoseTexto] = useState(String(INSUMOS_ADUBACAO.npk.doseKgHa));
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

  const trocarInsumo = (novo: InsumoAdubacao) => {
    setInsumo(novo);
    const sugerida = INSUMOS_ADUBACAO[novo].doseKgHa;
    setDoseTexto(sugerida === null ? '' : String(sugerida));
  };

  const areaHa = lerNumero(areaTexto);
  const configSemente = CULTURAS[cultura];
  const configAdubo = INSUMOS_ADUBACAO[insumo];
  const resultadoSemente = calcularSementes(areaHa, lerNumero(taxaTexto), configSemente.sacoKg);
  const resultadoAdubo = calcularAdubacao(areaHa, lerNumero(doseTexto), configAdubo.embalagemKg);
  const ehAdubacao = modo === 'adubacao';

  return (
    <BottomSheet
      visible={visible}
      title="Calculadora de insumos"
      subtitle="Sementes, adubação e calagem por área"
      alturaMaxima={0.8}
      onClose={onClose}>
      <View style={estilos.conteudo}>
        <View style={estilos.bloco}>
          <RotuloCampo titulo="O que calcular" />
          <GradeOpcoes opcoes={OPCOES_MODO} selecionado={modo} onChange={setModo} />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo
            titulo="Área da lavoura ou pasto"
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

        {ehAdubacao ? (
          <>
            <View style={estilos.bloco}>
              <RotuloCampo titulo="Adubo ou corretivo" />
              <GradeOpcoes opcoes={OPCOES_ADUBACAO} selecionado={insumo} onChange={trocarInsumo} />
            </View>

            <View style={estilos.bloco}>
              <RotuloCampo titulo="Dose recomendada" />
              <CampoMapa
                valor={doseTexto}
                onChange={setDoseTexto}
                unidade="kg/ha"
                placeholder="0"
                acessibilidade="Dose recomendada em quilos por hectare"
              />
              <Text style={estilos.ajuda}>
                {configAdubo.doseKgHa === null
                  ? 'Informe a dose recomendada pela análise de solo.'
                  : `Sugestão para ${configAdubo.rotulo}. Ajuste conforme sua análise de solo.`}
              </Text>
            </View>

            <CaixaResultado>
              <Text style={estilos.valorGrande}>{formatarNumero(resultadoAdubo.totalKg)} kg</Text>
              <Text style={estilos.valorDetalhe}>
                {resultadoAdubo.totalKg > 0
                  ? `${resultadoAdubo.sacos} ${resultadoAdubo.sacos === 1 ? 'saco' : 'sacos'} de ${resultadoAdubo.embalagemKg} kg · ${formatarNumero(resultadoAdubo.toneladas, 2)} t`
                  : 'Informe a área e a dose para calcular'}
              </Text>
            </CaixaResultado>
          </>
        ) : (
          <>
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
                {configSemente.taxaKgHa === null
                  ? 'Informe a taxa indicada na embalagem da semente.'
                  : `Sugestão para ${configSemente.rotulo}. Ajuste conforme a embalagem da semente.`}
              </Text>
            </View>

            <CaixaResultado>
              <Text style={estilos.valorGrande}>{formatarNumero(resultadoSemente.totalKg)} kg</Text>
              <Text style={estilos.valorDetalhe}>
                {resultadoSemente.totalKg > 0
                  ? `${resultadoSemente.sacos} ${resultadoSemente.sacos === 1 ? 'saco' : 'sacos'} de ${resultadoSemente.sacoKg} kg`
                  : 'Informe a área e a taxa para calcular'}
              </Text>
            </CaixaResultado>
          </>
        )}
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
