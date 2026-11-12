import { Stack } from 'expo-router';

/** Telas de quem ainda não entrou: boas-vindas, cadastro, login e o modo sem conta. */
export default function ContaLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
