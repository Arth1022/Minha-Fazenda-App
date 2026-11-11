import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, type CalculoCerca, type Talhao } from '@/database';
import { calculoCercaDaArea, TABELAS_CERCA } from '@/services/cercaService';
import { useAlturaTeclado } from '../hooks/useAlturaTeclado';
import {
  podeCercar,
  resumoDaArea,
  ROTULO_ESTADO_AREA,
  situacaoDaArea,
  type EstadoArea,
} from '../services/areas';
import { resumoDaCerca } from '../services/cerca';
import type { OcupacaoArea } from '../services/ocupacao';
import { CoresTexto } from './elementos';
import { CercarArea } from './painel/CercarArea';
import { ConteudoLavoura } from './painel/ConteudoLavoura';
import { ConteudoPasto } from './painel/ConteudoPasto';
import { BotaoRedondo, LinhaNavegacao } from './painel/elementosPainel';

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
  /** Mostrando "Cercar" (tela 21) no lugar do resumo */
  cercando: boolean;
  /** Abre ("Cerca" do painel ou "⋮") ou fecha o "Cercar" */
  onCercando: (ativo: boolean) => void;
  /** Admin cria cultura nova no "Plantar" (RF-042) */
  podeCriarCultura: boolean;
  /** Lavoura: abre direto na linha do tempo do ciclo (toque no aviso de uma etapa) */
  abrirLinhaDoTempo?: boolean;
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
  cercando,
  onCercando,
  podeCriarCultura,
  abrirLinhaDoTempo = false,
}: PainelAreaProps) {
  const insets = useSafeAreaInsets();
  const alturaTeclado = useAlturaTeclado();
  const { estado } = situacaoDaArea(area, ocupacao);
  const { dados: cercas } = useConsultaAoVivo<CalculoCerca[]>(
    () => calculoCercaDaArea(area.id),
    TABELAS_CERCA,
    area.id,
    []
  );
  const cerca = cercas[0] ?? null;

  // Cerca (RF-028 a RF-032): pasto, lavoura e reserva; "outro" não tem
  const linhaCerca = !podeCercar(area.tipo) ? null : (
      <LinhaNavegacao
        icone="fence"
        rotulo={cerca ? 'Cerca' : 'Cercar esta área'}
        valor={cerca ? (cerca.desatualizado ? 'desatualizada' : resumoDaCerca(cerca)) : null}
        alerta={cerca?.desatualizado ?? false}
        onPress={() => onCercando(true)}
      />
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
            onFechar={() => onCercando(false)}
          />
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
            linhaCerca={linhaCerca}
          />
        ) : area.tipo === 'lavoura' ? (
          <ConteudoLavoura
            area={area}
            cabecalho={cabecalho}
            linhaCerca={linhaCerca}
            alturaTeclado={alturaTeclado}
            podeCriarCultura={podeCriarCultura}
            abrirLinhaDoTempo={abrirLinhaDoTempo}
          />
        ) : (
          <>
            {cabecalho}
            {linhaCerca}
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
