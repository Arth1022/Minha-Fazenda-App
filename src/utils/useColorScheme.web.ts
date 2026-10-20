import { useSyncExternalStore } from 'react';
import { ColorSchemeName, useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};

/**
 * Garante renderização consistente entre SSR/static rendering e hidratação no cliente Web
 * usando useSyncExternalStore (recomendado pelo React 19 Compiler).
 */
export function useColorScheme(): ColorSchemeName {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();

  if (isHydrated) {
    return colorScheme;
  }

  return 'light';
}
