import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useBancoPronto } from '@/database';
import { HeaderDireitaProvider } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { AuthProvider } from '@/features/conta';
import { FazendaAtivaProvider } from '@/features/fazenda';
import { AvatarDoCabecalho } from '@/features/perfil';
import { LeitorQrCodeProvider } from '@/services/qrcode';
import { FazendaProvider } from './FazendaProvider';
import { InicializacaoDoApp } from './InicializacaoDoApp';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const colorScheme = useColorScheme();
  const { pronto, erro } = useBancoPronto();

  let content = (
    <AuthProvider>
      <FazendaAtivaProvider>
        <FazendaProvider>
          <InicializacaoDoApp />
          {/* Avatar do perfil à direita de todo cabeçalho */}
          <HeaderDireitaProvider elemento={<AvatarDoCabecalho />}>
            <LeitorQrCodeProvider>{children}</LeitorQrCodeProvider>
          </HeaderDireitaProvider>
        </FazendaProvider>
      </FazendaAtivaProvider>
    </AuthProvider>
  );
  if (erro) {
    content = <DatabaseError message={erro.message} />;
  } else if (!pronto) {
    content = <DatabaseLoading />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {content}
    </ThemeProvider>
  );
}

/** Exibido enquanto o banco abre (normalmente coberto pelo splash nativo). */
function DatabaseLoading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={AgroColors.primary} />
    </View>
  );
}

function DatabaseError({ message }: { message: string }) {
  // O splash só some quando o app renderiza; sem isso o erro ficaria escondido.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Não foi possível abrir o banco local</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    backgroundColor: AgroColors.screenBg,
  },
  title: {
    ...Typography.sectionTitle,
    textAlign: 'center',
  },
  message: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
