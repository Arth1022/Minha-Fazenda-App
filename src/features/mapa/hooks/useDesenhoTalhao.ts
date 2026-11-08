import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';

import {
  calcularAreaHectares,
  validarPoligono,
  type Coordenada,
} from '@/utils/geoMath';

export interface ResultadoDesenhoTalhao {
  pontos: Coordenada[];
  areaHectares: number;
}

export interface UseDesenhoTalhaoOptions {
  onConcluir?: (resultado: ResultadoDesenhoTalhao) => void;
}

const impact = (style = Haptics.ImpactFeedbackStyle.Light) =>
  Haptics.impactAsync(style).catch(() => {});

const notify = (type: Haptics.NotificationFeedbackType) =>
  Haptics.notificationAsync(type).catch(() => {});

export function useDesenhoTalhao(options?: UseDesenhoTalhaoOptions) {
  const [pontos, setPontos] = useState<Coordenada[]>([]);
  const [modoDesenho, setModoDesenho] = useState(false);

  const { areaAtualHa, erroTopologico } = useMemo(() => {
    if (pontos.length < 3) return { areaAtualHa: 0, erroTopologico: null };
    const { isValid, error } = validarPoligono(pontos);
    return {
      areaAtualHa: calcularAreaHectares(pontos),
      erroTopologico: isValid ? null : (error ?? 'As linhas do talhão não podem se cruzar.'),
    };
  }, [pontos]);

  useEffect(() => {
    if (erroTopologico) notify(Haptics.NotificationFeedbackType.Error);
  }, [erroTopologico]);

  const podeConcluir = pontos.length >= 3 && erroTopologico === null;

  const alternarModo = useCallback(() => {
    impact(Haptics.ImpactFeedbackStyle.Medium);
    setModoDesenho((atual) => !atual);
  }, []);

  const adicionarPonto = useCallback(
    (coords: Coordenada) => {
      if (!modoDesenho) return;
      impact();
      setPontos((atuais) => [...atuais, coords]);
    },
    [modoDesenho],
  );

  const desfazerPonto = useCallback(() => {
    impact();
    setPontos((atuais) => atuais.slice(0, -1));
  }, []);

  const limpar = useCallback(() => {
    impact(Haptics.ImpactFeedbackStyle.Medium);
    setPontos([]);
  }, []);

  const concluir = useCallback((): ResultadoDesenhoTalhao | null => {
    if (!podeConcluir) {
      notify(Haptics.NotificationFeedbackType.Error);
      return null;
    }
    notify(Haptics.NotificationFeedbackType.Success);
    const resultado = { pontos, areaHectares: areaAtualHa };
    setModoDesenho(false);
    options?.onConcluir?.(resultado);
    return resultado;
  }, [podeConcluir, pontos, areaAtualHa, options]);

  return {
    pontos,
    modoDesenho,
    areaAtualHa,
    erroTopologico,
    podeConcluir,
    alternarModo,
    adicionarPonto,
    desfazerPonto,
    limpar,
    concluir,
  };
}
