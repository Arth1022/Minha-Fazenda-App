// Tarefas de segundo plano (GPS do uso da máquina): definidas antes de tudo, no
// escopo de topo, porque o sistema pode abrir o app só para rodá-las
import '@/features/maquinas/rastro/tarefas';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/AnimatedSplashOverlay';
import { sessaoEmMemoria, useConta } from '@/features/conta';
import { useFazendaAtiva } from '@/features/fazenda';
import { AppProviders } from '@/providers/AppProviders';

SplashScreen.preventAutoHideAsync();

/**
 * Rotas por estado da conta: deslogado vê só as telas de conta; logado ou sem
 * conta vê a lista de fazendas e o perfil; o app em si só com uma fazenda
 * aberta. O link do convite abre em qualquer estado.
 *
 * O Stack é renderizado desde o começo (o Expo Router precisa do navegador para
 * montar a rota inicial). Enquanto a sessão e a fazenda guardadas são lidas,
 * nenhuma rota fica bloqueada e o splash cobre a tela; depois, as proteções
 * valem e redirecionam se preciso.
 */
function Navegacao() {
  const { estado } = useConta();
  const { fazenda, carregando: lendoFazenda } = useFazendaAtiva();
  const pronto = estado !== 'carregando' && !lendoFazenda;

  const entrou = estado === 'logado' || estado === 'sem-conta';
  const temFazenda = entrou && fazenda !== null;
  // Sessão encerrada pela API (o usuário fica guardado): volta direto para o login
  const paraQuemSaiu = sessaoEmMemoria().usuario ? '/entrar' : '/boas-vindas';

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!pronto || !entrou} redirectTo={temFazenda ? '/' : '/fazendas'}>
          <Stack.Screen name="(conta)" />
        </Stack.Protected>

        <Stack.Protected guard={!pronto || entrou} redirectTo={paraQuemSaiu}>
          <Stack.Screen name="fazendas" />
          <Stack.Screen name="perfil" />
        </Stack.Protected>

        <Stack.Protected guard={!pronto || temFazenda} redirectTo={entrou ? '/fazendas' : paraQuemSaiu}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="membros" />
          <Stack.Screen name="animal/[id]" />
          <Stack.Screen name="lote/[id]" />
          <Stack.Screen name="maquina/[id]" />
          <Stack.Screen name="maquina/em-uso" />
          <Stack.Screen name="tarefas" />
          <Stack.Screen name="mapa-fazenda" />
        </Stack.Protected>

        <Stack.Screen name="convite/[token]" />
      </Stack>
      {/* Só sai da frente (e esconde o splash nativo) quando a conta e a fazenda estão lidas */}
      {pronto ? <AnimatedSplashOverlay /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <Navegacao />
    </AppProviders>
  );
}
