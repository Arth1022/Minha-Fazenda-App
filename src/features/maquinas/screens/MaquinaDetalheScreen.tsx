import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button, Card, EmptyState, Header, ScreenContainer, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { AnotacoesSecao } from '../components/AnotacoesSecao';
import { DadosMaquinaCard } from '../components/DadosMaquinaCard';
import { FichaMaquinaResumo } from '../components/FichaMaquinaResumo';
import { HistoricoUsoSecao } from '../components/HistoricoUsoSecao';
import { NovaAnotacaoForm } from '../components/NovaAnotacaoForm';
import { ProblemasSecao } from '../components/ProblemasSecao';
import { QrCodeMaquinaModal } from '../components/QrCodeMaquinaModal';
import { RegistrosRecentesSecao } from '../components/RegistrosRecentesSecao';
import { UsoSemanalCard } from '../components/UsoSemanalCard';
import { useAnotacoesMaquina, useFichaMaquina } from '../hooks/useFichaMaquina';
import { useFluxosMaquina, type FluxoMaquina } from '../hooks/useFluxosMaquina';
import { useSituacaoMaquina } from '../hooks/useSituacaoMaquina';
import { ehImplemento } from '../services/padroes';

/**
 * Ficha Máquina: resumo (quem está usando e a situação), uso na semana (horas,
 * KM e hectares), registros (abastecer, horímetro, problema, uso esquecido),
 * problemas em aberto, últimos usos, abastecimentos e anotações.
 */
export default function MaquinaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ficha = useFichaMaquina(id);
  const anotacoes = useAnotacoesMaquina(id);
  const situacao = useSituacaoMaquina(ficha?.maquina ?? null);
  const fluxos = useFluxosMaquina();
  const [anotacaoVisivel, setAnotacaoVisivel] = useState(false);
  const [qrVisivel, setQrVisivel] = useState(false);

  if (!ficha) {
    return (
      <ScreenContainer withTabInset={false} header={<Header title="Ficha Máquina" showBack />}>
        <EmptyState message="Carregando máquina..." />
      </ScreenContainer>
    );
  }

  const { maquina } = ficha;
  const implemento = ehImplemento(maquina);
  const { usoAberto, deOutraPessoa, condicao } = situacao;
  const meuUso = usoAberto !== null && !deOutraPessoa;
  const abrir = (fluxo: FluxoMaquina) => fluxos.abrir(fluxo, maquina, { usoAberto, condicao, deOutraPessoa });

  let acaoPrincipal: React.ReactNode = null;
  if (!implemento && meuUso) {
    acaoPrincipal = (
      <Button
        label="Desligar"
        variant="danger"
        size="lg"
        loading={fluxos.ocupado}
        onPress={() => fluxos.desligar(maquina)}
        style={styles.acaoPrincipal}
      />
    );
  } else if (!implemento && maquina.status !== 'inativa') {
    acaoPrincipal = (
      <Button
        label={deOutraPessoa ? 'Assumir' : 'Ligar'}
        variant="primary"
        size="lg"
        loading={fluxos.ocupado}
        onPress={() => abrir('ligar')}
        style={styles.acaoPrincipal}
      />
    );
  }

  return (
    <ScreenContainer
      withTabInset={false}
      header={<Header title="Ficha Máquina" showBack />}
      footer={
        <View style={styles.rodape}>
          {acaoPrincipal}
          <Button
            label="QR Code"
            variant="outline"
            size="lg"
            onPress={() => setQrVisivel(true)}
            style={styles.acaoSecundaria}
          />
        </View>
      }>
      <FichaMaquinaResumo
        maquina={maquina}
        usoAtual={ficha.usoAtual}
        condicao={condicao}
        engatadoEm={situacao.engatadoEm?.nome ?? null}
      />
      <UsoSemanalCard dias={ficha.usoSemanal} totalMs={ficha.totalSemanaMs} km={ficha.kmSemana} ha={ficha.haSemana} />

      <View style={styles.secao}>
        <SectionHeader title="Registrar" />
        <Card padding="three">
          <View style={styles.grade}>
            {!implemento ? (
              <Button label="Abastecer" variant="outline" onPress={() => abrir('abastecer')} style={styles.metade} />
            ) : null}
            {maquina.possuiHorimetro ? (
              <Button label="Horímetro" variant="outline" onPress={() => abrir('horimetro')} style={styles.metade} />
            ) : null}
            <Button label="Problema" variant="outline" onPress={() => abrir('problema')} style={styles.metade} />
            {!implemento ? (
              <Button label="Uso esquecido" variant="outline" onPress={() => abrir('usoManual')} style={styles.metade} />
            ) : null}
          </View>
        </Card>
      </View>

      <ProblemasSecao problemas={situacao.problemas} />
      <DadosMaquinaCard ficha={ficha} />
      <HistoricoUsoSecao
        usos={ficha.usosRecentes}
        vazio={
          implemento
            ? 'Nenhum uso ainda. Escolha este implemento ao ligar o trator que vai puxá-lo.'
            : undefined
        }
      />
      {!implemento ? <RegistrosRecentesSecao maquinaId={maquina.id} /> : null}
      <AnotacoesSecao anotacoes={anotacoes} onAdicionar={() => setAnotacaoVisivel(true)} />

      <NovaAnotacaoForm
        visible={anotacaoVisivel}
        maquinaId={maquina.id}
        nome={maquina.nome}
        usoId={meuUso ? usoAberto.id : null}
        onClose={() => setAnotacaoVisivel(false)}
      />

      <QrCodeMaquinaModal visible={qrVisivel} maquina={maquina} onClose={() => setQrVisivel(false)} />
      {fluxos.modais}
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
  secao: {
    gap: Spacing.md,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metade: {
    flexBasis: '47%',
    flexGrow: 1,
  },
});
