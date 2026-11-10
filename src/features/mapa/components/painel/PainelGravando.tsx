import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { TempoDecorrido, type UsoAtual } from '@/features/maquinas';
import { textoKm } from '../../services/trajetos';
import { BotaoMapa, CoresTexto } from '../elementos';

export interface PainelGravandoProps {
  atual: UsoAtual;
  /** Cor fixa da máquina (a do traçado) */
  cor: string;
  /** Distância do rodapé da tela (área segura) */
  base: number;
  encerrando: boolean;
  onEncerrar: () => void;
}

/**
 * Sessão em andamento no mapa (tela 24, RF-047/RF-054): a máquina, quem opera,
 * o cronômetro, a distância e a área em que está agora, com "Encerrar sessão".
 */
export function PainelGravando({ atual, cor, base, encerrando, onEncerrar }: PainelGravandoProps) {
  const { uso, maquina, km, agora } = atual;
  return (
    <View style={[estilos.camada, { bottom: base }]} pointerEvents="box-none">
      <View style={estilos.cartao}>
        <View style={estilos.topo}>
          <View style={[estilos.icone, { backgroundColor: `${cor}1F` }]}>
            <AppIcon name="tractor" size={26} color={cor} />
          </View>
          <View style={estilos.textos}>
            <Text style={estilos.nome} numberOfLines={1}>
              {maquina.nome}
            </Text>
            {uso.operador ? <Text style={estilos.operador}>{uso.operador}</Text> : null}
          </View>
        </View>

        <View style={estilos.numeros}>
          <View style={estilos.numero}>
            <TempoDecorrido desde={uso.inicio} style={estilos.valor} />
            <Text style={estilos.rotulo}>tempo</Text>
          </View>
          <View style={estilos.divisor} />
          <View style={estilos.numero}>
            <Text style={estilos.valor}>{km !== null ? textoKm(km) : '—'}</Text>
            <Text style={estilos.rotulo}>distância</Text>
          </View>
          <View style={estilos.divisor} />
          <View style={estilos.numero}>
            <Text style={estilos.valor} numberOfLines={1}>
              {agora?.talhao ?? '—'}
            </Text>
            <Text style={estilos.rotulo}>agora</Text>
          </View>
        </View>

        <BotaoMapa rotulo="Encerrar sessão" icone="power" onPress={onEncerrar} carregando={encerrando} />
        <Text style={estilos.dica}>Ou escaneie o QR Code da máquina de novo</Text>
      </View>
    </View>
  );
}

/** "● Gravando trajeto": aviso fixo enquanto o GPS grava (RF-047). */
export function SeloGravando() {
  return (
    <View style={estilos.selo} accessibilityRole="text" accessibilityLabel="Gravando trajeto">
      <View style={estilos.seloPonto} />
      <Text style={estilos.seloTexto}>Gravando trajeto</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  camada: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.md },
  cartao: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: AgroColors.cardBg,
    borderRadius: 28,
    padding: Spacing.lg,
    gap: Spacing.three,
    ...Shadows.md,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  icone: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  nome: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: CoresTexto.escuro },
  operador: { fontSize: 15, lineHeight: 20, color: CoresTexto.suave },
  numeros: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
  },
  numero: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: Spacing.xs },
  divisor: { width: 1, alignSelf: 'stretch', backgroundColor: AgroColors.border },
  valor: { fontSize: 19, lineHeight: 25, fontWeight: '800', color: CoresTexto.escuro },
  rotulo: { fontSize: 13.5, lineHeight: 18, color: CoresTexto.suave },
  dica: { textAlign: 'center', fontSize: 13.5, lineHeight: 18, color: CoresTexto.suave },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadows.md,
  },
  seloPonto: { width: 12, height: 12, borderRadius: 6, backgroundColor: AgroColors.danger },
  seloTexto: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: CoresTexto.escuro },
});
