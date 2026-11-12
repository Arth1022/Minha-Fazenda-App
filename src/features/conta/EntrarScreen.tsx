import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Header, ScreenContainer } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { CredencialForm } from './CredencialForm';
import { useEntrar } from './useEntrar';

/** Login. Layout básico (o visual será refeito); a lógica fica em useEntrar. */
export default function EntrarScreen() {
  const e = useEntrar();
  return (
    <ScreenContainer withTabInset={false} header={<Header title="Entrar" showBack />}>
      <View style={estilos.conteudo}>
        <CredencialForm onChange={e.setCredencial} erro={e.erroEmail} />
        {e.erroGeral ? <Text style={estilos.erro}>{e.erroGeral}</Text> : null}
        <Button label="Entrar" onPress={e.concluir} loading={e.enviando} fullWidth />
      </View>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.three, paddingVertical: Spacing.three },
  erro: { ...Typography.body, color: AgroColors.danger },
});
