import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, IconeRedondo } from '@/components/ui';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, type EtapaCiclo } from '@/database';
import { formatarDuracao, type SessaoCompleta } from '@/features/maquinas';
import { etapasPendentesNasAreas, marcarEtapaFeita, TABELAS_CICLO } from '@/services/cicloService';
import {
  numerosDaSessao,
  sugestaoDeEtapa,
  textoFimAutomatico,
  textoHorario,
  textoKm,
} from '../../services/trajetos';
import { BotaoMapa, CoresTexto } from '../elementos';
import { BotaoRedondo } from './elementosPainel';

type Pendente = { areaId: string; etapa: EtapaCiclo };

const COR_FORA = '#B6BDC4';

export interface PainelSessaoProps {
  sessao: SessaoCompleta;
  /** Cor fixa da máquina */
  cor: string;
  /** Fim automático que ainda dá para desfazer (RF-050) */
  podeDesfazer: boolean;
  onDesfazer: () => Promise<void>;
  onFechar: () => void;
  /** Altura do painel, para a câmera enquadrar o trajeto acima dele */
  onAltura?: (altura: number) => void;
}

/**
 * Resumo da sessão no mapa (tela 25, RF-056/RF-063): faixa do fim automático
 * com "Desfazer", os quatro números, o tempo e o KM em cada área e a sugestão
 * de marcar a etapa da lavoura por onde a máquina passou (RF-059).
 */
export function PainelSessao({ sessao, cor, podeDesfazer, onDesfazer, onFechar, onAltura }: PainelSessaoProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { uso, maquina, implemento, areas } = sessao;
  const [desfazendo, setDesfazendo] = useState(false);
  const [dispensada, setDispensada] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [marcada, setMarcada] = useState<string | null>(null);

  const areaIds = areas.map((a) => a.areaId);
  const { dados: pendentes } = useConsultaAoVivo<Pendente[]>(
    () => etapasPendentesNasAreas(areaIds),
    TABELAS_CICLO,
    `${uso.id}:${areaIds.join()}`,
    []
  );

  const numeros = numerosDaSessao(uso, areas);
  const faixa = textoFimAutomatico(uso.fimMotivo);
  const sugestao = uso.fim
    ? sugestaoDeEtapa({
        dia: uso.fim,
        atividade: uso.atividade,
        tipos: implemento ? [maquina.tipo, implemento.tipo] : [maquina.tipo],
        areas,
        pendentes,
      })
    : null;

  const desfazer = async () => {
    setDesfazendo(true);
    try {
      await onDesfazer();
    } catch (erro) {
      Alert.alert('Não deu para desfazer', erro instanceof Error ? erro.message : 'Tente de novo.');
    } finally {
      setDesfazendo(false);
    }
  };

  const marcar = async () => {
    if (!sugestao) return;
    setMarcando(true);
    try {
      await marcarEtapaFeita(sugestao.etapa.id, uso.fim ?? new Date());
      setMarcada(`${sugestao.etapa.nome} marcada como feita em ${sugestao.areaNome}.`);
    } catch (erro) {
      Alert.alert('Não deu certo', erro instanceof Error ? erro.message : 'Tente de novo.');
    } finally {
      setMarcando(false);
    }
  };

  return (
    <View style={estilos.camada} pointerEvents="box-none">
      <View
        style={[estilos.painel, { paddingBottom: insets.bottom + Spacing.three }]}
        onLayout={(e) => onAltura?.(e.nativeEvent.layout.height)}>
        <View style={estilos.alca} />
        <ScrollView style={{ maxHeight: height * 0.62 }} contentContainerStyle={estilos.conteudo}>
          {faixa ? (
            <View style={estilos.faixa}>
              <AppIcon name="clock" size={20} color={AgroColors.health} />
              <Text style={estilos.faixaTexto}>{faixa}</Text>
              {podeDesfazer ? (
                <Pressable onPress={desfazer} disabled={desfazendo} hitSlop={8} accessibilityRole="button">
                  <Text style={[estilos.desfazer, desfazendo && estilos.apagado]}>Desfazer</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={estilos.cabecalho}>
            <View style={estilos.titulos}>
              <View style={estilos.linhaNome}>
                <View style={[estilos.bolinha, { backgroundColor: cor }]} />
                <Text style={estilos.nome} numberOfLines={1}>
                  {maquina.nome}
                </Text>
              </View>
              <Text style={estilos.subtitulo}>
                {[uso.operador, textoHorario(uso.inicio, uso.fim)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <BotaoRedondo icone="x" rotulo="Fechar o resumo" onPress={onFechar} />
          </View>

          {uso.rastreado ? (
            <View style={estilos.grade}>
              <Numero valor={numeros.km !== null ? textoKm(numeros.km) : '—'} rotulo="distância" />
              <Numero valor={formatarDuracao(numeros.duracaoMs)} rotulo="duração" />
              <Numero
                valor={numeros.emMovimentoMs !== null ? formatarDuracao(numeros.emMovimentoMs) : '—'}
                rotulo="em movimento"
              />
              <Numero valor={numeros.paradoMs !== null ? formatarDuracao(numeros.paradoMs) : '—'} rotulo="parado" />
            </View>
          ) : (
            <Text style={estilos.semGps}>
              Sem GPS neste uso: ficou registrado só o tempo ({formatarDuracao(numeros.duracaoMs)}).
            </Text>
          )}

          {areas.length > 0 || numeros.foraDasAreasKm !== null ? (
            <View style={estilos.bloco}>
              <Text style={estilos.secao}>Por área</Text>
              {areas.map((area) => (
                <LinhaArea
                  key={area.areaId}
                  cor={COR_POR_TIPO_AREA[area.tipo]}
                  nome={area.nome}
                  valor={`${formatarDuracao(area.segundos * 1000)} · ${textoKm(area.km)}`}
                />
              ))}
              {numeros.foraDasAreasKm !== null ? (
                <LinhaArea cor={COR_FORA} nome="Fora das áreas" valor={textoKm(numeros.foraDasAreasKm)} apagada />
              ) : null}
            </View>
          ) : null}

          {marcada ? (
            <View style={estilos.marcada}>
              <AppIcon name="check" size={20} color={AgroColors.forest} />
              <Text style={estilos.marcadaTexto}>{marcada}</Text>
            </View>
          ) : sugestao && !dispensada ? (
            <View style={estilos.sugestao}>
              <View style={estilos.sugestaoTopo}>
                <IconeRedondo nome="sprout" tom="verde" tamanho={44} />
                <View style={estilos.titulos}>
                  <Text style={estilos.sugestaoTitulo}>Passou em {sugestao.areaNome}</Text>
                  <Text style={estilos.sugestaoTexto}>Marcar {sugestao.etapa.nome} como feita?</Text>
                </View>
              </View>
              <View style={estilos.sugestaoAcoes}>
                <Pressable onPress={() => setDispensada(true)} hitSlop={8} accessibilityRole="button">
                  <Text style={estilos.agoraNao}>Agora não</Text>
                </Pressable>
                <BotaoMapa rotulo="Marcar feita" onPress={marcar} carregando={marcando} style={estilos.botaoMarcar} />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={estilos.numero}>
      <Text style={estilos.numeroValor}>{valor}</Text>
      <Text style={estilos.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

function LinhaArea({ cor, nome, valor, apagada = false }: { cor: string; nome: string; valor: string; apagada?: boolean }) {
  return (
    <View style={estilos.linhaArea}>
      <View style={[estilos.quadrado, { backgroundColor: cor }]} />
      <Text style={[estilos.areaNome, apagada && estilos.areaApagada]} numberOfLines={1}>
        {nome}
      </Text>
      <Text style={estilos.areaValor}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  camada: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  painel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: AgroColors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  alca: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full, backgroundColor: AgroColors.borderStrong },
  conteudo: { gap: Spacing.three, paddingTop: Spacing.xs },
  apagado: { opacity: 0.5 },
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: AgroColors.healthBg,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
  },
  faixaTexto: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600', color: AgroColors.health },
  desfazer: { fontSize: 15, fontWeight: '800', color: AgroColors.health, textDecorationLine: 'underline' },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titulos: { flex: 1, gap: 2 },
  linhaNome: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bolinha: { width: 14, height: 14, borderRadius: 7 },
  nome: { flexShrink: 1, fontSize: 22, lineHeight: 28, fontWeight: '800', color: CoresTexto.escuro },
  subtitulo: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  numero: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: 2,
  },
  numeroValor: { fontSize: 19, lineHeight: 25, fontWeight: '800', color: CoresTexto.escuro },
  numeroRotulo: { fontSize: 13.5, lineHeight: 18, color: CoresTexto.suave },
  semGps: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
  bloco: { gap: Spacing.sm },
  secao: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: CoresTexto.suave },
  linhaArea: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 36 },
  quadrado: { width: 14, height: 14, borderRadius: 3 },
  areaNome: { flex: 1, fontSize: 16, lineHeight: 21, color: CoresTexto.escuro },
  areaApagada: { color: CoresTexto.suave },
  areaValor: { fontSize: 15, lineHeight: 20, color: CoresTexto.suave },
  sugestao: {
    borderWidth: 1,
    borderColor: AgroColors.border,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  sugestaoTopo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sugestaoTitulo: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: CoresTexto.escuro },
  sugestaoTexto: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
  sugestaoAcoes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.lg },
  agoraNao: { fontSize: 15, fontWeight: '700', color: CoresTexto.suave },
  botaoMarcar: { minHeight: 44, paddingHorizontal: Spacing.lg },
  marcada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: AgroColors.forestTint,
    borderRadius: Radius.xl,
    padding: Spacing.three,
  },
  marcadaTexto: { flex: 1, fontSize: 14.5, lineHeight: 20, fontWeight: '600', color: AgroColors.forest },
});
