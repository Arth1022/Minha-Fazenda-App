import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { CicloPlantio, EtapaCiclo } from '@/database';
import { progressoDoCiclo, textoDiaDoCiclo, textoPrazo } from '../../services/plantio';
import { CoresTexto } from '../elementos';
import { BarraProgresso } from './elementosPainel';

/**
 * Card do ciclo no painel da lavoura (tela 15): cultura, "dia 21 de 110", a
 * barra e a próxima etapa com o prazo ("em 4 dias"; atrasada em vermelho).
 */
export function CartaoCiclo({ ciclo, etapas }: { ciclo: CicloPlantio; etapas: EtapaCiclo[] }) {
  const agora = new Date();
  const progresso = progressoDoCiclo(ciclo, etapas, agora);
  const proxima = progresso.proxima;
  return (
    <View style={estilos.cartao}>
      <View style={estilos.linha}>
        <AppIcon name="sprout" size={20} color={AgroColors.forest} />
        <Text style={estilos.cultura} numberOfLines={1}>
          {ciclo.cultura}
        </Text>
        <Text style={estilos.dia}>{textoDiaDoCiclo(progresso, ciclo, agora)}</Text>
      </View>
      <BarraProgresso fracao={progresso.fracao} />
      {proxima ? (
        <View style={estilos.linha}>
          <Text style={estilos.proxima} numberOfLines={1}>
            Próxima: <Text style={estilos.proximaNome}>{proxima.etapa.nome}</Text>
          </Text>
          <Text style={[estilos.prazo, proxima.dias < 0 && estilos.prazoAtrasado]}>{textoPrazo(proxima.dias)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.sm,
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cultura: { flex: 1, fontSize: 16.5, lineHeight: 22, fontWeight: '700', color: CoresTexto.escuro },
  dia: { fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
  proxima: { flex: 1, fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
  proximaNome: { fontWeight: '700', color: CoresTexto.escuro },
  prazo: { fontSize: 14.5, lineHeight: 20, fontWeight: '700', color: AgroColors.health },
  prazoAtrasado: { color: AgroColors.danger },
});
