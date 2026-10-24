import React from 'react';

import {
  EmptyState,
  Header,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';

/**
 * Tela de Máquinas e Frota (somente front, sem persistência local).
 */
export default function MaquinasScreen() {
  return (
    <ScreenContainer header={<Header title="Máquinas e Frota" showBack />}>
      <SectionHeader title="Equipamentos & Veículos" size="lg" />
      <EmptyState message="Nenhuma máquina cadastrada." />
    </ScreenContainer>
  );
}
