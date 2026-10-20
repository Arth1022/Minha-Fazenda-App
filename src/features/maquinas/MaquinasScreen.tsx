import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ChipSelector,
  type ChipOption,
  CustomInput,
  FormModal,
} from '@/components/forms';
import {
  Card,
  Header,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';
import Maquina from '@/entities/Maquina';
import { PeriodoOrdenha } from '@/entities/Ordenha';
import { useRebanho } from '@/features/rebanho/useRebanho';
import { useQuickAction } from '@/providers/QuickActionContext';
import { MaquinaCard } from './MaquinaCard';
import { useMaquinas } from './useMaquinas';

type ModalFormType = 'maquina' | 'ordenha';

const FORM_TYPE_OPTIONS: ChipOption<ModalFormType>[] = [
  { label: 'Nova Máquina', value: 'maquina', icon: '🚜' },
  { label: 'Registrar Ordenha', value: 'ordenha', icon: '🥛' },
];

const PERIODO_OPTIONS: ChipOption<PeriodoOrdenha>[] = [
  { label: 'Manhã (05:30)', value: 'manha', icon: '☀️' },
  { label: 'Tarde (17:00)', value: 'tarde', icon: '🌅' },
];

/**
 * Tela 5 do Figma: "Máquinas e Ordenha"
 * Exibe lista de equipamentos (Trator JD, Caminhão) com indicadores de status/manutenção
 * e o painel "Ordenha" (Horários de Ordenha Manhã/Tarde + Volume diário em azul).
 */
export default function MaquinasScreen() {
  const { maquinas, createMaquina, updateMaquina } = useMaquinas();
  const { ordenhas, totalVolumeL, createOrdenha } = useRebanho();
  const { registerQuickAction } = useQuickAction();

  const [modalVisible, setModalVisible] = useState(false);
  const [formType, setFormType] = useState<ModalFormType>('maquina');

  // Campos de Nova Máquina
  const [nomeMaquina, setNomeMaquina] = useState('');
  const [statusPct, setStatusPct] = useState('100');
  const [errorNome, setErrorNome] = useState<string | undefined>();

  // Campos de Registro de Ordenha
  const [periodo, setPeriodo] = useState<PeriodoOrdenha>('manha');
  const [horarioPrevisto, setHorarioPrevisto] = useState('05:30');
  const [horarioNotificacao, setHorarioNotificacao] = useState('05:15');
  const [volumeLitros, setVolumeLitros] = useState('');
  const [errorVolume, setErrorVolume] = useState<string | undefined>();

  const [saving, setSaving] = useState(false);

  const openModal = useCallback(() => {
    setErrorNome(undefined);
    setErrorVolume(undefined);
    setModalVisible(true);
  }, []);

  useEffect(() => {
    return registerQuickAction('maquinas', openModal);
  }, [registerQuickAction, openModal]);

  const ordenhaManha = ordenhas.find((o) => o.periodo === 'manha');
  const ordenhaTarde = ordenhas.find((o) => o.periodo === 'tarde');
  const displayVolumeTotal = totalVolumeL > 0 ? totalVolumeL : 285;

  const handleToggleMaintenance = async (maquina: Maquina) => {
    const nextMaint = !maquina.manutencaoDevida;
    await updateMaquina(maquina.id, {
      manutencaoDevida: nextMaint,
      statusPercentual: nextMaint ? 65 : 100,
    });
  };

  const handleSubmit = async () => {
    if (formType === 'maquina') {
      if (!nomeMaquina.trim()) {
        setErrorNome('Informe o nome da máquina ou veículo.');
        return;
      }
      setSaving(true);
      try {
        const pct = Math.min(
          100,
          Math.max(0, parseInt(statusPct, 10) || 100)
        );
        await createMaquina({
          nome: nomeMaquina.trim(),
          statusPercentual: pct,
          manutencaoDevida: pct < 80,
        });
        setNomeMaquina('');
        setStatusPct('100');
        setModalVisible(false);
      } finally {
        setSaving(false);
      }
    } else {
      const vol = parseFloat(volumeLitros.replace(',', '.'));
      if (!volumeLitros.trim() || isNaN(vol) || vol <= 0) {
        setErrorVolume('Informe o volume ordenhado em litros.');
        return;
      }
      setSaving(true);
      try {
        await createOrdenha({
          periodo,
          horarioPrevisto: horarioPrevisto.trim() || '05:30',
          horarioNotificacao: horarioNotificacao.trim() || '05:15',
          volumeLitros: vol,
          dataRegistro: new Date(),
        });
        setVolumeLitros('');
        setModalVisible(false);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <ScreenContainer
      header={<Header title="Máquinas e Ordenha" showBack />}>
      {/* Lista de Máquinas (Trator JD / Caminhão) */}
      <View style={styles.machinesList}>
        {maquinas.map((m: Maquina) => (
          <MaquinaCard
            key={m.id}
            maquina={m}
            onPress={() => handleToggleMaintenance(m)}
          />
        ))}
      </View>

      {/* Seção Ordenha (Fiel à Tela 5 do Figma) */}
      <View style={styles.ordenhaSection}>
        <SectionHeader title="Ordenha" />

        <Card padding="three">
          <Text style={styles.ordenhaCardSubtitle}>Horários de Ordenha</Text>

          {/* Linha 1: Manhã */}
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleLeft}>
              <Text style={styles.sunIcon}>☀️</Text>
              <View>
                <Text style={styles.periodLabel}>Manhã</Text>
                <Text style={styles.timeBold}>
                  {ordenhaManha?.horarioPrevisto ?? '05:30'}
                </Text>
              </View>
            </View>

            <View style={styles.scheduleRight}>
              <Text style={styles.notifLabel}>Notificação</Text>
              <Text style={styles.notifTimeGreen}>
                {ordenhaManha?.horarioNotificacao ?? '05:15'}
              </Text>
            </View>
          </View>

          {/* Linha 2: Tarde */}
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleLeft}>
              <Text style={styles.sunIcon}>🌅</Text>
              <View>
                <Text style={styles.periodLabel}>Tarde</Text>
                <Text style={styles.timeBold}>
                  {ordenhaTarde?.horarioPrevisto ?? '17:00'}
                </Text>
              </View>
            </View>

            <View style={styles.scheduleRight}>
              <Text style={styles.notifLabel}>Notificação</Text>
              <Text style={styles.notifTimeGreen}>
                {ordenhaTarde?.horarioNotificacao ?? '16:45'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Rodapé: Volume diário */}
          <View style={styles.volumeFooterRow}>
            <View style={styles.volumeLeft}>
              <Text style={styles.dropIcon}>💧</Text>
              <Text style={styles.volumeLabel}>Volume diário</Text>
            </View>
            <Text style={styles.volumeValueBlue}>{displayVolumeTotal} L</Text>
          </View>
        </Card>
      </View>

      {/* Modal de Formulário Modular para Máquinas e Ordenha */}
      <FormModal
        visible={modalVisible}
        title={
          formType === 'maquina' ? 'Nova Máquina' : 'Registrar Ordenha'
        }
        subtitle="Salvo imediatamente no banco de dados offline"
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        submitLabel="Salvar"
        loading={saving}>
        <ChipSelector
          label="Tipo de Registro"
          options={FORM_TYPE_OPTIONS}
          value={formType}
          onChange={setFormType}
        />

        {formType === 'maquina' ? (
          <>
            <CustomInput
              label="Nome da Máquina / Veículo"
              required
              value={nomeMaquina}
              onChangeText={(t) => {
                setNomeMaquina(t);
                if (errorNome) setErrorNome(undefined);
              }}
              placeholder="Ex: Trator JD ou Caminhão"
              error={errorNome}
            />

            <CustomInput
              label="Status Operacional"
              value={statusPct}
              onChangeText={setStatusPct}
              placeholder="100"
              keyboardType="numeric"
              suffix="%"
              helperText="Valores abaixo de 80% sinalizam 'Manutenção devida'."
            />
          </>
        ) : (
          <>
            <ChipSelector
              label="Período da Ordenha"
              options={PERIODO_OPTIONS}
              value={periodo}
              onChange={(p) => {
                setPeriodo(p);
                if (p === 'manha') {
                  setHorarioPrevisto('05:30');
                  setHorarioNotificacao('05:15');
                } else {
                  setHorarioPrevisto('17:00');
                  setHorarioNotificacao('16:45');
                }
              }}
            />

            <View style={styles.twoColRow}>
              <CustomInput
                containerStyle={{ flex: 1 }}
                label="Horário Previsto"
                value={horarioPrevisto}
                onChangeText={setHorarioPrevisto}
                placeholder="05:30"
              />
              <CustomInput
                containerStyle={{ flex: 1 }}
                label="Notificação"
                value={horarioNotificacao}
                onChangeText={setHorarioNotificacao}
                placeholder="05:15"
              />
            </View>

            <CustomInput
              label="Volume Coletado"
              required
              value={volumeLitros}
              onChangeText={(t) => {
                setVolumeLitros(t);
                if (errorVolume) setErrorVolume(undefined);
              }}
              placeholder="Ex: 155"
              keyboardType="numeric"
              suffix="L"
              error={errorVolume}
            />
          </>
        )}
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  machinesList: {
    gap: Spacing.sm,
  },
  ordenhaSection: {
    gap: Spacing.sm,
    marginTop: 4,
  },
  ordenhaCardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: AgroColors.textSecondary,
    marginBottom: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sunIcon: {
    fontSize: 18,
  },
  periodLabel: {
    fontSize: 11,
    color: AgroColors.textMuted,
    fontWeight: '500',
  },
  timeBold: {
    fontSize: 15,
    fontWeight: '800',
    color: AgroColors.textPrimary,
    marginTop: 1,
  },
  scheduleRight: {
    alignItems: 'flex-end',
  },
  notifLabel: {
    fontSize: 10,
    color: AgroColors.textMuted,
    fontWeight: '500',
  },
  notifTimeGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.primary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: AgroColors.divider,
    marginVertical: 4,
  },
  volumeFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  volumeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropIcon: {
    fontSize: 13,
  },
  volumeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AgroColors.textSecondary,
  },
  volumeValueBlue: {
    fontSize: 16,
    fontWeight: '800',
    color: AgroColors.waterBlue,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
