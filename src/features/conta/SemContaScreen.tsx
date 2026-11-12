import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomInput } from '@/components/forms';
import { Button, Header, ScreenContainer } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { Avatar } from '@/shared/Avatar';
import { useSemConta } from './useSemConta';

/**
 * Aviso do modo sem conta. O texto não promete levar os dados para a nuvem:
 * TODO(decisao): migrar os dados do modo sem conta ao criar conta (fora desta entrega).
 */
const AVISO =
  'Seus dados ficarão salvos apenas neste celular. Se você trocar de aparelho, desinstalar o app ou perder o celular, eles não poderão ser recuperados. Sem conta, também não é possível adicionar colaboradores.';

/** Entrar sem conta: aviso e depois perfil e fazenda locais. Layout básico. */
export default function SemContaScreen() {
  const router = useRouter();
  const s = useSemConta();

  if (s.etapa === 'aviso') {
    return (
      <ScreenContainer withTabInset={false} header={<Header title="Entrar sem conta" showBack />}>
        <View style={estilos.conteudo}>
          <Text style={Typography.body}>{AVISO}</Text>
          <Button label="Continuar sem conta" onPress={s.continuar} fullWidth />
          <Button label="Voltar" variant="outline" onPress={() => router.back()} fullWidth />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withTabInset={false} header={<Header title="Seu perfil" showBack />}>
      <View style={estilos.conteudo}>
        <View style={estilos.avatar}>
          <Pressable onPress={s.escolherFoto} accessibilityRole="button" accessibilityLabel="Escolher foto (opcional)">
            <Avatar nome={s.nome} avatarUrl={s.fotoUri} tamanho={88} />
          </Pressable>
          <Text style={Typography.caption}>Foto (opcional)</Text>
        </View>
        <CustomInput
          label="Seu nome"
          value={s.nome}
          onChangeText={s.setNome}
          error={s.erros.nome}
          maxLength={60}
          autoCapitalize="words"
          required
        />
        <CustomInput
          label="Nome da fazenda"
          value={s.nomeFazenda}
          onChangeText={s.setNomeFazenda}
          error={s.erros.nomeFazenda}
          placeholder="Ex.: Sítio Boa Vista"
          required
        />
        {s.erroGeral ? <Text style={estilos.erro}>{s.erroGeral}</Text> : null}
        <Button label="Começar" onPress={s.concluir} loading={s.salvando} fullWidth />
      </View>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.three, paddingVertical: Spacing.three },
  avatar: { alignItems: 'center', gap: Spacing.one },
  erro: { ...Typography.body, color: AgroColors.danger },
});
