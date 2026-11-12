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
 */
function Navegacao() {
  const { estado } = useConta();
  const { fazenda } = useFazendaAtiva();
  // Enquanto lê a sessão guardada, o splash continua na frente
  if (estado === 'carregando') return null;

  const entrou = estado === 'logado' || estado === 'sem-conta';
  const temFazenda = entrou && fazenda !== null;
  // Sessão encerrada pela API (o usuário fica guardado): volta direto para o login
  const paraQuemSaiu = sessaoEmMemoria().usuario ? '/entrar' : '/boas-vindas';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!entrou} redirectTo={temFazenda ? '/' : '/fazendas'}>
        <Stack.Screen name="(conta)" />
      </Stack.Protected>

      <Stack.Protected guard={entrou} redirectTo={paraQuemSaiu}>
        <Stack.Screen name="fazendas" />
        <Stack.Screen name="perfil" />
      </Stack.Protected>

      <Stack.Protected guard={temFazenda} redirectTo={entrou ? '/fazendas' : paraQuemSaiu}>
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
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AnimatedSplashOverlay />
      <Navegacao />
    </AppProviders>
  );
}
