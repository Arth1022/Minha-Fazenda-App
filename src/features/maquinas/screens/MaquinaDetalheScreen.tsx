import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button, EmptyState, Header, ScreenContainer } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { AnotacoesSecao } from '../components/AnotacoesSecao';
import { DadosMaquinaCard } from '../components/DadosMaquinaCard';
import { FichaMaquinaResumo } from '../components/FichaMaquinaResumo';
import { HistoricoUsoSecao } from '../components/HistoricoUsoSecao';
import { NovaAnotacaoForm } from '../components/NovaAnotacaoForm';
import { QrCodeMaquinaModal } from '../components/QrCodeMaquinaModal';
import { UsoSemanalCard } from '../components/UsoSemanalCard';
import { useControleUso } from '../hooks/useControleUso';
import { useAnotacoesMaquina, useFichaMaquina } from '../hooks/useFichaMaquina';

/**
 * Ficha Máquina: resumo (com o cronômetro se estiver em uso), uso na semana,
 * dados de cadastro, últimos usos e anotações. O rodapé liga/desliga e mostra o QR Code.
 */
export default function MaquinaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ficha = useFichaMaquina(id);
  const anotacoes = useAnotacoesMaquina(id);
  const { alternar, ocupadaId } = useControleUso();
  const [anotacaoVisivel, setAnotacaoVisivel] = useState(false);
  const [qrVisivel, setQrVisivel] = useState(false);

  if (!ficha) {
    return (
      <ScreenContainer withTabInset={false} header={<Header title="Ficha Máquina" showBack />}>
        <EmptyState message="Carregando máquina..." />
      </ScreenContainer>
    );
  }

  const { maquina, usoAtual } = ficha;
  const podeLigar = maquina.status !== 'inativa';

  return (
    <ScreenContainer
      withTabInset={false}
      header={<Header title="Ficha Máquina" showBack />}
      footer={
        <View style={styles.rodape}>
          {usoAtual || podeLigar ? (
            <Button
              label={usoAtual ? 'Desligar máquina' : 'Ligar máquina'}
              variant={usoAtual ? 'danger' : 'primary'}
              size="lg"
              loading={ocupadaId === maquina.id}
              onPress={() => alternar({ ...maquina, usoAtual })}
              style={styles.acaoPrincipal}
            />
          ) : null}
          <Button
            label="QR Code"
            variant="outline"
            size="lg"
            onPress={() => setQrVisivel(true)}
            style={styles.acaoSecundaria}
          />
        </View>
      }>
      <FichaMaquinaResumo maquina={maquina} usoAtual={usoAtual} />
      <UsoSemanalCard dias={ficha.usoSemanal} totalMs={ficha.totalSemanaMs} />
      <DadosMaquinaCard ficha={ficha} />
      <HistoricoUsoSecao usos={ficha.usosRecentes} />
      <AnotacoesSecao anotacoes={anotacoes} onAdicionar={() => setAnotacaoVisivel(true)} />

      <NovaAnotacaoForm
        visible={anotacaoVisivel}
        maquinaId={maquina.id}
        nome={maquina.nome}
        onClose={() => setAnotacaoVisivel(false)}
      />

      <QrCodeMaquinaModal visible={qrVisivel} maquina={maquina} onClose={() => setQrVisivel(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  rodape: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  acaoPrincipal: {
    flex: 2,
  },
  acaoSecundaria: {
    flex: 1,
  },
});
