import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { CustomInput } from '@/components/forms';
import {
  Button,
  Card,
  EmptyState,
  Header,
  ScreenContainer,
} from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { Tratamento } from '@/dtos';
import { formatDataBR } from '@/utils';
import { FichaResumo } from '../components/FichaResumo';
import { NovoTratamentoForm } from '../components/NovoTratamentoForm';
import {
  OutrosRegistrosMenu,
  type TipoRegistro,
} from '../components/OutrosRegistrosMenu';
import { RegistroForm } from '../components/registros/RegistroForm';
import { toggleDiaConfirmado } from '../data/tratamentos';
import { useFichaAnimal } from '../hooks/useFichaAnimal';
import { useRebanho } from '../hooks/useRebanho';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const SEM_VALOR = '—';

/** Meia-noite do dia, para contar dias sem considerar o horário. */
function inicioDoDia(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Dias do tratamento (1..N), do início ao fim; sem data de fim, conta até hoje. */
function diasDoTratamento(tratamento: Tratamento): number[] {
  const fim = tratamento.dataFim ?? new Date();
  const total = Math.max(
    1,
    Math.round(
      (inicioDoDia(fim) - inicioDoDia(tratamento.dataInicio)) / MS_POR_DIA
    ) + 1
  );
  return Array.from({ length: total }, (_, index) => index + 1);
}

function formatDataHora(date: Date): string {
  const horas = String(date.getHours()).padStart(2, '0');
  const minutos = String(date.getMinutes()).padStart(2, '0');
  return `${formatDataBR(date)} ${horas}:${minutos}`;
}

/**
 * Ficha Animal (tela 3 do Figma, antes "Tratamento Animal").
 * Blocos na ordem do esboço aprovado: resumo, tratamento, reprodução, próximos
 * e histórico. O sub-banner "✓ Tratamento Animal" só aparece com tratamento.
 * Os blocos marcados com o nome do componente são do front-end e entram
 * quando ele commitar; o Histórico é opcional e pode ficar de fora.
 */
export default function AnimalDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ficha = useFichaAnimal(id);
  const animal = ficha?.animal ?? null;
  // TODO(F3a): trocar pelo tratamentosAtivos do back-end
  const activeTratamento = ficha?.tratamentos[0] ?? null;

  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [registro, setRegistro] = useState<TipoRegistro | null>(null);

  // Touros para a cobertura: os machos ativos do rebanho
  const rebanho = useRebanho();
  const touros = useMemo(() => rebanho.filter((a) => a.sexo === 'M'), [rebanho]);

  const displayBrinco = animal ? `Brinco ${animal.brinco}` : SEM_VALOR;
  const confirmedDays = activeTratamento?.diasConfirmados ?? [];

  const handleToggleDay = async (day: number) => {
    if (!activeTratamento) return;
    await toggleDiaConfirmado(activeTratamento, day);
  };

  return (
    <ScreenContainer
      withTabInset={false}
      header={
        <Header
          title="Ficha Animal"
          subBannerTitle={activeTratamento ? 'Tratamento Animal' : undefined}
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

      {/* B. Tratamento: F3a TratamentoAtivoCard substitui este bloco */}
      {activeTratamento ? (
        <>
          {/* Período do tratamento mais recente */}
          <View style={styles.dateInputsRow}>
            <CustomInput
              containerStyle={{ flex: 1 }}
              label="Início"
              value={formatDataBR(activeTratamento.dataInicio)}
              editable={false}
            />
            <CustomInput
              containerStyle={{ flex: 1 }}
              label="Fim"
              value={
                activeTratamento.dataFim
                  ? formatDataBR(activeTratamento.dataFim)
                  : SEM_VALOR
              }
              editable={false}
            />
          </View>

          {/* Dias do tratamento com Checkmarks Verdes */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Dias</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.daysTrackBox}
              contentContainerStyle={styles.daysTrackContent}>
              {diasDoTratamento(activeTratamento).map((day) => {
                const isChecked = confirmedDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => handleToggleDay(day)}
                    style={styles.dayColumn}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked }}
                    accessibilityLabel={`Dia ${day}`}>
                    <Text style={styles.dayNumberText}>{day}</Text>
                    <View
                      style={[
                        styles.dayCheckCircle,
                        isChecked
                          ? styles.dayCheckCircleActive
                          : styles.dayCheckCircleInactive,
                      ]}>
                      {isChecked && <Text style={styles.dayCheckMark}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Seção Notificações */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Notificações</Text>
            <Card padding="md">
              <View style={styles.notifRow}>
                <View style={styles.notifLeft}>
                  <View style={styles.notifIconCircle}>
                    <Text style={styles.notifIconText}>🕒</Text>
                  </View>
                  <Text style={styles.notifTitle}>Próxima dose</Text>
                </View>
                <Text style={styles.notifValueBold}>
                  {activeTratamento.proximaDoseEm
                    ? formatDataHora(activeTratamento.proximaDoseEm)
                    : 'Não agendada'}
                </Text>
              </View>
            </Card>
          </View>
        </>
      ) : (
        <EmptyState message="Nenhum tratamento registrado para este animal." />
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
  dateInputsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  sectionBlock: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  daysTrackBox: {
    backgroundColor: AgroColors.mintBg,
    borderRadius: Radius.md,
  },
  daysTrackContent: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  dayColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: AgroColors.textSecondary,
  },
  dayCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCheckCircleActive: {
    backgroundColor: AgroColors.primaryLight,
  },
  dayCheckCircleInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: AgroColors.borderStrong,
  },
  dayCheckMark: {
    color: AgroColors.textInverse,
    fontSize: 11,
    fontWeight: '900',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: Spacing.two,
  },
  notifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  notifIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AgroColors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconText: {
    fontSize: 12,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: AgroColors.textSecondary,
    flex: 1,
  },
  notifValueBold: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
});
