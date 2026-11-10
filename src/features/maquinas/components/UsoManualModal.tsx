import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChipSelector, DateField, FormModal, TimeWheelPicker } from '@/components/forms';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { ATIVIDADES_USO } from '@/database';
import type { AtividadeUso, Maquina } from '@/dtos';
import { ATIVIDADE_LABEL } from '../constants';
import { registrarUsoManual } from '../data/usos';
import { avisarFalha } from './conferencia';

export interface UsoManualModalProps {
  maquina: Maquina;
  onClose: () => void;
}

/** "07:30" na data escolhida. */
function naData(data: Date, horario: string): Date {
  const [hora, minuto] = horario.split(':').map(Number);
  const resultado = new Date(data);
  resultado.setHours(hora, minuto, 0, 0);
  return resultado;
}

/**
 * Uso esquecido: a pessoa usou sem registrar e informa o horário aproximado.
 * Entra marcado como "registro manual" para o dono ver a diferença.
 */
export function UsoManualModal({ maquina, onClose }: UsoManualModalProps) {
  const [data, setData] = useState(() => new Date());
  const [inicio, setInicio] = useState('07:00');
  const [fim, setFim] = useState('11:00');
  const [atividade, setAtividade] = useState<AtividadeUso>('outro');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    try {
      await registrarUsoManual(maquina.id, { inicio: naData(data, inicio), fim: naData(data, fim), atividade });
      onClose();
    } catch (erro) {
      avisarFalha(erro);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <FormModal
      visible
      title="Uso esquecido"
      subtitle={maquina.nome}
      onClose={onClose}
      onSubmit={salvar}
      submitLabel="Registrar"
      loading={salvando}>
      <View style={styles.conteudo}>
        <Text style={styles.dica}>
          Usou a máquina sem ligar no app? Informe o horário aproximado. O registro fica marcado como manual.
        </Text>
        <DateField label="Dia" value={data} onChange={setData} maximumDate={new Date()} />
        <View style={styles.horarios}>
          <View style={styles.horario}>
            <TimeWheelPicker label="Começou" value={inicio} onChange={setInicio} />
          </View>
          <View style={styles.horario}>
            <TimeWheelPicker label="Terminou" value={fim} onChange={setFim} />
          </View>
        </View>
        <ChipSelector
          label="Atividade"
          value={atividade}
          onChange={setAtividade}
          options={ATIVIDADES_USO.map((a) => ({ label: ATIVIDADE_LABEL[a], value: a }))}
        />
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: Spacing.lg,
  },
  dica: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
  horarios: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  horario: {
    flex: 1,
  },
});
