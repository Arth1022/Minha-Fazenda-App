import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SwitchField } from '@/components/forms';
import { BottomSheet } from '@/components/ui';
import type { CamadasMapa } from '../data/camadasMapa';
import type { EstiloMapa } from './MapaBase';
import { GradeOpcoes, RotuloCampo } from './elementos';

const OPCOES_ESTILO: { valor: EstiloMapa; rotulo: string }[] = [
  { valor: 'satelite', rotulo: 'Satélite' },
  { valor: 'mapa', rotulo: 'Mapa' },
];

export interface CamadasSheetProps {
  visible: boolean;
  camadas: CamadasMapa;
  onChange: (camadas: CamadasMapa) => void;
  onClose: () => void;
}

/** Fundo do mapa e o que aparece por cima dele; a escolha fica salva no celular. */
export function CamadasSheet({ visible, camadas, onChange, onClose }: CamadasSheetProps) {
  return (
    <BottomSheet visible={visible} title="Camadas" subtitle="O que aparece no mapa" onClose={onClose}>
      <View style={estilos.conteudo}>
        <View style={estilos.bloco}>
          <RotuloCampo titulo="Fundo do mapa" />
          <GradeOpcoes
            opcoes={OPCOES_ESTILO}
            selecionado={camadas.estilo}
            onChange={(estilo) => onChange({ ...camadas, estilo })}
          />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Mostrar no mapa" />
          <SwitchField
            label="Áreas"
            helperText="Pastos, lavouras e reservas, com o selo de cada uma"
            value={camadas.areas}
            onChange={(areas) => onChange({ ...camadas, areas })}
          />
          <SwitchField
            label="Pontos de atenção"
            helperText="Pragas, plantas daninhas e erosão marcadas no campo"
            value={camadas.pontos}
            onChange={(pontos) => onChange({ ...camadas, pontos })}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 22, paddingTop: 4 },
  bloco: { gap: 14 },
});
