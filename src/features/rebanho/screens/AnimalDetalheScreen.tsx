import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button, EmptyState, Header, ScreenContainer } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { FichaResumo } from '../components/FichaResumo';
import { NovoTratamentoForm } from '../components/NovoTratamentoForm';
import {
  OutrosRegistrosMenu,
  type TipoRegistro,
} from '../components/OutrosRegistrosMenu';
import { RegistroForm } from '../components/registros/RegistroForm';
import { TratamentoAtivoCard } from '../components/TratamentoAtivoCard';
import { useFichaAnimal } from '../hooks/useFichaAnimal';
import { useRebanho } from '../hooks/useRebanho';

const SEM_VALOR = '—';

/**
 * Ficha Animal (tela 3 do Figma, antes "Tratamento Animal").
 * Blocos na ordem do esboço aprovado: resumo, tratamento, reprodução, próximos
 * e histórico. O sub-banner "✓ Tratamento Animal" só aparece com tratamento
 * em andamento. Os blocos marcados com o nome do componente são do front-end e
 * entram quando ele commitar; o Histórico é opcional e pode ficar de fora.
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
  const rebanho = useRebanho();
  const touros = useMemo(() => rebanho.filter((a) => a.sexo === 'M'), [rebanho]);

  const displayBrinco = animal ? `Brinco ${animal.brinco}` : SEM_VALOR;

  return (
    <ScreenContainer
      withTabInset={false}
      header={
        <Header
          title="Ficha Animal"
          subBannerTitle={ativos.length > 0 ? 'Tratamento Animal' : undefined}
          showBack
        />
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
            label="Outros registros"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => setMenuVisible(true)}
          />
        </View>
      }>
      {/* A. Resumo */}
      {ficha ? <FichaResumo ficha={ficha} alerta={null} /> : null}

      {/* B. Tratamento: um bloco por tratamento em andamento */}
      {ativos.length > 0 ? (
        ativos.map((ativo) => <TratamentoAtivoCard key={ativo.tratamento.id} ativo={ativo} />)
      ) : (
        <EmptyState message="Nenhum tratamento em andamento para este animal." />
      )}

      {/* C. F4 ReproducaoCard (só se ficha.podeReproduzir) */}
      {/* D. F5 ProximosCard + aviso do limite de notificações (contagemNotificacoes) */}
      {/* E. F5 LinhaDoTempo (Histórico): opcional, sai primeiro se o prazo apertar */}

      <NovoTratamentoForm
        visible={modalVisible}
        animalId={id}
        identificacao={displayBrinco}
        onClose={() => setModalVisible(false)}
      />

      <OutrosRegistrosMenu
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
