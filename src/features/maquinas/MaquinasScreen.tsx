import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CustomInput, FormModal } from '@/components/forms';
import {
  Button,
  Card,
  Header,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import Maquina from '@/entities/Maquina';
import { useQuickAction } from '@/providers/QuickActionContext';
import { MaquinaCard } from './MaquinaCard';
import { useMaquinas } from './useMaquinas';

/**
 * Tela de Máquinas e Frota (sem qualquer acoplamento com Ordenha).
 * Exibe a lista de equipamentos agrícolas com indicadores de status/manutenção
 * e modal de cadastro de novas máquinas.
 */
export default function MaquinasScreen() {
  const { maquinas, createMaquina, updateMaquina } = useMaquinas();
  const { registerQuickAction } = useQuickAction();

  const [modalVisible, setModalVisible] = useState(false);
  const [nomeMaquina, setNomeMaquina] = useState('');
  const [statusPct, setStatusPct] = useState('100');
  const [errorNome, setErrorNome] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const openModal = useCallback(() => {
    setErrorNome(undefined);
    setModalVisible(true);
  }, []);

  useEffect(() => {
    return registerQuickAction('maquinas', openModal);
  }, [registerQuickAction, openModal]);

  const handleToggleMaintenance = async (maquina: Maquina) => {
    const nextMaint = !maquina.manutencaoDevida;
    await updateMaquina(maquina.id, {
      manutencaoDevida: nextMaint,
      statusPercentual: nextMaint ? 65 : 100,
    });
  };

  const handleSubmit = async () => {
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
  };

  return (
    <ScreenContainer
      header={<Header title="Máquinas e Frota" showBack />}>
      <SectionHeader
        title="Equipamentos & Veículos"
        size="lg"
        rightElement={
          <Button
            label="+ Nova Máquina"
            variant="outline"
            size="sm"
            onPress={openModal}
          />
        }
      />

      <View style={styles.machinesList}>
        {maquinas.length === 0 ? (
          <Card padding="three">
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma máquina cadastrada ainda no banco local.
            </ThemedText>
          </Card>
        ) : (
          maquinas.map((m: Maquina) => (
            <MaquinaCard
              key={m.id}
              maquina={m}
              onPress={() => handleToggleMaintenance(m)}
            />
          ))
        )}
      </View>

      <FormModal
        visible={modalVisible}
        title="Nova Máquina"
        subtitle="Cadastre um trator, veículo ou implemento na frota local"
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        submitLabel="Salvar Máquina"
        loading={saving}>
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
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  machinesList: {
    gap: Spacing.sm,
  },
});
