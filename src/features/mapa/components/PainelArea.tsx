import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, type CalculoCerca, type Talhao } from '@/database';
import {
  formatarDuracao,
  segundosNaAreaDesde,
  TABELAS_USOS_AREA,
  usosDaArea,
  type UsoNaArea,
} from '@/features/maquinas';
import { calculoCercaDaArea, TABELAS_CERCA } from '@/services/cercaService';
import { inicioDoDia } from '@/utils/date';
import { useAlturaTeclado } from '../hooks/useAlturaTeclado';
import {
  resumoDaArea,
  ROTULO_ESTADO_AREA,
  situacaoDaArea,
  type EstadoArea,
} from '../services/areas';
import { textoHa } from '../services/trajetos';
import type { OcupacaoArea } from '../services/ocupacao';
import { CoresTexto } from './elementos';
import { CercarArea } from './painel/CercarArea';
import { ConteudoLavoura } from './painel/ConteudoLavoura';
import { ConteudoPasto } from './painel/ConteudoPasto';
import { BotaoRedondo, LinhaNavegacao } from './painel/elementosPainel';
import { UsosDaArea } from './painel/UsosDaArea';

/** O que o painel mostra no lugar do resumo: "Cercar" (tela 21) ou as horas de máquina. */
export type VistaArea = 'resumo' | 'cercar' | 'maquinas';

const TOM_ESTADO: Record<EstadoArea, { fundo: string; texto: string }> = {
  ocupado: { fundo: AgroColors.forestTint, texto: AgroColors.forest },
  plantada: { fundo: AgroColors.forestTint, texto: AgroColors.forest },
  descanso: { fundo: AgroColors.divider, texto: AgroColors.textSecondary },
  vazia: { fundo: AgroColors.divider, texto: AgroColors.textSecondary },
  colhida: { fundo: AgroColors.healthBg, texto: AgroColors.health },
};

export interface PainelAreaProps {
  area: Talhao;
  /** Animais no pasto (cabeças, desde quando, última saída) */
  ocupacao: OcupacaoArea | undefined;
  /** Pastos e ocupação da fazenda: destinos ao mover animais */
  pastos: readonly Talhao[];
  ocupacoes: ReadonlyMap<string, OcupacaoArea>;
  /** Animal achado na busca do mapa ("Estrela · 10388 está neste pasto") */
  destaque?: string | null;
  /** "⋮": renomear, redesenhar, ponto de atenção, excluir */
  onOpcoes: () => void;
  onFechar: () => void;
  /** Destino escolhido ao mover animais, para o mapa destacar */
  onDestaque: (areaId: string | null) => void;
  /** Altura do painel, para a câmera enquadrar a área acima dele */
  onAltura?: (altura: number) => void;
  /** Resumo, "Cercar" ou horas de máquina (a tela do mapa guarda: o voltar do Android é dela) */
  vista: VistaArea;
  onVista: (vista: VistaArea) => void;
  /** Uso de máquina tocado na lista: o resumo dele abre no mapa (RF-066) */
  onAbrirUso: (usoId: string) => void;
  /** Admin cria cultura nova no "Plantar" (RF-042) */
  podeCriarCultura: boolean;
  /** Lavoura: abre direto na linha do tempo do ciclo (toque no aviso de uma etapa) */
  abrirLinhaDoTempo?: boolean;
  /** Abre o relato de ocorrência já vinculado a esta área */
  onRelatarProblema?: () => void;
}

/**
 * Painel inferior da área tocada (RF-004): cor do tipo, nome, selo da situação,
 * "Tipo · área · perímetro" e o conteúdo do tipo. Fica sobre o mapa sem
 * escurecer nem bloquear: dá para tocar em outra área com ele aberto. Sobe com
 * o teclado (no Android edge-to-edge a janela não encolhe).
 */
export function PainelArea({
  area,
  ocupacao,
  pastos,
  ocupacoes,
  destaque = null,
  onOpcoes,
  onFechar,
  onDestaque,
  onAltura,
  vista,
  onVista,
  onAbrirUso,
  podeCriarCultura,
  abrirLinhaDoTempo = false,
  onRelatarProblema,
}: PainelAreaProps) {
  const insets = useSafeAreaInsets();
  const alturaTeclado = useAlturaTeclado();
  const { estado } = situacaoDaArea(area, ocupacao);
  const cercando = vista === 'cercar';
  // A cerca salva só é lida com o "Cercar" aberto (ele vem do menu ⋮ da área)
  const { dados: cercas } = useConsultaAoVivo<CalculoCerca[]>(
    () => (cercando ? calculoCercaDaArea(area.id) : Promise.resolve([])),
    TABELAS_CERCA,
    cercando ? area.id : '',
    []
  );
  const cerca = cercas[0] ?? null;
  // Máquinas que passaram na área (RF-066): a lista e o tempo de hoje, pelo índice da área
  const { dados: usos } = useConsultaAoVivo<UsoNaArea[]>(
    () => usosDaArea(area.id),
    TABELAS_USOS_AREA,
    area.id,
    []
  );
  const { dados: segundosHoje } = useConsultaAoVivo<number>(
    () => segundosNaAreaDesde(area.id, inicioDoDia(new Date())),
    TABELAS_USOS_AREA,
    area.id,
    0
  );

  // "Horas de máquina — 52 min hoje" (tela 15); sem uso nenhum na área, não aparece
  const linhaMaquinas =
    usos.length === 0 ? null : (
      <LinhaNavegacao
        icone="tractor"
        rotulo="Horas de máquina"
        valor={segundosHoje > 0 ? `${formatarDuracao(segundosHoje * 1000)} hoje` : `último ${textoHa(usos[0].inicio)}`}
        onPress={() => onVista('maquinas')}
      />
    );
  const linhaOcorrencia = !onRelatarProblema ? null : (
    <LinhaNavegacao
      icone="wrench"
      rotulo="Relatar problema nesta área"
      valor={null}
      onPress={onRelatarProblema}
    />
  );

  const linhasDoFim = (
    <>
      {linhaOcorrencia}
      {linhaMaquinas}
    </>
  );

  const cabecalho = (
    <View style={estilos.cabecalho}>
      <View style={estilos.titulos}>
        <View style={estilos.linhaNome}>
          <View style={[estilos.cor, { backgroundColor: COR_POR_TIPO_AREA[area.tipo] }]} />
          <Text style={estilos.nome} numberOfLines={1}>
            {area.nome}
          </Text>
          {estado ? (
            <View style={[estilos.selo, { backgroundColor: TOM_ESTADO[estado].fundo }]}>
              <Text style={[estilos.seloTexto, { color: TOM_ESTADO[estado].texto }]}>
                {ROTULO_ESTADO_AREA[estado]}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={estilos.resumo}>{resumoDaArea(area)}</Text>
      </View>
      <BotaoRedondo icone="moreVertical" rotulo="Mais opções da área" onPress={onOpcoes} />
      <BotaoRedondo icone="x" rotulo="Fechar painel da área" onPress={onFechar} />
    </View>
  );

  return (
    <View style={[estilos.camada, { bottom: alturaTeclado }]} pointerEvents="box-none">
      <View
        style={[
          estilos.painel,
          { paddingBottom: (alturaTeclado > 0 ? 0 : insets.bottom) + Spacing.three },
        ]}
        onLayout={(e) => onAltura?.(e.nativeEvent.layout.height)}>
        <View style={estilos.alca} />

        {cercando ? (
          <CercarArea
            area={area}
            calculo={cerca}
            alturaTeclado={alturaTeclado}
            onFechar={() => onVista('resumo')}
          />
        ) : vista === 'maquinas' ? (
          <UsosDaArea area={area} usos={usos} onAbrir={onAbrirUso} onFechar={() => onVista('resumo')} />
        ) : area.tipo === 'pasto' ? (
          <ConteudoPasto
            area={area}
            ocupacao={ocupacao}
            pastos={pastos}
            ocupacoes={ocupacoes}
            cabecalho={cabecalho}
            destaque={destaque}
            tecladoAberto={alturaTeclado > 0}
            onDestaque={onDestaque}
            linhasDoFim={linhasDoFim}
          />
        ) : area.tipo === 'lavoura' ? (
          <ConteudoLavoura
            area={area}
            cabecalho={cabecalho}
            linhasDoFim={linhasDoFim}
            alturaTeclado={alturaTeclado}
            podeCriarCultura={podeCriarCultura}
            abrirLinhaDoTempo={abrirLinhaDoTempo}
          />
        ) : (
          <>
            {cabecalho}
            <View>{linhasDoFim}</View>
          </>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  camada: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  painel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: AgroColors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.three,
    ...Shadows.md,
  },
  alca: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.borderStrong,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titulos: { flex: 1, gap: 2 },
  linhaNome: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cor: { width: 14, height: 14, borderRadius: 3 },
  nome: { flexShrink: 1, fontSize: 22, lineHeight: 28, fontWeight: '800', color: CoresTexto.escuro },
  selo: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.xs },
  seloTexto: { fontSize: 12.5, lineHeight: 16, fontWeight: '700' },
  resumo: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
});
