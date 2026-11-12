import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, BottomSheet, Header, ScreenContainer, type AppIconName } from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';
import { useConsultaAoVivo } from '@/database';
import { BotaoConta, CampoConta } from '@/features/conta/componentes';
import { OpcoesFotoSheet } from '@/features/conta/OpcoesFotoSheet';
import { avisarAlterarSenha } from '@/features/conta/semEndpoint';
import { ChipPapel, IconeFazenda, useFazendaAtiva, usePapel } from '@/features/fazenda';
import { IndicadorSync } from '@/features/sync';
import { contarMembros, TABELAS_MEMBROS } from '@/services/usuario';
import { Avatar } from '@/shared/Avatar';
import { usePerfil } from './usePerfil';

const TEXTO = '#1A1F1C';
const TEXTO_SUAVE = '#5F6661';
const BORDA = '#E1E4E2';

/** Perfil: foto, nome, e-mail, a fazenda aberta e a conta; a lógica fica em usePerfil. */
export default function PerfilScreen() {
  const p = usePerfil();
  const { fazenda } = useFazendaAtiva();
  const papel = usePapel();
  const [editandoNome, setEditandoNome] = useState(false);
  const [opcoesFotoAbertas, setOpcoesFotoAbertas] = useState(false);
  const { dados: totalMembros } = useConsultaAoVivo<number>(
    contarMembros,
    TABELAS_MEMBROS,
    p.semConta ? '' : (fazenda?.id ?? ''),
    0
  );

  const abrirEdicaoDoNome = () => {
    p.comecarEdicaoDoNome();
    setEditandoNome(true);
  };

  const salvarNome = async () => {
    if (await p.salvarNome()) setEditandoNome(false);
  };

  return (
    <ScreenContainer
      withTabInset={false}
      header={
        <Header title="Perfil" showBack direita={p.semConta ? <View /> : <IndicadorSync />} />
      }>
      <View style={estilos.topo}>
        <Pressable
          onPress={() => setOpcoesFotoAbertas(true)}
          disabled={p.enviandoFoto}
          accessibilityRole="button"
          accessibilityLabel="Trocar a foto">
          <Avatar
            nome={p.usuario.nome}
            avatarUrl={p.usuario.avatarUrl}
            usuarioId={p.usuario.id}
            tamanho={150}
            carregando={p.enviandoFoto}
          />
          <View style={estilos.selocamera}>
            <AppIcon name="camera" size={20} color={AgroColors.forest} />
          </View>
        </Pressable>

        <Pressable
          onPress={abrirEdicaoDoNome}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Editar nome: ${p.usuario.nome}`}
          style={estilos.linhaNome}>
          <Text style={estilos.nome} numberOfLines={2}>
            {p.usuario.nome}
          </Text>
          <AppIcon name="edit" size={24} color={TEXTO_SUAVE} />
        </Pressable>
        {p.email ? <Text style={estilos.email}>{p.email}</Text> : null}
      </View>

      {p.erro ? <Text style={estilos.erro}>{p.erro}</Text> : null}
      {p.aviso ? <Text style={estilos.aviso}>{p.aviso}</Text> : null}

      {fazenda ? (
        <View style={estilos.cartao}>
          <Text style={estilos.rotulo}>Fazenda aberta</Text>
          <View style={estilos.fazenda}>
            <IconeFazenda nome={fazenda.nome} tamanho={60} />
            <View style={estilos.fazendaTextos}>
              <Text style={estilos.fazendaNome} numberOfLines={2}>
                {fazenda.nome}
              </Text>
              {papel ? <ChipPapel papel={papel} /> : null}
            </View>
          </View>
          {p.semConta ? (
            <Text style={estilos.semConta}>Sem conta: os dados ficam só neste celular.</Text>
          ) : (
            <>
              <LinhaPerfil
                icone="users"
                texto="Membros da fazenda"
                valor={totalMembros > 0 ? String(totalMembros) : undefined}
                onPress={p.abrirMembros}
                divisor
              />
              <LinhaPerfil icone="arrowLeftRight" texto="Trocar de fazenda" onPress={p.trocarDeFazenda} divisor />
            </>
          )}
        </View>
      ) : null}

      {!p.semConta ? (
        <View style={[estilos.cartao, estilos.cartaoLinha]}>
          <LinhaPerfil icone="lock" texto="Alterar senha" onPress={avisarAlterarSenha} />
        </View>
      ) : null}

      <Pressable
        onPress={p.sairDaConta}
        accessibilityRole="button"
        style={({ pressed }) => [estilos.sair, pressed && estilos.pressionado]}>
        <AppIcon name="logOut" size={24} color={AgroColors.danger} />
        <Text style={estilos.sairTexto}>Sair da conta</Text>
      </Pressable>

      <OpcoesFotoSheet
        visivel={opcoesFotoAbertas}
        comFoto={p.temFoto}
        onEscolher={p.escolherFoto}
        onRemover={p.removerFoto}
        onFechar={() => setOpcoesFotoAbertas(false)}
      />

      <BottomSheet visible={editandoNome} title="Seu nome" onClose={() => setEditandoNome(false)}>
        <View style={estilos.folha}>
          <CampoConta
            value={p.nome}
            onChangeText={p.setNome}
            erro={p.erroNome}
            accessibilityLabel="Seu nome"
            maxLength={60}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={salvarNome}
          />
          <BotaoConta rotulo="Salvar" onPress={salvarNome} carregando={p.salvandoNome} />
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

function LinhaPerfil({
  icone,
  texto,
  valor,
  onPress,
  divisor = false,
}: {
  icone: AppIconName;
  texto: string;
  valor?: string;
  onPress: () => void;
  divisor?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={valor ? `${texto}: ${valor}` : texto}
      style={({ pressed }) => [estilos.linha, divisor && estilos.divisor, pressed && estilos.pressionado]}>
      <AppIcon name={icone} size={26} color={AgroColors.forest} />
      <Text style={estilos.linhaTexto}>{texto}</Text>
      {valor ? <Text style={estilos.linhaValor}>{valor}</Text> : null}
      <AppIcon name="chevronRight" size={22} color={TEXTO_SUAVE} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.7 },
  topo: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  selocamera: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AgroColors.cardBg,
    borderWidth: 3,
    borderColor: AgroColors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaNome: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg },
  nome: { flexShrink: 1, fontSize: 28, lineHeight: 34, fontWeight: '800', color: TEXTO, textAlign: 'center' },
  email: { fontSize: 16, color: TEXTO_SUAVE },
  erro: { fontSize: 15, lineHeight: 21, color: AgroColors.danger, textAlign: 'center' },
  aviso: { fontSize: 15, lineHeight: 21, color: AgroColors.forest, textAlign: 'center' },
  cartao: {
    backgroundColor: AgroColors.cardBg,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BORDA,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.three,
  },
  cartaoLinha: { paddingTop: 0 },
  rotulo: { fontSize: 15, fontWeight: '700', color: TEXTO_SUAVE, marginBottom: Spacing.md },
  fazenda: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingBottom: Spacing.three },
  fazendaTextos: { flex: 1, gap: 6 },
  fazendaNome: { fontSize: 18, fontWeight: '700', color: TEXTO },
  semConta: { fontSize: 14.5, lineHeight: 20, color: TEXTO_SUAVE, paddingBottom: Spacing.three },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.lg },
  divisor: { borderTopWidth: 1, borderTopColor: BORDA },
  linhaTexto: { flex: 1, fontSize: 17, color: TEXTO },
  linhaValor: { fontSize: 17, color: TEXTO_SUAVE },
  sair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  sairTexto: { fontSize: 18, fontWeight: '700', color: AgroColors.danger },
  folha: { gap: Spacing.lg },
});
