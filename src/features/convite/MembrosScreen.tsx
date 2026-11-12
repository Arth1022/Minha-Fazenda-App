import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CustomInput } from '@/components/forms';
import { Badge, Button, Card, Header, ScreenContainer } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { Avatar } from '@/shared/Avatar';
import { useMembros } from './useMembros';

const NOME_PAPEL = { owner: 'Dono', collaborator: 'Colaborador' } as const;

/** "13/11 às 14:05" */
function formatarValidade(iso: string): string {
  const data = new Date(iso);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(data.getDate())}/${dois(data.getMonth() + 1)} às ${dois(data.getHours())}:${dois(data.getMinutes())}`;
}

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
            {m.codigo ? (
              <View style={estilos.convite}>
                <Text style={Typography.caption}>Código de convite</Text>
                <Text
                  style={estilos.codigo}
                  selectable
                  accessibilityLabel={`Código de convite ${m.codigo.codigo.split('').join(' ')}`}>
                  {m.codigo.codigo}
                </Text>
                <Text style={Typography.caption}>
                  Vale até {formatarValidade(m.codigo.expiraEm)}, para 1 pessoa. Ela digita o código em
                  &quot;Entrar com código&quot;.
                </Text>
                <Button label="Compartilhar" onPress={m.compartilhar} fullWidth />
                <Button label="Gerar outro código" variant="outline" onPress={m.gerarCodigo} disabled={m.ocupado} fullWidth />
              </View>
            ) : (
              <Button label="Gerar código de convite" onPress={m.gerarCodigo} loading={m.ocupado} fullWidth />
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
  codigo: { fontSize: 36, fontWeight: '700', letterSpacing: 6, color: AgroColors.forest },
  erro: { ...Typography.body, color: AgroColors.danger },
});
