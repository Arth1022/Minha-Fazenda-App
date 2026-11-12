import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { CustomInput } from '@/components/forms';
import { Badge, Button, Card, Header, ScreenContainer } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { Avatar } from '@/shared/Avatar';
import { useMembros } from './useMembros';

const NOME_PAPEL = { owner: 'Dono', collaborator: 'Colaborador' } as const;

/** Membros da fazenda, convites e papéis. Layout básico (o visual será refeito). */
export default function MembrosScreen() {
  const m = useMembros();
  const [nome, setNome] = useState<string | null>(null);

  return (
    <ScreenContainer withTabInset={false} header={<Header title="Membros" showBack />}>
      <View style={estilos.conteudo}>
        {m.erro ? <Text style={estilos.erro}>{m.erro}</Text> : null}
        {m.aviso ? <Text style={Typography.caption}>{m.aviso}</Text> : null}

        {m.ehDono ? (
          <Card>
            <CustomInput
              label="Nome da fazenda"
              value={nome ?? m.fazenda?.nome ?? ''}
              onChangeText={setNome}
            />
            <Button
              label="Salvar nome"
              variant="outline"
              onPress={() => nome !== null && m.renomear(nome)}
              disabled={m.ocupado || nome === null}
              fullWidth
            />
          </Card>
        ) : null}

        {m.membros.map((membro) => (
          <Card key={membro.id}>
            <View style={estilos.linha}>
              <Avatar nome={membro.nome} avatarUrl={membro.avatarUrl} usuarioId={membro.id} tamanho={44} />
              <View style={estilos.nome}>
                <Text style={Typography.cardTitle}>
                  {membro.nome}
                  {membro.id === m.euId ? ' (você)' : ''}
                </Text>
                <Badge label={NOME_PAPEL[membro.papel]} variant={membro.papel === 'owner' ? 'success' : 'neutral'} />
              </View>
            </View>
            {m.ehDono && membro.id !== m.euId ? (
              <View style={estilos.acoes}>
                {membro.papel === 'collaborator' ? (
                  <Button label="Promover a dono" size="sm" variant="outline" onPress={() => m.promover(membro)} disabled={m.ocupado} />
                ) : (
                  <Button label="Tornar colaborador" size="sm" variant="outline" onPress={() => m.rebaixar(membro)} disabled={m.ocupado} />
                )}
                <Button label="Remover" size="sm" variant="danger" onPress={() => m.remover(membro)} disabled={m.ocupado} />
              </View>
            ) : null}
            {m.ehDono && membro.id === m.euId && membro.papel === 'owner' ? (
              <View style={estilos.acoes}>
                <Button label="Tornar colaborador" size="sm" variant="outline" onPress={() => m.rebaixar(membro)} disabled={m.ocupado} />
              </View>
            ) : null}
          </Card>
        ))}

        {m.ehDono ? (
          <Card>
            <Text style={Typography.sectionTitle}>Convidar</Text>
            {m.convite ? (
              <View style={estilos.convite}>
                {/* TODO(decisao): o `url` é https://<dominio>/convite/<token>; abrir o app por ele precisa
                    de App Links (intent filter + assetlinks.json) no domínio da API */}
                <QRCode value={m.convite.url} size={200} ecl="M" quietZone={12} />
                <Text style={Typography.caption}>Válido por 48 horas, para 1 pessoa</Text>
                <Button label="Compartilhar" onPress={m.compartilhar} fullWidth />
                <Button label="Revogar convite" variant="outline" onPress={m.revogar} disabled={m.ocupado} fullWidth />
              </View>
            ) : (
              <Button label="Convidar colaborador" onPress={m.convidar} loading={m.ocupado} fullWidth />
            )}
          </Card>
        ) : null}

        <Button label="Sair da fazenda" variant="danger" onPress={m.sair} disabled={m.ocupado} fullWidth />
      </View>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.three, paddingVertical: Spacing.three },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  nome: { flex: 1, gap: Spacing.one, alignItems: 'flex-start' },
  acoes: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two, flexWrap: 'wrap' },
  convite: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  erro: { ...Typography.body, color: AgroColors.danger },
});
