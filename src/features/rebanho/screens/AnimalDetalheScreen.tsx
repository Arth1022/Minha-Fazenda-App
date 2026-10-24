import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { CustomInput, FormModal } from '@/components/forms';
import {
  Button,
  Card,
  EmptyState,
  Header,
  ScreenContainer,
} from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { Tratamento } from '@/dtos';
import { formatDataBR, maskDataBR, parseDataBR } from '@/utils';
import { createTratamento, toggleDiaConfirmado } from '../data/tratamentos';
import { useFichaAnimal } from '../hooks/useFichaAnimal';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const SEM_VALOR = '—';
const ERRO_DATA = 'Informe a data no formato DD/MM/AAAA.';

interface TratamentoErrors {
  medicamento?: string;
  inicio?: string;
  fim?: string;
}

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

  // Estado para modal de "Novo Tratamento"
  const [modalVisible, setModalVisible] = useState(false);
  const [novoMedicamento, setNovoMedicamento] = useState('');
  const [novoInicio, setNovoInicio] = useState('');
  const [novoFim, setNovoFim] = useState('');
  const [errors, setErrors] = useState<TratamentoErrors>({});
  const [saving, setSaving] = useState(false);

  const displayBrinco = animal ? `Brinco ${animal.brinco}` : SEM_VALOR;
  const confirmedDays = activeTratamento?.diasConfirmados ?? [];

  const openModal = () => {
    setNovoMedicamento('');
    setNovoInicio(formatDataBR(new Date()));
    setNovoFim('');
    setErrors({});
    setModalVisible(true);
  };

  const clearError = (field: keyof TratamentoErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleToggleDay = async (day: number) => {
    if (!activeTratamento) return;
    await toggleDiaConfirmado(activeTratamento, day);
  };

  const handleCreateTratamento = async () => {
    const medicamento = novoMedicamento.trim();
    const dataInicio = parseDataBR(novoInicio);
    const dataFim = parseDataBR(novoFim);

    const nextErrors: TratamentoErrors = {};
    if (!medicamento) nextErrors.medicamento = 'Informe o nome do medicamento.';
    if (!dataInicio) nextErrors.inicio = ERRO_DATA;
    if (!dataFim) {
      nextErrors.fim = ERRO_DATA;
    } else if (dataInicio && dataFim.getTime() < dataInicio.getTime()) {
      nextErrors.fim = 'O fim deve ser igual ou posterior ao início.';
    }

    if (!id || !dataInicio || !dataFim || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await createTratamento({
        animalId: id,
        medicamento,
        dataInicio,
        dataFim,
        diasConfirmados: [],
        notificacaoAtiva: true,
      });
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
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
            onPress={openModal}
          />
          {/* F6 "Outros registros" (outline): Pesagem, Cobertura, Parto (se ficha.podeReproduzir) e Saída */}
        </View>
      }>
      {/* A. F2 FichaResumo: substitui a identificação abaixo (inclui "Produção de Leite" só quando preenchida) */}
      {/* Identificação do Animal e Medicamento Ativo */}
      <View style={styles.animalProfileRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>🐮</Text>
        </View>
        <View style={styles.animalTitleCol}>
          <Text style={styles.animalBrincoText}>{displayBrinco}</Text>
          <Text style={styles.medicationSubText}>
            {activeTratamento?.medicamento ?? 'Nenhum tratamento registrado'}
          </Text>
        </View>
      </View>

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

      {/* Modal de Formulário para Novo Tratamento */}
      <FormModal
        visible={modalVisible}
        title="Novo Tratamento"
        subtitle={`Registrar protocolo sanitário para ${displayBrinco}`}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreateTratamento}
        submitLabel="Iniciar Tratamento"
        loading={saving}>
        <CustomInput
          label="Medicamento / Protocolo"
          required
          value={novoMedicamento}
          onChangeText={(text) => {
            setNovoMedicamento(text);
            clearError('medicamento');
          }}
          placeholder="Nome do medicamento ou vacina"
          error={errors.medicamento}
        />

        <View style={styles.dateInputsRow}>
          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Data de Início"
            required
            value={novoInicio}
            onChangeText={(text) => {
              setNovoInicio(maskDataBR(text));
              clearError('inicio');
            }}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
            error={errors.inicio}
          />
          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Data de Fim"
            required
            value={novoFim}
            onChangeText={(text) => {
              setNovoFim(maskDataBR(text));
              clearError('fim');
            }}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
            error={errors.fim}
          />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  footerActions: {
    gap: Spacing.two,
  },
  animalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  animalTitleCol: {
    gap: 2,
  },
  animalBrincoText: {
    fontSize: 16,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  medicationSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: AgroColors.textMuted,
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
