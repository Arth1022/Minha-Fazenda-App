import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Header, InfoBanner, ScreenContainer, type BadgeVariant } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { PontoRastro } from '@/dtos';
import { formatNumero } from '@/utils/formatters';
import { DesenhoRastro } from '../components/DesenhoRastro';
import { TempoDecorrido } from '../components/TempoDecorrido';
import { ATIVIDADE_LABEL } from '../constants';
import { useFluxosMaquina } from '../hooks/useFluxosMaquina';
import { useUsoAtual } from '../hooks/useUsoAtual';
import { simplificarLinha } from '../services/geo';
import { horaCurta } from '../services/uso';

const ESTADO: Record<string, { texto: string; variante: BadgeVariant }> = {
  trabalhando: { texto: 'Trabalhando', variante: 'success' },
  deslocando: { texto: 'Deslocando', variante: 'info' },
  parada: { texto: 'Parada', variante: 'neutral' },
  semSinal: { texto: 'Sem sinal de GPS', variante: 'warning' },
  pausa: { texto: 'Em pausa', variante: 'warning' },
};

/**
 * Uso em andamento de quem está com o celular: tempo, KM, estado e talhão, com o
 * rastro desenhado. A notificação fixa do Android abre esta tela.
 */
export default function EmUsoScreen() {
  const atual = useUsoAtual();
  const fluxos = useFluxosMaquina();

  // Desenho leve: o rastro simplificado (erro de 3 m), não todos os pontos
  const rastro = useMemo<PontoRastro[]>(
    () => (atual ? simplificarLinha(atual.pontos, 3).map((p): PontoRastro => [p.lng, p.lat]) : []),
    [atual]
  );

  if (!atual) {
    return (
      <ScreenContainer withTabInset={false} header={<Header title="Em uso" showBack />}>
        <EmptyState message="Nenhuma máquina em uso por você agora. Leia o QR da máquina para ligar." />
        {fluxos.modais}
      </ScreenContainer>
    );
  }

  const { uso, maquina, implemento, pausaDesde, km, agora } = atual;
  const estado = ESTADO[pausaDesde ? 'pausa' : (agora?.estado ?? 'parada')];
  const contexto = { usoAberto: uso };

  return (
    <ScreenContainer
      withTabInset={false}
      header={<Header title="Em uso" showBack />}
      footer={
        <Button
          label="Desligar"
          variant="danger"
          size="lg"
          fullWidth
          loading={fluxos.ocupado}
          onPress={() => fluxos.desligar(maquina)}
        />
      }>
      <View style={styles.coluna}>
        <Card variant="mint" padding="three">
          <View style={styles.topo}>
            <View style={styles.textos}>
              <Text style={styles.nome} numberOfLines={1}>
                {maquina.nome}
              </Text>
              <Text style={styles.detalhe} numberOfLines={1}>
                {[implemento?.nome, uso.atividade ? ATIVIDADE_LABEL[uso.atividade] : null, `desde ${horaCurta(uso.inicio)}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            {uso.rastreado ? <Badge label={estado.texto} variant={estado.variante} dot /> : null}
          </View>
          <View style={styles.numeros}>
            <View style={styles.numero}>
              <TempoDecorrido desde={uso.inicio} style={styles.valor} />
              <Text style={styles.rotulo}>Tempo</Text>
            </View>
            {km !== null ? (
              <View style={styles.numero}>
                <Text style={styles.valor}>{formatNumero(km, 1)} km</Text>
                <Text style={styles.rotulo}>Andou</Text>
              </View>
            ) : null}
          </View>
          {agora?.talhao ? <Text style={styles.talhao}>No talhão {agora.talhao}</Text> : null}
        </Card>

        {!uso.rastreado ? (
          <InfoBanner variant="info" message="Sem GPS neste uso: está sendo registrado só o tempo." />
        ) : null}
        {pausaDesde ? (
          <InfoBanner
            variant="info"
            message={`Em pausa desde ${horaCurta(pausaDesde)}: não conta como uso. Volta sozinha quando a máquina andar.`}
          />
        ) : null}

        {rastro.length > 1 ? <DesenhoRastro pontos={rastro} altura={200} /> : null}

        <View style={styles.acoes}>
          <Button label="Abastecer" variant="outline" onPress={() => fluxos.abrir('abastecer', maquina, contexto)} style={styles.acao} />
          <Button label="Problema" variant="outline" onPress={() => fluxos.abrir('problema', maquina, contexto)} style={styles.acao} />
          {pausaDesde ? (
            <Button label="Voltar ao trabalho" variant="secondary" onPress={() => fluxos.retomar(uso)} style={styles.acao} />
          ) : (
            <Button label="Pausa" variant="secondary" onPress={() => fluxos.pausar(uso)} style={styles.acao} />
          )}
        </View>
      </View>
      {fluxos.modais}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.lg,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  nome: {
    ...Typography.cardTitle,
  },
  detalhe: {
    ...Typography.caption,
  },
  numeros: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  numero: {
    gap: Spacing.half,
  },
  valor: {
    ...Typography.metricLarge,
    color: AgroColors.primary,
  },
  rotulo: {
    ...Typography.caption,
  },
  talhao: {
    ...Typography.captionBold,
    marginTop: Spacing.sm,
  },
  acoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  acao: {
    flexBasis: '30%',
    flexGrow: 1,
  },
});
