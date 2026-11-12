import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors } from '@/constants/theme';
import type { Papel } from '@/database';
import { inicialDoNome } from '@/shared/inicialECor';

export const NOME_PAPEL: Record<Papel, string> = { owner: 'Dono', collaborator: 'Colaborador' };

/** Quadrado verde-claro com a inicial da fazenda (lista de fazendas e perfil). */
export function IconeFazenda({ nome, tamanho = 56 }: { nome: string; tamanho?: number }) {
  return (
    <View style={[estilos.icone, { width: tamanho, height: tamanho, borderRadius: tamanho * 0.27 }]}>
      <Text style={[estilos.inicial, { fontSize: tamanho * 0.42 }]}>{inicialDoNome(nome)}</Text>
    </View>
  );
}

/** "Dono" em verde, "Colaborador" em cinza. */
export function ChipPapel({ papel }: { papel: Papel }) {
  const dono = papel === 'owner';
  return (
    <View style={[estilos.chip, dono ? estilos.chipDono : estilos.chipColaborador]}>
      <Text style={[estilos.chipTexto, dono ? estilos.chipTextoDono : estilos.chipTextoColaborador]}>
        {NOME_PAPEL[papel]}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  icone: { backgroundColor: AgroColors.forestTint, alignItems: 'center', justifyContent: 'center' },
  inicial: { fontWeight: '700', color: AgroColors.forest },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  chipDono: { backgroundColor: AgroColors.forestTint },
  chipColaborador: { backgroundColor: '#ECEEEC' },
  chipTexto: { fontSize: 14, fontWeight: '700' },
  chipTextoDono: { color: AgroColors.forest },
  chipTextoColaborador: { color: '#4A514C' },
});
