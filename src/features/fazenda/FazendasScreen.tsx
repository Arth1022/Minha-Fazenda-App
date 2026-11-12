import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomInput } from '@/components/forms';
import { Button, Card, Header, ScreenContainer } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { useFazendaAtiva } from './FazendaAtivaProvider';
import { useListaFazendas } from './useListaFazendas';

const NOME_PAPEL = { owner: 'Dono', collaborator: 'Colaborador' } as const;

/** Lista de fazendas do usuário e "Criar fazenda". Layout básico (o visual será refeito). */
export default function FazendasScreen() {
  const router = useRouter();
  const { trocar } = useLocalSearchParams<{ trocar?: string }>();
  const lista = useListaFazendas({ trocando: trocar === '1' });
  const { fazenda } = useFazendaAtiva();

  // Fazenda escolhida e já no celular: abre o app nela
  useEffect(() => {
    if (fazenda) router.replace('/');
  }, [fazenda, router]);

  return (
    <ScreenContainer withTabInset={false} header={<Header title="Fazendas" />}>
      <View style={estilos.conteudo}>
        {lista.aguardandoSync ? (
          <View style={estilos.linha}>
            <ActivityIndicator color={AgroColors.primary} />
            <Text style={Typography.body}>Abrindo a fazenda… ela aparece assim que sincronizar.</Text>
          </View>
        ) : null}

        {lista.carregando ? (
          <View style={estilos.linha}>
            <ActivityIndicator color={AgroColors.primary} />
            <Text style={Typography.body}>Carregando suas fazendas…</Text>
          </View>
        ) : lista.fazendas.length === 0 ? (
          <Text style={Typography.body}>Você ainda não está em nenhuma fazenda.</Text>
        ) : (
          lista.fazendas.map((item) => (
            <Pressable key={item.id} onPress={() => lista.escolher(item)} accessibilityRole="button">
              <Card>
                <Text style={Typography.cardTitle}>{item.nome}</Text>
                <Text style={Typography.caption}>{NOME_PAPEL[item.papel]}</Text>
              </Card>
            </Pressable>
          ))
        )}

        {lista.podeCriar ? (
          <View style={estilos.bloco}>
            <Text style={Typography.sectionTitle}>Criar fazenda</Text>
            <CustomInput
              label="Nome da fazenda"
              value={lista.nomeNova}
              onChangeText={lista.setNomeNova}
              error={lista.erroNova ?? undefined}
              placeholder="Ex.: Sítio Boa Vista"
            />
            <Button label="Criar fazenda" onPress={lista.criar} loading={lista.criando} fullWidth />
            {lista.avisoNova ? <Text style={Typography.caption}>{lista.avisoNova}</Text> : null}
          </View>
        ) : null}

        <Button label="Meu perfil" variant="outline" onPress={() => router.push('/perfil')} fullWidth />
      </View>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.three, paddingVertical: Spacing.three },
  bloco: { gap: Spacing.two, marginTop: Spacing.three },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
