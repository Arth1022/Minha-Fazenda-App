import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Header, ScreenContainer } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { useAceitarConvite } from './useAceitarConvite';

/** Rota do link do convite. Layout básico (o visual será refeito). */
export default function ConviteScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { situacao, mensagem } = useAceitarConvite(token);

  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <ScreenContainer withTabInset={false} header={<Header title="Convite" />}>
      <View style={estilos.conteudo}>
        {situacao === 'aceitando' ? (
          <View style={estilos.linha}>
            <ActivityIndicator color={AgroColors.primary} />
            <Text style={Typography.body}>Entrando na fazenda…</Text>
          </View>
        ) : null}
        {situacao === 'expirado' ? (
          <Text style={Typography.sectionTitle}>Convite expirado, peça um novo ao dono da fazenda</Text>
        ) : null}
        {situacao === 'sem-conta' ? (
          <Text style={Typography.body}>
            Para entrar numa fazenda pelo convite é preciso ter conta. No modo sem conta os dados ficam só neste
            celular.
          </Text>
        ) : null}
        {situacao === 'erro' ? <Text style={Typography.body}>{mensagem}</Text> : null}
        {situacao !== 'aceitando' ? <Button label="Voltar" variant="outline" onPress={voltar} fullWidth /> : null}
      </View>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.three, paddingVertical: Spacing.three },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
