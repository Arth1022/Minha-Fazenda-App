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
  formatarHectares,
  formatarNumero,
  lerNumero,
  paraCampo,
  type CulturaSemente,
  type InsumoAdubacao,
} from '../services/calculos';
import { CaixaResultado, CampoMapa, CoresTexto, GradeOpcoes, RotuloCampo } from './elementos';

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

/** Semente sugerida ao abrir: forrageira no pasto; na lavoura, a cultura registrada quando há semente para ela. */
function culturaDaArea(area: Talhao): CulturaSemente {
  if (area.tipo === 'pasto') return 'braquiaria';
  return area.cultura === 'milho' || area.cultura === 'silagem' ? 'milho' : 'outra';
}

const textoTaxa = (cultura: CulturaSemente) => {
  const sugerida = CULTURAS[cultura].taxaKgHa;
  return sugerida === null ? '' : String(sugerida);
};

export interface InsumosAreaSheetProps {
  visible: boolean;
  /** Área do "⋮": a conta começa com o tamanho dela */
  area: Talhao | null;
  onClose: () => void;
}

/**
 * "Calcular insumos" do menu "⋮" da área (RF-044: saiu da aba Mapa e passou a
 * ser da área): sementes, adubação (NPK/Ureia) e calagem. A área vem
 * preenchida e dá para mudar, para quem planta ou aduba só uma parte.
 */
export function InsumosAreaSheet({ visible, area, onClose }: InsumosAreaSheetProps) {
  const [modo, setModo] = useState<ModoInsumo>('sementes');
  const [areaTexto, setAreaTexto] = useState('');
  const [cultura, setCultura] = useState<CulturaSemente>('braquiaria');
  const [taxaTexto, setTaxaTexto] = useState(textoTaxa('braquiaria'));
  const [insumo, setInsumo] = useState<InsumoAdubacao>('npk');
  const [doseTexto, setDoseTexto] = useState(String(INSUMOS_ADUBACAO.npk.doseKgHa));

  // Ao abrir, começa com o tamanho e o tipo da área (ajuste no render, sem efeito)
  const [abertaAntes, setAbertaAntes] = useState(false);
  if (visible !== abertaAntes) {
    setAbertaAntes(visible);
    if (visible && area) {
      const sugerida = culturaDaArea(area);
      setAreaTexto(paraCampo(area.areaHectares, 2));
      setCultura(sugerida);
      setTaxaTexto(textoTaxa(sugerida));
    }
  }

  const trocarCultura = (nova: CulturaSemente) => {
    setCultura(nova);
    setTaxaTexto(textoTaxa(nova));
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
      title={area ? `Insumos para ${area.nome}` : 'Insumos'}
      subtitle={area ? `${formatarHectares(area.areaHectares)} · sementes, adubação e calagem` : undefined}
      alturaMaxima={0.8}
      onClose={onClose}>
      <View style={estilos.conteudo}>
        <View style={estilos.bloco}>
          <RotuloCampo titulo="O que calcular" />
          <GradeOpcoes opcoes={OPCOES_MODO} selecionado={modo} onChange={setModo} />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo={ehAdubacao ? 'Área a adubar' : 'Área a plantar'} />
          <CampoMapa
            valor={areaTexto}
            onChange={setAreaTexto}
            unidade="ha"
            placeholder="0"
            acessibilidade={ehAdubacao ? 'Área a adubar em hectares' : 'Área a plantar em hectares'}
          />
          {area && Math.abs(areaHa - area.areaHectares) > 0.005 ? (
            <Text style={estilos.ajuda}>A área inteira tem {formatarHectares(area.areaHectares)}.</Text>
          ) : null}
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
