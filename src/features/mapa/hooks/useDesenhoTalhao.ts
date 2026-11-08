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
  /** Usado nas mensagens de erro: "do talhão", "da divisa" */
  doQue?: string;
  /** Regra extra sobre os cantos (ex.: ficar dentro da fazenda); devolve o erro ou null */
  restricao?: (pontos: Coordenada[]) => string | null;
  /** Abre já no modo de desenho (ex.: atalho "Desenhar talhão" da tela anterior) */
  comecarDesenhando?: boolean;
}

const impact = (style = Haptics.ImpactFeedbackStyle.Light) =>
  Haptics.impactAsync(style).catch(() => {});

const notify = (type: Haptics.NotificationFeedbackType) =>
  Haptics.notificationAsync(type).catch(() => {});

export function useDesenhoTalhao(options?: UseDesenhoTalhaoOptions) {
  const [pontos, setPontos] = useState<Coordenada[]>([]);
  const [modoDesenho, setModoDesenho] = useState(options?.comecarDesenhando ?? false);

  const doQue = options?.doQue ?? 'do talhão';
  const restricao = options?.restricao;

  const { areaAtualHa, erroTopologico } = useMemo(() => {
    const erroRestricao = pontos.length > 0 ? (restricao?.(pontos) ?? null) : null;
    if (pontos.length < 3) return { areaAtualHa: 0, erroTopologico: erroRestricao };
    const { isValid } = validarPoligono(pontos);
    return {
      areaAtualHa: calcularAreaHectares(pontos),
      erroTopologico: isValid ? erroRestricao : `As linhas ${doQue} não podem se cruzar.`,
    };
  }, [pontos, restricao, doQue]);

  useEffect(() => {
    if (erroTopologico) notify(Haptics.NotificationFeedbackType.Error);
  }, [erroTopologico]);

  const podeConcluir = pontos.length >= 3 && erroTopologico === null;

  const alternarModo = useCallback(() => {
    impact(Haptics.ImpactFeedbackStyle.Medium);
    setModoDesenho((atual) => !atual);
  }, []);

  /** Entra no modo de desenho mantendo os cantos já marcados (ex.: voltar do "Salvar") */
  const iniciar = useCallback(() => {
    impact(Haptics.ImpactFeedbackStyle.Medium);
    setModoDesenho(true);
  }, []);

  /** Sai do desenho e descarta os cantos marcados */
  const cancelar = useCallback(() => {
    setModoDesenho(false);
    setPontos([]);
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
    iniciar,
    cancelar,
    adicionarPonto,
    desfazerPonto,
    limpar,
    concluir,
  };
}
