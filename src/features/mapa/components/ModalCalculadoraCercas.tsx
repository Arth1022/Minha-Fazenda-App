import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import type { Talhao } from '@/database';
import { calcularPerimetroKm, type Coordenada } from '@/utils/geoMath';
import {
  ESPACAMENTOS_MOUROES,
  METROS_POR_ROLO,
  ORDEM_TIPOS_CERCA,
  TIPOS_CERCA,
  calcularCerca,
  formatarNumero,
  lerNumero,
  paraCampo,
  type TipoCerca,
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

const OPCOES_TIPO = ORDEM_TIPOS_CERCA.map((valor) => ({ valor, rotulo: TIPOS_CERCA[valor].rotulo }));

const OPCOES_ESPACAMENTO = ESPACAMENTOS_MOUROES.map((m) => ({
  valor: String(m),
  rotulo: `${formatarNumero(m)} m`,
}));

function perimetroKm(talhao: Talhao): number {
  return calcularPerimetroKm((talhao.geometriaJson.coordinates[0] ?? []) as Coordenada[]);
}

export interface ModalCalculadoraCercasProps {
  visible: boolean;
  talhoes: Talhao[];
  onClose: () => void;
}

/** "Calculadora de cerca": comprimento × fios → rolos de arame e mourões. */
export function ModalCalculadoraCercas({ visible, talhoes, onClose }: ModalCalculadoraCercasProps) {
  const [kmTexto, setKmTexto] = useState('');
  const [tipo, setTipo] = useState<TipoCerca>('arame5');
  const [espacamento, setEspacamento] = useState('3');
  const [escolhendoTalhao, setEscolhendoTalhao] = useState(false);

  // Reabrir a calculadora fecha a lista de talhões (ajuste no render, sem efeito)
  const [abertaAntes, setAbertaAntes] = useState(visible);
  if (visible !== abertaAntes) {
    setAbertaAntes(visible);
    if (visible) setEscolhendoTalhao(false);
  }

  const espacamentoM = Number(espacamento);
  const { metrosArame, rolos, mouroes } = calcularCerca(
    lerNumero(kmTexto),
    TIPOS_CERCA[tipo].fios,
    espacamentoM,
  );

  return (
    <BottomSheet
      visible={visible}
      title="Calculadora de cerca"
      subtitle="Arame e mourões para comprar"
      alturaMaxima={0.72}
      onClose={onClose}>
      <View style={estilos.conteudo}>
        <View style={estilos.bloco}>
          <RotuloCampo
            titulo="Comprimento da cerca"
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
              medida={(t) => `${formatarNumero(perimetroKm(t), 2)} km`}
              onEscolher={(t) => {
                setKmTexto(paraCampo(perimetroKm(t), 2));
                setEscolhendoTalhao(false);
              }}
            />
          ) : null}
          <CampoMapa
            valor={kmTexto}
            onChange={setKmTexto}
            unidade="km"
            placeholder="0"
            acessibilidade="Comprimento da cerca em quilômetros"
          />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Tipo de cerca" />
          <GradeOpcoes opcoes={OPCOES_TIPO} selecionado={tipo} onChange={setTipo} />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Distância entre mourões" />
          <GradeOpcoes
            opcoes={OPCOES_ESPACAMENTO}
            selecionado={espacamento}
            onChange={setEspacamento}
            colunas={3}
          />
        </View>

        <CaixaResultado>
          <View style={estilos.linha}>
            <View style={estilos.linhaTextos}>
              <Text style={estilos.item}>Arame</Text>
              <Text style={estilos.itemDetalhe}>
                {formatarNumero(metrosArame)} m, em rolos de {METROS_POR_ROLO} m
              </Text>
            </View>
            <Text style={estilos.valor}>
              {rolos} {rolos === 1 ? 'rolo' : 'rolos'}
            </Text>
          </View>
          <View style={estilos.divisor} />
          <View style={estilos.linha}>
            <View style={estilos.linhaTextos}>
              <Text style={estilos.item}>Mourões ou estacas</Text>
              <Text style={estilos.itemDetalhe}>1 a cada {formatarNumero(espacamentoM)} m</Text>
            </View>
            <Text style={estilos.valor}>{formatarNumero(mouroes)}</Text>
          </View>
        </CaixaResultado>
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 22, paddingTop: 4 },
  bloco: { gap: 10 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  linhaTextos: { flex: 1, gap: 2 },
  item: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: CoresTexto.escuro },
  itemDetalhe: { fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
  valor: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: CoresTexto.escuro },
  divisor: { height: 1, backgroundColor: '#DEE3DF' },
});
