import React, { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, type CicloPlantio, type Talhao } from '@/database';
import {
  cicloAtivoComEtapas,
  ciclosAnterioresDaArea,
  cicloComEtapas,
  TABELAS_CICLO,
  type CicloComEtapas,
} from '@/services/cicloService';
import { resumoDaSafra } from '../../services/areas';
import { textoCicloEncerrado } from '../../services/plantio';
import { BotaoMapa, CoresTexto } from '../elementos';
import { CartaoCiclo } from './CartaoCiclo';
import { CabecalhoPainel, LinhaNavegacao } from './elementosPainel';
import { LinhaDoTempoCiclo } from './LinhaDoTempoCiclo';
import { PlantarArea } from './PlantarArea';

type Vista =
  | { tipo: 'resumo' }
  | { tipo: 'plantar' }
  | { tipo: 'linhaDoTempo' }
  | { tipo: 'anteriores' }
  | { tipo: 'anterior'; cicloId: string };

const RESUMO: Vista = { tipo: 'resumo' };

export interface ConteudoLavouraProps {
  area: Talhao;
  /** Cabeçalho da área (nome, selo, "⋮", X): só no resumo */
  cabecalho: React.ReactNode;
  /** "Cercar esta área" (fase 3), no fim da lista */
  linhaCerca: React.ReactNode;
  alturaTeclado: number;
  /** Admin cria cultura nova no "Plantar" (RF-042) */
  podeCriarCultura: boolean;
  /** Abre direto na linha do tempo (toque no aviso de uma etapa) */
  abrirLinhaDoTempo?: boolean;
}

/**
 * Conteúdo do painel de uma lavoura (M4): o resumo (tela 15) com o card do
 * ciclo ou "Plantar nesta área" e, no mesmo painel, o plantar (22), a linha do
 * tempo (23) e os ciclos anteriores. O voltar do Android e o X levam ao resumo.
 */
export function ConteudoLavoura({
  area,
  cabecalho,
  linhaCerca,
  alturaTeclado,
  podeCriarCultura,
  abrirLinhaDoTempo = false,
}: ConteudoLavouraProps) {
  const { height } = useWindowDimensions();
  const [vista, setVista] = useState<Vista>(abrirLinhaDoTempo ? { tipo: 'linhaDoTempo' } : RESUMO);
  const { dados: ativo, carregado } = useConsultaAoVivo<CicloComEtapas | null>(
    () => cicloAtivoComEtapas(area.id),
    TABELAS_CICLO,
    area.id,
    null
  );
  const { dados: anteriores } = useConsultaAoVivo<CicloPlantio[]>(
    () => ciclosAnterioresDaArea(area.id),
    TABELAS_CICLO,
    area.id,
    []
  );

  // Numa tela interna, o voltar do Android volta (registrado depois, é chamado antes do da tela)
  useEffect(() => {
    if (vista.tipo === 'resumo') return;
    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      setVista(vista.tipo === 'anterior' ? { tipo: 'anteriores' } : RESUMO);
      return true;
    });
    return () => inscricao.remove();
  }, [vista]);

  const voltar = () => setVista(RESUMO);

  switch (vista.tipo) {
    case 'plantar':
      return (
        <PlantarArea
          area={area}
          podeCriarCultura={podeCriarCultura}
          alturaTeclado={alturaTeclado}
          onFechar={voltar}
          onPlantado={voltar}
        />
      );
    case 'linhaDoTempo':
      // Ciclo colhido ou cancelado (ou aviso de um ciclo que já acabou): volta ao resumo
      if (ativo) {
        return (
          <LinhaDoTempoCiclo
            area={area}
            ciclo={ativo.ciclo}
            etapas={ativo.etapas}
            alturaTeclado={alturaTeclado}
            onFechar={voltar}
          />
        );
      }
      if (!carregado) return <>{cabecalho}</>;
      break;
    case 'anteriores':
      return (
        <>
          <CabecalhoPainel titulo="Ciclos anteriores" subtitulo={area.nome} onFechar={voltar} />
          <ScrollView style={{ maxHeight: Math.max(220, height * 0.5) }}>
            {anteriores.map((ciclo, indice) => (
              <LinhaNavegacao
                key={ciclo.id}
                icone="sprout"
                rotulo={`${ciclo.cultura} · ${ciclo.dataPlantio.getFullYear()}`}
                valor={textoCicloEncerrado({ status: ciclo.status, encerradoEm: null })}
                divisor={indice > 0}
                onPress={() => setVista({ tipo: 'anterior', cicloId: ciclo.id })}
              />
            ))}
          </ScrollView>
        </>
      );
    case 'anterior':
      return (
        <CicloAnterior
          area={area}
          cicloId={vista.cicloId}
          alturaTeclado={alturaTeclado}
          onFechar={() => setVista({ tipo: 'anteriores' })}
        />
      );
    default:
      break;
  }

  const safraAntiga = ativo ? null : resumoDaSafra(area);
  return (
    <>
      {cabecalho}
      {ativo ? (
        <>
          <CartaoCiclo ciclo={ativo.ciclo} etapas={ativo.etapas} />
          <BotaoMapa rotulo="Ver linha do tempo" onPress={() => setVista({ tipo: 'linhaDoTempo' })} />
        </>
      ) : carregado ? (
        <>
          {safraAntiga ? (
            // Safra registrada antes dos ciclos: só leitura, até o primeiro plantio
            <View style={estilos.cartao}>
              <View style={estilos.cartaoLinha}>
                <AppIcon name="sprout" size={20} color={AgroColors.forest} />
                <Text style={estilos.cartaoTitulo} numberOfLines={1}>
                  {safraAntiga.cultura}
                </Text>
                {safraAntiga.dias !== null ? <Text style={estilos.cartaoDetalhe}>dia {safraAntiga.dias}</Text> : null}
              </View>
              {safraAntiga.fase ? <Text style={estilos.cartaoDetalhe}>{safraAntiga.fase}</Text> : null}
            </View>
          ) : null}
          <BotaoMapa rotulo="Plantar nesta área" icone="sprout" onPress={() => setVista({ tipo: 'plantar' })} />
        </>
      ) : null}
      <View>
        {anteriores.length > 0 ? (
          <LinhaNavegacao
            icone="history"
            rotulo="Ciclos anteriores"
            valor={anteriores.length}
            onPress={() => setVista({ tipo: 'anteriores' })}
          />
        ) : null}
        {linhaCerca}
      </View>
    </>
  );
}

/** Um ciclo da lista de anteriores, aberto só para leitura. */
function CicloAnterior({
  area,
  cicloId,
  alturaTeclado,
  onFechar,
}: {
  area: Talhao;
  cicloId: string;
  alturaTeclado: number;
  onFechar: () => void;
}) {
  const { dados } = useConsultaAoVivo<CicloComEtapas | null>(
    () => cicloComEtapas(cicloId),
    TABELAS_CICLO,
    cicloId,
    null
  );
  if (!dados) return <CabecalhoPainel titulo="Ciclo anterior" subtitulo={area.nome} onFechar={onFechar} />;
  return (
    <LinhaDoTempoCiclo
      area={area}
      ciclo={dados.ciclo}
      etapas={dados.etapas}
      somenteLeitura
      alturaTeclado={alturaTeclado}
      onFechar={onFechar}
    />
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.xs,
  },
  cartaoLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cartaoTitulo: { flex: 1, fontSize: 16.5, lineHeight: 22, fontWeight: '700', color: CoresTexto.escuro },
  cartaoDetalhe: { fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
});
