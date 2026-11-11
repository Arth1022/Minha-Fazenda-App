import React, { useEffect, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import { router, type Href } from 'expo-router';

import { useConsultaAoVivo, type Talhao } from '@/database';
import { animaisNaArea, TABELAS_ANIMAIS_NA_AREA } from '@/services/movimentacaoService';
import type { OcupacaoArea } from '../../services/ocupacao';
import { AnimaisDoPasto } from './AnimaisDoPasto';
import { ColocarNoPasto } from './ColocarNoPasto';
import { HistoricoOcupacao } from './HistoricoOcupacao';
import { MoverDoPasto } from './MoverDoPasto';
import { ResumoPasto, type AnimalNoPasto } from './ResumoPasto';

type Vista = 'resumo' | 'animais' | 'colocar' | 'mover' | 'historico';

export interface ConteudoPastoProps {
  area: Talhao;
  ocupacao: OcupacaoArea | undefined;
  /** Pastos da fazenda, para escolher o destino ao mover */
  pastos: readonly Talhao[];
  ocupacoes: ReadonlyMap<string, OcupacaoArea>;
  /** Cabeçalho da área (nome, selo, "⋮", X): só no resumo; as outras telas têm o delas */
  cabecalho: React.ReactNode;
  /** Animal achado na busca do mapa */
  destaque?: string | null;
  tecladoAberto: boolean;
  /** Destino escolhido ao mover, para o mapa destacar */
  onDestaque: (areaId: string | null) => void;
  /** Linhas do fim do resumo ("Horas de máquina", "Cerca") */
  linhasDoFim?: React.ReactNode;
}

const avisarErro = (mensagem: string) => Alert.alert('Não deu certo', mensagem);

/**
 * Conteúdo do painel de um pasto: o resumo (tela 14) e, no mesmo painel, as
 * telas de colocar (18), mover (17), ver os animais e o histórico. O voltar do
 * Android e o X levam de volta ao resumo.
 */
export function ConteudoPasto({
  area,
  ocupacao,
  pastos,
  ocupacoes,
  cabecalho,
  destaque = null,
  tecladoAberto,
  onDestaque,
  linhasDoFim = null,
}: ConteudoPastoProps) {
  const [vista, setVista] = useState<Vista>('resumo');
  const { dados: animais } = useConsultaAoVivo<AnimalNoPasto[]>(
    () => animaisNaArea(area.id),
    TABELAS_ANIMAIS_NA_AREA,
    area.id,
    []
  );

  // Numa tela interna, o voltar do Android volta ao resumo (registrado depois, é chamado antes do da tela)
  useEffect(() => {
    if (vista === 'resumo') return;
    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      onDestaque(null);
      setVista('resumo');
      return true;
    });
    return () => inscricao.remove();
  }, [vista, onDestaque]);

  const voltar = () => setVista('resumo');

  switch (vista) {
    case 'animais':
      return (
        <AnimaisDoPasto
          nomeArea={area.nome}
          animais={animais}
          onAbrirAnimal={(id) => router.push({ pathname: '/animal/[id]', params: { id } })}
          onFechar={voltar}
        />
      );
    case 'colocar':
      return (
        <ColocarNoPasto area={area} tecladoAberto={tecladoAberto} onFechar={voltar} onErro={avisarErro} />
      );
    case 'mover':
      return (
        <MoverDoPasto
          area={area}
          animais={animais}
          pastos={pastos}
          ocupacoes={ocupacoes}
          onDestaque={onDestaque}
          onFechar={voltar}
          onErro={avisarErro}
        />
      );
    case 'historico':
      return <HistoricoOcupacao areaId={area.id} nomeArea={area.nome} onFechar={voltar} />;
    default:
      return (
        <>
          {cabecalho}
          <ResumoPasto
            area={area}
            ocupacao={ocupacao}
            animais={animais}
            destaque={destaque}
            onVerAnimais={() => setVista('animais')}
            onAbrirLote={(id) => router.push(`/lote/${encodeURIComponent(id)}` as Href)}
            onColocar={() => setVista('colocar')}
            onMover={() => setVista('mover')}
            onHistorico={() => setVista('historico')}
            linhasDoFim={linhasDoFim}
          />
        </>
      );
  }
}
