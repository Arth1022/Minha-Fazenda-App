import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { AgroColors } from '@/constants/theme';
import type { FaseLavoura, Talhao } from '@/database';
import { OPCOES_CULTURA_LAVOURA } from '../services/calculos';
import { BotaoMapa, GradeOpcoes, LinkMapa, RotuloCampo } from './elementos';

const OPCOES_FASE: { valor: FaseLavoura; rotulo: string }[] = [
  { valor: 'preparo', rotulo: 'Em preparo' },
  { valor: 'vegetativo', rotulo: 'Plantada' },
  { valor: 'colheita', rotulo: 'Pronta p/ colher' },
  { valor: 'pousio', rotulo: 'Colhida' },
];

export interface DadosSafra {
  cultura: string | null;
  faseLavoura: FaseLavoura | null;
  dataPlantio: Date | null;
}

export interface SafraLavouraSheetProps {
  visible: boolean;
  area: Talhao | null;
  salvando: boolean;
  onSalvar: (safra: DadosSafra) => void;
  onClose: () => void;
}

/**
 * Safra da lavoura (cultura e fase): define o selo e o contorno no mapa
 * (vazia, plantada, colhida). Na fase de plantio do mapa, vira o ciclo.
 */
export function SafraLavouraSheet({ visible, area, salvando, onSalvar, onClose }: SafraLavouraSheetProps) {
  const [cultura, setCultura] = useState(area?.cultura ?? 'milho');
  const [fase, setFase] = useState<FaseLavoura>(area?.faseLavoura ?? 'vegetativo');

  const [abertaAntes, setAbertaAntes] = useState(visible);
  if (visible !== abertaAntes) {
    setAbertaAntes(visible);
    if (visible) {
      setCultura(area?.cultura ?? 'milho');
      setFase(area?.faseLavoura ?? 'vegetativo');
    }
  }

  const temSafra = Boolean(area?.cultura || area?.faseLavoura);

  const salvar = () => {
    // Plantada ou pronta para colher conta os dias desde o plantio (mantém a data já registrada)
    const contaDias = fase === 'vegetativo' || fase === 'colheita';
    onSalvar({
      cultura,
      faseLavoura: fase,
      dataPlantio: contaDias ? (area?.dataPlantio ?? new Date()) : null,
    });
  };

  return (
    <BottomSheet
      visible={visible}
      title="Safra"
      subtitle={area?.nome}
      alturaMaxima={0.82}
      onClose={() => {
        if (!salvando) onClose();
      }}>
      <View style={estilos.conteudo}>
        <View style={estilos.bloco}>
          <RotuloCampo titulo="Cultura" />
          <GradeOpcoes opcoes={OPCOES_CULTURA_LAVOURA} selecionado={cultura} onChange={setCultura} />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Como está a lavoura" />
          <GradeOpcoes opcoes={OPCOES_FASE} selecionado={fase} onChange={setFase} />
        </View>

        <BotaoMapa rotulo="Salvar safra" onPress={salvar} carregando={salvando} />

        {temSafra ? (
          <LinkMapa
            rotulo="Deixar a área vazia"
            icone="x"
            cor={AgroColors.danger}
            onPress={() => onSalvar({ cultura: null, faseLavoura: null, dataPlantio: null })}
          />
        ) : null}
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 22, paddingTop: 4 },
  bloco: { gap: 10 },
});
