import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormModal } from '@/components/forms';
import { Badge, Button } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { Maquina, UsoMaquina } from '@/dtos';
import { formatNumero } from '@/utils/formatters';
import { marcasDoUso } from '../services/marcas';
import { duracaoDoUso, formatarDuracao, horaCurta } from '../services/uso';
import { DesenhoRastro } from './DesenhoRastro';
import { LinhaDado } from './LinhaDado';

export interface ResumoUsoModalProps {
  maquina: Maquina;
  uso: UsoMaquina;
  onAnotar: () => void;
  onClose: () => void;
}

const seg = (s: number | null) => formatarDuracao((s ?? 0) * 1000);

/** Resumo ao desligar: tempo, KM, talhões, área e a qualidade do registro. */
export function ResumoUsoModal({ maquina, uso, onAnotar, onClose }: ResumoUsoModalProps) {
  const marcas = marcasDoUso(uso);
  const comGps = uso.rastreado && uso.kmTotal !== null;

  return (
    <FormModal
      visible
      title="Uso registrado"
      subtitle={`${maquina.nome} · ${horaCurta(uso.inicio)} → ${uso.fim ? horaCurta(uso.fim) : 'agora'}`}
      onClose={onClose}
      onSubmit={onClose}
      submitLabel="Confirmar"
      cancelLabel="Fechar">
      <View style={styles.conteudo}>
        <View style={styles.destaques}>
          <Destaque valor={formatarDuracao(duracaoDoUso(uso, uso.fim ?? new Date()))} rotulo="Tempo" />
          {comGps ? <Destaque valor={`${formatNumero(uso.kmTotal ?? 0, 1)} km`} rotulo="Andou" /> : null}
          {uso.areaEstimadaHa !== null ? (
            <Destaque valor={`${formatNumero(uso.areaEstimadaHa, 1)} ha`} rotulo="Área estimada" />
          ) : null}
        </View>

        {comGps && uso.rastro && uso.rastro.length > 1 ? <DesenhoRastro pontos={uso.rastro} /> : null}

        {comGps ? (
          <View style={styles.lista}>
            <LinhaDado label="Trabalhando">{seg(uso.segTrabalhando)}</LinhaDado>
            <LinhaDado label="Deslocando">{seg(uso.segDeslocando)}</LinhaDado>
            <LinhaDado label="Parada">{seg(uso.segParada)}</LinhaDado>
            {(uso.segPausa ?? 0) > 0 ? <LinhaDado label="Pausa">{seg(uso.segPausa)}</LinhaDado> : null}
            {(uso.segSemSinal ?? 0) > 0 ? <LinhaDado label="Sem sinal">{seg(uso.segSemSinal)}</LinhaDado> : null}
            {uso.talhoes?.map((t) => (
              <LinhaDado key={t.talhaoId} label={t.nome}>
                {`${formatNumero(t.km, 1)} km · ${formatarDuracao(t.segundos * 1000)}`}
              </LinhaDado>
            ))}
            {uso.qualidade !== null ? (
              <LinhaDado label="Qualidade do registro">{`${Math.round(uso.qualidade * 100)}%`}</LinhaDado>
            ) : null}
          </View>
        ) : (
          <Text style={styles.dica}>Sem GPS neste uso: ficou registrado só o tempo.</Text>
        )}

        {marcas.length > 0 ? (
          <View style={styles.marcas}>
            {marcas.map((m) => (
              <Badge key={m.texto} label={m.texto} variant={m.tom === 'atencao' ? 'warning' : 'neutral'} />
            ))}
          </View>
        ) : null}

        <Button label="Escrever uma anotação" variant="ghost" onPress={onAnotar} />
      </View>
    </FormModal>
  );
}

function Destaque({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.destaque}>
      <Text style={styles.destaqueValor}>{valor}</Text>
      <Text style={styles.destaqueRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: Spacing.lg,
  },
  destaques: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  destaque: {
    flex: 1,
    gap: Spacing.half,
  },
  destaqueValor: {
    ...Typography.metricValue,
    color: AgroColors.primary,
  },
  destaqueRotulo: {
    ...Typography.caption,
  },
  lista: {
    gap: Spacing.sm,
  },
  marcas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  dica: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
});
