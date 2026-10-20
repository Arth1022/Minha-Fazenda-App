import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/react';

import { database } from '@/database';
import { runDevSeed } from '@/database/seeds/devSeed';

export type DatabaseStatus = 'loading' | 'ready' | 'error';

interface DatabaseStatusContextValue {
  status: DatabaseStatus;
  error: string | null;
}

const DatabaseStatusContext = createContext<DatabaseStatusContextValue>({
  status: 'loading',
  error: null,
});

export function useDatabaseStatus(): DatabaseStatusContextValue {
  return useContext(DatabaseStatusContext);
}

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const colorScheme = useColorScheme();
  const [status, setStatus] = useState<DatabaseStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function verifyDatabase() {
      try {
        await database.get('talhoes').query().fetchCount();
        if (__DEV__) {
          await runDevSeed();
        }
        if (mounted) {
          setStatus('ready');
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Erro ao inicializar banco local');
          setStatus('error');
        }
      }
    }

    verifyDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DatabaseProvider database={database}>
      <DatabaseStatusContext.Provider value={{ status, error }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {children}
        </ThemeProvider>
      </DatabaseStatusContext.Provider>
    </DatabaseProvider>
  );
}
