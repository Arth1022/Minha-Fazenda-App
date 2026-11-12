import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomInput } from '@/components/forms';
import { Button, Header, ScreenContainer } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { Avatar } from '@/shared/Avatar';
import { CredencialForm } from './CredencialForm';
import { useCadastro } from './useCadastro';

/** Cadastro. Layout básico (o visual será refeito); a lógica fica em useCadastro. */
export default function CadastroScreen() {
  const c = useCadastro();
  return (
    <ScreenContainer withTabInset={false} header={<Header title="Criar conta" showBack />}>
      <View style={estilos.conteudo}>
        <View style={estilos.avatar}>
          <Pressable onPress={c.escolherFoto} accessibilityRole="button" accessibilityLabel="Escolher foto (opcional)">
            <Avatar nome={c.nome} avatarUrl={c.fotoUri} tamanho={88} />
          </Pressable>
          <Text style={Typography.caption}>{c.fotoUri ? 'Toque para trocar a foto' : 'Foto (opcional)'}</Text>
          {c.fotoUri ? <Button label="Tirar foto" size="sm" variant="ghost" onPress={c.tirarFoto} /> : null}
        </View>

        <CustomInput
          label="Seu nome"
          value={c.nome}
          onChangeText={c.setNome}
          error={c.erros.nome}
          maxLength={60}
          autoCapitalize="words"
          required
        />
        <CredencialForm onChange={c.setCredencial} erro={c.erros.email} erroSenha={c.erros.senha} novaSenha />
        {c.comConvite ? (
          <Text style={Typography.caption}>Você vai entrar na fazenda do convite.</Text>
        ) : (
          <CustomInput
            label="Nome da fazenda"
            value={c.nomeFazenda}
            onChangeText={c.setNomeFazenda}
            error={c.erros.nomeFazenda}
            placeholder="Ex.: Sítio Boa Vista"
            required
          />
        )}

        {c.erroGeral ? <Text style={estilos.erro}>{c.erroGeral}</Text> : null}
        <Button label="Criar conta" onPress={c.concluir} loading={c.enviando} fullWidth />
      </View>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.three, paddingVertical: Spacing.three },
  avatar: { alignItems: 'center', gap: Spacing.one },
  erro: { ...Typography.body, color: AgroColors.danger },
});
