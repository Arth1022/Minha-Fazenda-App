import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { Talhao } from '@/database';
import { BotaoMapa, CoresTexto } from '../elementos';
import { formatarNumero } from '../../services/calculos';
import {
  gruposPorLote,
  situacaoDoPasto,
  textoDias,
  type OcupacaoArea,
} from '../../services/ocupacao';
import { LinhaNavegacao } from './elementosPainel';

export interface AnimalNoPasto {
  id: string;
  nome: string | null;
  brinco: string;
  loteId: string | null;
  loteNome: string | null;
  entradaEm: Date;
}

export interface ResumoPastoProps {
  area: Talhao;
  ocupacao: OcupacaoArea | undefined;
  animais: readonly AnimalNoPasto[];
  /** Animal achado na busca do mapa: aparece em destaque no topo */
  destaque?: string | null;
  onVerAnimais: () => void;
  onAbrirLote: (loteId: string) => void;
  onColocar: () => void;
  onMover: () => void;
  onHistorico: () => void;
  /** Linhas do fim do painel (tela 14), depois do histórico: "Horas de máquina", "Cerca" */
  linhasDoFim?: React.ReactNode;
}

/** Painel do pasto (protótipo, tela 14): números, animais por lote e o que dá para fazer. */
export function ResumoPasto({
  area,
  ocupacao,
  animais,
  destaque = null,
  onVerAnimais,
  onAbrirLote,
  onColocar,
  onMover,
  onHistorico,
  linhasDoFim = null,
}: ResumoPastoProps) {
  const situacao = situacaoDoPasto(area.areaHectares, ocupacao);
  const grupos = gruposPorLote(animais);
  const ocupado = situacao.estado === 'ocupado';
  const dias = ocupado ? situacao.diasOcupado : situacao.diasDescanso;

  return (
    <>
      {destaque ? (
        <View style={estilos.destaque}>
          <AppIcon name="cow" size={18} color={AgroColors.forest} />
          <Text style={estilos.destaqueTexto}>{destaque} está neste pasto</Text>
        </View>
      ) : null}

      <View style={estilos.numeros}>
        <Numero valor={String(situacao.cabecas)} rotulo="cabeças" />
        <View style={estilos.separador} />
        <Numero
          valor={ocupado && situacao.lotacao !== null ? formatarNumero(situacao.lotacao, 2) : '—'}
          rotulo="cab/ha"
        />
        <View style={estilos.separador} />
        <Numero valor={dias === null ? '—' : textoDias(dias)} rotulo={ocupado ? 'ocupado' : 'descanso'} />
      </View>

      <View>
        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Animais aqui</Text>
          {ocupado ? (
            <Pressable onPress={onVerAnimais} hitSlop={8} accessibilityRole="button">
              <Text style={estilos.link}>Ver todos</Text>
            </Pressable>
          ) : null}
        </View>
        {grupos.length === 0 ? (
          <Text style={estilos.vazio}>Nenhum animal neste pasto agora.</Text>
        ) : (
          grupos.map((grupo, indice) => (
            <LinhaNavegacao
              key={grupo.loteId ?? 'sem-lote'}
              rotulo={grupo.nome}
              valor={grupo.quantidade}
              divisor={indice > 0}
              onPress={() => (grupo.loteId ? onAbrirLote(grupo.loteId) : onVerAnimais())}
            />
          ))
        )}
      </View>

      <View style={estilos.botoes}>
        <BotaoMapa
          rotulo="Colocar animais"
          variante={ocupado ? 'contorno' : 'primario'}
          onPress={onColocar}
          style={estilos.botao}
        />
        {ocupado ? <BotaoMapa rotulo="Mover para…" onPress={onMover} style={estilos.botao} /> : null}
      </View>

      <View>
        <LinhaNavegacao icone="history" rotulo="Histórico de ocupação" onPress={onHistorico} />
        {linhasDoFim}
      </View>
    </>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={estilos.numero}>
      <Text style={estilos.numeroValor} numberOfLines={1}>
        {valor}
      </Text>
      <Text style={estilos.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  destaque: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.forestTint,
  },
  destaqueTexto: { flex: 1, fontSize: 14.5, fontWeight: '700', color: AgroColors.forest },
  numeros: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.surfaceMuted,
  },
  numero: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: Spacing.xs },
  numeroValor: { fontSize: 21, lineHeight: 27, fontWeight: '800', color: CoresTexto.escuro },
  numeroRotulo: { fontSize: 13.5, lineHeight: 18, color: CoresTexto.suave },
  separador: { width: 1, alignSelf: 'stretch', backgroundColor: AgroColors.border },
  secao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  secaoTitulo: { fontSize: 15.5, lineHeight: 21, fontWeight: '600', color: '#3A403C' },
  link: { fontSize: 15, fontWeight: '700', color: AgroColors.forest },
  vazio: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave, paddingVertical: Spacing.sm },
  botoes: { flexDirection: 'row', gap: Spacing.md },
  botao: { flex: 1 },
});
