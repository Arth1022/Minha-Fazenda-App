import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomInput } from '@/components/forms';
import { Button, Header, ScreenContainer } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { useFazendaAtiva } from '@/features/fazenda';
import { Avatar } from '@/shared/Avatar';
import { usePerfil } from './usePerfil';

/** Perfil. Layout básico (o visual será refeito); a lógica fica em usePerfil. */
export default function PerfilScreen() {
  const p = usePerfil();
  const { fazenda } = useFazendaAtiva();

  return (
    <ScreenContainer withTabInset={false} header={<Header title="Perfil" showBack />}>
      <View style={estilos.conteudo}>
        <View style={estilos.avatar}>
          <Pressable onPress={p.abrirOpcoesDaFoto} disabled={p.enviandoFoto} accessibilityRole="button" accessibilityLabel="Trocar a foto">
            <Avatar
              nome={p.usuario.nome}
              avatarUrl={p.usuario.avatarUrl}
              usuarioId={p.usuario.id}
              tamanho={120}
              carregando={p.enviandoFoto}
            />
          </Pressable>
          <Text style={Typography.caption}>Toque na foto para trocar</Text>
        </View>

        <CustomInput
          label="Nome"
          value={p.nome}
          onChangeText={p.setNome}
          error={p.erroNome ?? undefined}
          maxLength={60}
          autoCapitalize="words"
        />
        <Button label="Salvar nome" variant="outline" onPress={p.salvarNome} loading={p.salvandoNome} fullWidth />

        {p.erro ? <Text style={estilos.erro}>{p.erro}</Text> : null}
        {p.aviso ? <Text style={Typography.caption}>{p.aviso}</Text> : null}

        {fazenda ? <Text style={Typography.body}>Fazenda aberta: {fazenda.nome}</Text> : null}
        {fazenda && !p.semConta ? <Button label="Membros da fazenda" variant="outline" onPress={p.abrirMembros} fullWidth /> : null}
        {!p.semConta ? <Button label="Trocar de fazenda" variant="outline" onPress={p.trocarDeFazenda} fullWidth /> : null}

        {p.semConta ? (
          // TODO(decisao): criar conta a partir do modo sem conta e levar os dados (fora desta entrega)
          <Text style={Typography.caption}>Sem conta: os dados ficam só neste celular.</Text>
        ) : null}
        <Button label="Sair" variant="danger" onPress={p.sairDaConta} fullWidth />
      </View>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.three, paddingVertical: Spacing.three },
  avatar: { alignItems: 'center', gap: Spacing.one },
  erro: { ...Typography.body, color: AgroColors.danger },
});
