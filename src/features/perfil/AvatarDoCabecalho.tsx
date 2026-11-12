import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IndicadorSync } from '@/features/sync';
import { useEstadoDaConta, useUsuarioAtual } from '@/services/usuario';
import { Avatar } from '@/shared/Avatar';

/**
 * Canto direito do cabeçalho em todas as telas: indicador do sync (só com
 * conta) e o avatar, que abre o perfil. Antes de entrar na conta, não aparece.
 */
export function AvatarDoCabecalho() {
  const router = useRouter();
  const naTelaDoPerfil = usePathname() === '/perfil';
  const usuario = useUsuarioAtual();
  const estado = useEstadoDaConta();
  if (estado !== 'logado' && estado !== 'sem-conta') return null;
  return (
    <View style={estilos.linha}>
      {estado === 'logado' ? <IndicadorSync /> : null}
      <Pressable
        onPress={() => router.push('/perfil')}
        disabled={naTelaDoPerfil}
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
        hitSlop={8}>
        <Avatar nome={usuario.nome} avatarUrl={usuario.avatarUrl} usuarioId={usuario.id} tamanho={32} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
