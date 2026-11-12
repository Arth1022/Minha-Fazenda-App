import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, BottomSheet, Header, ScreenContainer, type AppIconName } from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';
import { BotaoConta, CampoConta } from '@/features/conta/componentes';
import { useEntrarComCodigo } from '@/features/convite/useEntrarComCodigo';
import type { FazendaDoUsuario } from './consultas';
import { ChipPapel, IconeFazenda } from './elementos';
import { limparFazendaAtiva } from './fazendaAtiva';
import { useFazendaAtiva } from './FazendaAtivaProvider';
import { useListaFazendas } from './useListaFazendas';

const TEXTO = '#1A1F1C';
const TEXTO_SUAVE = '#5F6661';

/**
 * Fazendas do usuário: a aberta marcada como "Aberta", as outras abrem ao
 * tocar; "Entrar com código" e "Nova fazenda" abrem folhas por cima.
 */
export default function FazendasScreen() {
  const router = useRouter();
  const { trocar } = useLocalSearchParams<{ trocar?: string }>();
  const trocando = trocar === '1';
  const lista = useListaFazendas({ trocando });
  const { fazenda } = useFazendaAtiva();
  const convite = useEntrarComCodigo();
  const [folha, setFolha] = useState<'codigo' | 'nova' | null>(null);
  // Veio do Perfil para trocar: a fazenda aberta fica marcada até escolher outra
  const [abertaAoEntrar] = useState(fazenda?.id ?? null);
  const [fechouAAtual, setFechouAAtual] = useState(false);

  /** Abre o app do zero na fazenda (o Perfil que ficou na pilha sai junto). */
  const abrirOApp = useCallback(() => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  }, [router]);

  // Fazenda aberta (escolhida, criada ou do código) e já no celular: abre o app nela
  useEffect(() => {
    if (fazenda && (fazenda.id !== abertaAoEntrar || fechouAAtual)) abrirOApp();
  }, [fazenda, abertaAoEntrar, fechouAAtual, abrirOApp]);

  /** Tocou na que já está aberta: só volta para o app */
  const voltarParaOApp = () => router.dismissTo('/');

  /**
   * Trocar de fazenda fecha a atual antes: as abas saem e voltam já na nova,
   * sem consultas da fazenda anterior montadas.
   */
  const fecharAAtual = () => {
    if (!fazenda) return;
    setFechouAAtual(true);
    limparFazendaAtiva();
  };

  const escolher = (item: FazendaDoUsuario) => {
    if (item.id === fazenda?.id) {
      voltarParaOApp();
      return;
    }
    fecharAAtual();
    lista.escolher(item);
  };

  const entrarComCodigo = async () => {
    fecharAAtual();
    if (await convite.entrar()) setFolha(null);
  };

  const criarFazenda = async () => {
    fecharAAtual();
    if (await lista.criar()) setFolha(null);
  };

  return (
    <ScreenContainer
      withTabInset={false}
      header={<Header title="Fazendas" showBack={trocando && router.canGoBack()} />}>
      {lista.aguardandoSync ? (
        <Aviso texto="Abrindo a fazenda… ela aparece assim que sincronizar." carregando />
      ) : null}
      {lista.avisoNova ? <Aviso texto={lista.avisoNova} /> : null}

      <Text style={estilos.secao}>Suas fazendas</Text>
      {lista.carregando ? (
        <Aviso texto="Carregando suas fazendas…" carregando />
      ) : lista.fazendas.length === 0 ? (
        <Text style={estilos.vazio}>Você ainda não está em nenhuma fazenda. Entre com o código de quem te convidou ou crie a sua.</Text>
      ) : (
        <View style={estilos.lista}>
          {lista.fazendas.map((item) => {
            const aberta = item.id === fazenda?.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => escolher(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.nome}${aberta ? ', aberta' : ''}`}
                style={({ pressed }) => [estilos.cartao, aberta && estilos.cartaoAberto, pressed && estilos.pressionado]}>
                <IconeFazenda nome={item.nome} />
                <View style={estilos.textos}>
                  <Text style={estilos.nome} numberOfLines={1}>
                    {item.nome}
                  </Text>
                  <ChipPapel papel={item.papel} />
                </View>
                {aberta ? (
                  <View style={estilos.aberta}>
                    <AppIcon name="check" size={20} color={AgroColors.forest} />
                    <Text style={estilos.abertaTexto}>Aberta</Text>
                  </View>
                ) : (
                  <AppIcon name="chevronRight" size={22} color={TEXTO_SUAVE} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {lista.podeCriar ? (
        <View style={estilos.acoes}>
          <AcaoTracejada icone="key" rotulo="Entrar com código" onPress={() => setFolha('codigo')} />
          <AcaoTracejada icone="plus" rotulo="Nova fazenda" onPress={() => setFolha('nova')} />
        </View>
      ) : null}

      <BottomSheet
        visible={folha === 'codigo'}
        title="Entrar com código"
        subtitle="Peça o código ao dono da fazenda."
        onClose={() => setFolha(null)}>
        <View style={estilos.folha}>
          <CampoConta
            value={convite.codigo}
            onChangeText={convite.setCodigo}
            erro={convite.erro}
            placeholder="K7M2QX"
            accessibilityLabel="Código de convite"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={8}
            returnKeyType="go"
            onSubmitEditing={entrarComCodigo}
            estiloTexto={estilos.codigo}
          />
          <BotaoConta
            rotulo="Entrar na fazenda"
            onPress={entrarComCodigo}
            carregando={convite.entrando}
            desabilitado={convite.codigo.trim().length === 0}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={folha === 'nova'}
        title="Nova fazenda"
        subtitle="Você será o dono."
        onClose={() => setFolha(null)}>
        <View style={estilos.folha}>
          <CampoConta
            rotulo="Nome da fazenda"
            value={lista.nomeNova}
            onChangeText={lista.setNomeNova}
            erro={lista.erroNova}
            placeholder="Ex.: Sítio Boa Vista"
            autoCapitalize="words"
            autoFocus
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={criarFazenda}
          />
          <BotaoConta rotulo="Criar fazenda" onPress={criarFazenda} carregando={lista.criando} />
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

function Aviso({ texto, carregando = false }: { texto: string; carregando?: boolean }) {
  return (
    <View style={estilos.aviso}>
      {carregando ? <ActivityIndicator color={AgroColors.forest} /> : null}
      <Text style={estilos.avisoTexto}>{texto}</Text>
    </View>
  );
}

function AcaoTracejada({ icone, rotulo, onPress }: { icone: AppIconName; rotulo: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.tracejada, pressed && estilos.pressionado]}>
      <AppIcon name={icone} size={30} color={AgroColors.forest} />
      <Text style={estilos.tracejadaTexto}>{rotulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.8 },
  secao: { fontSize: 17, fontWeight: '600', color: '#4A514C', marginTop: Spacing.xs },
  vazio: { fontSize: 16, lineHeight: 22, color: TEXTO_SUAVE },
  lista: { gap: Spacing.md },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.three,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E1E4E2',
    backgroundColor: AgroColors.cardBg,
  },
  cartaoAberto: { borderColor: AgroColors.forest },
  textos: { flex: 1, gap: 6 },
  nome: { fontSize: 18, fontWeight: '600', color: TEXTO },
  aberta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  abertaTexto: { fontSize: 16, fontWeight: '700', color: AgroColors.forest },
  acoes: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  tracejada: {
    flex: 1,
    minHeight: 110,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A9AFAB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.three,
  },
  tracejadaTexto: { fontSize: 16.5, fontWeight: '700', color: AgroColors.forest, textAlign: 'center' },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  avisoTexto: { flex: 1, fontSize: 15, lineHeight: 21, color: TEXTO_SUAVE },
  folha: { gap: Spacing.lg },
  codigo: { fontSize: 34, fontWeight: '700', letterSpacing: 10, textAlign: 'center', paddingVertical: Spacing.md },
});
