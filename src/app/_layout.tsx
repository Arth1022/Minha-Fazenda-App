// Tarefas de segundo plano (GPS do uso da máquina): definidas antes de tudo, no
// escopo de topo, porque o sistema pode abrir o app só para rodá-las
import '@/features/maquinas/rastro/tarefas';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/AnimatedSplashOverlay';
import { AppProviders } from '@/providers/AppProviders';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppProviders>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="animal/[id]" />
        <Stack.Screen name="maquina/[id]" />
        <Stack.Screen name="maquina/em-uso" />
      </Stack>
    </AppProviders>
  );
}
