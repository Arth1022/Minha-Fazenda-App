import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ScreenContainer } from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { Spacing, Typography } from '@/constants/theme';

/** Boas-vindas: Criar conta, Entrar ou Entrar sem conta. Layout básico (o visual será refeito). */
export default function BoasVindasScreen() {
  const router = useRouter();
  return (
    <ScreenContainer withTabInset={false}>
      <View style={estilos.conteudo}>
        <Text style={Typography.screenTitle}>{APP_NAME}</Text>
        <Text style={Typography.body}>Gestão da fazenda que funciona sem internet.</Text>
        <View style={estilos.botoes}>
          <Button label="Criar conta" onPress={() => router.push('/cadastro')} fullWidth />
          <Button label="Entrar" variant="outline" onPress={() => router.push('/entrar')} fullWidth />
          <Button label="Entrar sem conta" variant="ghost" onPress={() => router.push('/sem-conta')} fullWidth />
        </View>
      </View>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.three, paddingVertical: Spacing.six },
  botoes: { gap: Spacing.two, marginTop: Spacing.four },
});
