import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { CustomInput, FormModal } from '@/components/forms';
import { Button, Card, Header, ScreenContainer } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import {
  useAnimal,
  useAnimalTratamentos,
  useRebanho,
} from './useRebanho';

const DAYS_LIST = [1, 2, 3, 4, 5, 6, 7];

const MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function formatShortDate(date?: Date | null, fallback = '10 Out'): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return fallback;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_SHORT[date.getMonth()] ?? 'Out';
  return `${day} ${month}`;
}

/**
 * Tela 3 do Figma: "Tratamento Animal"
 * Exibe cabeçalho duplo (barra escura + sub-banner "✓ Tratamento Animal"),
 * identificação do animal, campos de data Início/Fim, calendário de 7 dias
 * com marcação verde de doses, card de Notificações e botão "Novo Tratamento".
 */
export default function AnimalDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const animal = useAnimal(id);
  const animalTratamentos = useAnimalTratamentos(id);
  const { tratamentos, createTratamento, toggleDiaTratamento } = useRebanho();

  const activeTratamento =
    animalTratamentos[0] ?? tratamentos[0] ?? null;

  const [inicioText, setInicioText] = useState(
    formatShortDate(activeTratamento?.dataInicio, '10 Out')
  );
  const [fimText, setFimText] = useState(
    formatShortDate(activeTratamento?.dataFim, '19 Out')
  );

  // Estado para modal de "Novo Tratamento"
  const [modalVisible, setModalVisible] = useState(false);
  const [novoMedicamento, setNovoMedicamento] = useState('');
  const [novoInicio, setNovoInicio] = useState('10 Out');
  const [novoFim, setNovoFim] = useState('19 Out');
  const [errorMed, setErrorMed] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const confirmedDays = activeTratamento?.diasConfirmados ?? [
    1, 2, 3, 4, 5, 6, 7,
  ];

  const handleToggleDay = async (day: number) => {
    if (!activeTratamento) return;
    await toggleDiaTratamento(activeTratamento, day);
  };

  const handleCreateTratamento = async () => {
    if (!novoMedicamento.trim()) {
      setErrorMed('Informe o nome do medicamento.');
      return;
    }

    setSaving(true);
    try {
      const targetAnimalId = animal?.id ?? id ?? '';
      if (targetAnimalId) {
        await createTratamento({
          animalId: targetAnimalId,
          medicamento: novoMedicamento.trim(),
          dataInicio: new Date(2026, 9, 10),
          dataFim: new Date(2026, 9, 19),
          diasConfirmados: [1],
          notificacaoAtiva: true,
        });
      }
      setInicioText(novoInicio);
      setFimText(novoFim);
      setNovoMedicamento('');
      setErrorMed(undefined);
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const displayBrinco = animal
    ? animal.brinco.startsWith('Brinco')
      ? animal.brinco
      : `Brinco ${animal.brinco}`
    : 'Brinco #101';

  const displayMedicamento =
    activeTratamento?.medicamento ?? 'Antibiótico X';

  return (
    <ScreenContainer
      withTabInset={false}
      header={
        <Header
          title="Tratamento Animal"
          subBannerTitle="Tratamento Animal"
          showBack
        />
      }
      footer={
        <Button
          label="Novo Tratamento"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => setModalVisible(true)}
        />
      }>
      {/* Identificação do Animal e Medicamento Ativo */}
      <View style={styles.animalProfileRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>🐮</Text>
        </View>
        <View style={styles.animalTitleCol}>
          <Text style={styles.animalBrincoText}>{displayBrinco}</Text>
          <Text style={styles.medicationSubText}>{displayMedicamento}</Text>
        </View>
      </View>

      {/* Campos de Período: Início e Fim (Camada de Formulário Modular) */}
      <View style={styles.dateInputsRow}>
        <CustomInput
          containerStyle={{ flex: 1 }}
          label="Início"
          value={inicioText}
          onChangeText={setInicioText}
          placeholder="10 Out"
        />
        <CustomInput
          containerStyle={{ flex: 1 }}
          label="Fim"
          value={fimText}
          onChangeText={setFimText}
          placeholder="19 Out"
        />
      </View>

      {/* Seção Dias (1 a 7 com Checkmarks Verdes) */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Dias</Text>
        <View style={styles.daysTrackBox}>
          {DAYS_LIST.map((day) => {
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
        </View>
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
            <Text style={styles.notifValueBold}>Amanhã 08h</Text>
          </View>

          <View style={styles.notifDivider} />

          <View style={styles.notifRow}>
            <View style={styles.notifLeft}>
              <View style={styles.notifIconCircle}>
                <Text style={styles.notifIconText}>💊</Text>
              </View>
              <Text style={styles.notifTitle}>
                Queda no estoque do medicamento
              </Text>
            </View>
          </View>
        </Card>
      </View>

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
            if (errorMed) setErrorMed(undefined);
          }}
          placeholder="Ex: Antibiótico X ou Vacina Aftosa"
          error={errorMed}
        />

        <View style={styles.dateInputsRow}>
          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Data de Início"
            value={novoInicio}
            onChangeText={setNovoInicio}
            placeholder="10 Out"
          />
          <CustomInput
            containerStyle={{ flex: 1 }}
            label="Data de Fim"
            value={novoFim}
            onChangeText={setNovoFim}
            placeholder="19 Out"
          />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AgroColors.mintBg,
    borderRadius: Radius.md,
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
  notifDivider: {
    height: 1,
    backgroundColor: AgroColors.divider,
    marginVertical: 4,
  },
});
