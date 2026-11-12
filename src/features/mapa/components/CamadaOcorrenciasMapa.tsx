import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { AppIcon } from '@/components/ui';
import { AgroColors, Shadows } from '@/constants/theme';
import { ICONE_CATEGORIA_TAREFA } from '@/features/tarefas/TarefasScreen';
import { ROTULO_CATEGORIA_TAREFA, type OcorrenciaNoMapa } from '@/services/ocorrenciaService';

export interface CamadaOcorrenciasMapaProps {
  ocorrencias: OcorrenciaNoMapa[];
  selecionadaId?: string | null;
  onPressOcorrencia?: (ocorrenciaId: string) => void;
}

/**
 * Camada de "Ocorrências Abertas" no mapa (RF-T13).
 * Exibe um pino com o ícone da categoria da ocorrência, destacando urgentes em vermelho.
 */
export const CamadaOcorrenciasMapa = React.memo(function CamadaOcorrenciasMapa({
  ocorrencias,
  selecionadaId = null,
  onPressOcorrencia,
}: CamadaOcorrenciasMapaProps) {
  return (
    <>
      {ocorrencias.map((oc) => {
        if (oc.pontoLat === null || oc.pontoLng === null) return null;
        const selecionada = oc.id === selecionadaId;
        const corFundo = oc.urgente ? AgroColors.danger : AgroColors.warning;

        return (
          <Mapbox.MarkerView
            key={`ocorrencia-${oc.id}`}
            coordinate={[oc.pontoLng, oc.pontoLat]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap>
            <Pressable
              onPress={onPressOcorrencia ? () => onPressOcorrencia(oc.id) : undefined}
              accessibilityRole="button"
              accessibilityLabel={`${oc.urgente ? 'Urgente: ' : ''}${oc.titulo} (${ROTULO_CATEGORIA_TAREFA[oc.categoria]})`}
              style={[
                estilos.pino,
                { backgroundColor: corFundo },
                selecionada && estilos.pinoSelecionado,
              ]}>
              <AppIcon
                name={ICONE_CATEGORIA_TAREFA[oc.categoria]}
                size={selecionada ? 18 : 15}
                color={AgroColors.textInverse}
              />
            </Pressable>
          </Mapbox.MarkerView>
        );
      })}
    </>
  );
});

const estilos = StyleSheet.create({
  pino: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  pinoSelecionado: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3.5,
    ...Shadows.md,
  },
});
