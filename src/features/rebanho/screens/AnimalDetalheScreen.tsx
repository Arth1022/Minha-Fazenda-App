import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button, Header, ScreenContainer } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { FichaResumo } from '../components/FichaResumo';
import { NovoTratamentoForm } from '../components/NovoTratamentoForm';
import {
  AdicionarRegistroMenu,
  type TipoRegistro,
} from '../components/AdicionarRegistroMenu';
import { RegistroForm } from '../components/registros/RegistroForm';
import { ReproducaoSecao } from '../components/ReproducaoSecao';
import { TratamentosSecao } from '../components/TratamentosSecao';
import { confirmarPrenhez } from '../data/reproducoes';
import { useFichaAnimal } from '../hooks/useFichaAnimal';
import { useTouros } from '../hooks/useRebanho';

const SEM_VALOR = '—';

/**
 * Ficha Animal (tela 3 do Figma, antes "Tratamento Animal").
 * Blocos na ordem do esboço aprovado: resumo, tratamento, reprodução e próximos
 * (o histórico saiu do escopo da Sprint 2).
 */
export default function AnimalDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ficha = useFichaAnimal(id);
  const animal = ficha?.animal ?? null;
  const ativos = ficha?.tratamentosAtivos ?? [];

  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [registro, setRegistro] = useState<TipoRegistro | null>(null);

  // Touros para a cobertura: os machos ativos do rebanho
  const touros = useTouros();

  const displayBrinco = animal ? `Brinco ${animal.brinco}` : SEM_VALOR;

  return (
    <ScreenContainer
      withTabInset={false}
      header={
        <Header title="Ficha Animal" showBack />
      }
      footer={
        <View style={styles.footerActions}>
          <Button
            label="Novo Tratamento"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => setModalVisible(true)}
          />
          <Button
            label="Adicionar"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => setMenuVisible(true)}
          />
        </View>
      }>
      {/* A. Resumo */}
      {ficha ? <FichaResumo ficha={ficha} alerta={ficha.alerta?.texto} /> : null}

      {/* B. Tratamentos: um bloco por tratamento em andamento, com divisória */}
      {ficha ? <TratamentosSecao ativos={ativos} /> : null}

      {/* C. Reprodução: só novilha e vaca */}
      {ficha?.podeReproduzir ? (
        <ReproducaoSecao
          reproducao={ficha.reproducao}
          ultimoParto={ficha.ultimoParto}
          touros={touros}
          onConfirmarPrenhez={confirmarPrenhez}
        />
      ) : null}

      {/* D. F5 ProximosCard + aviso do limite de notificações (contagemNotificacoes) */}

      <NovoTratamentoForm
        visible={modalVisible}
        animalId={id}
        identificacao={displayBrinco}
        onClose={() => setModalVisible(false)}
      />

      <AdicionarRegistroMenu
        visible={menuVisible}
        reprodutiva={ficha?.podeReproduzir ?? false}
        onClose={() => setMenuVisible(false)}
        onSelect={(tipo) => {
          setMenuVisible(false);
          setRegistro(tipo);
        }}
      />
      {registro && id ? (
        <RegistroForm
          tipo={registro}
          animalId={id}
          touros={touros}
          onClose={() => setRegistro(null)}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  footerActions: {
    gap: Spacing.two,
  },
});
