import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CustomInput, FormModal } from '@/components/forms';
import { Spacing } from '@/constants/theme';
import type { Maquina } from '@/dtos';
import { guardarFoto } from '@/services/fotos';
import { parseDecimal } from '@/utils';
import { formatNumero } from '@/utils/formatters';
import { registrarLeituraHorimetro } from '../data/horimetro';
import { useHorimetro } from '../hooks/useHorimetro';
import { conferirHorimetro } from '../services/registros';
import { CampoFoto } from './CampoFoto';
import { avisarFalha, passarPelaConferencia } from './conferencia';

export interface HorimetroModalProps {
  maquina: Maquina;
  usoId: string | null;
  onClose: () => void;
}

/**
 * Leitura do horímetro: a pessoa digita o que vê no painel. O app não preenche
 * o número, para a leitura continuar servindo de conferência.
 */
export function HorimetroModal({ maquina, usoId, onClose }: HorimetroModalProps) {
  const { ultima, estimadoH } = useHorimetro(maquina);
  const [valor, setValor] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setErro(undefined);
    const valorH = valor.trim() ? parseDecimal(valor) : NaN;
    if (!(await passarPelaConferencia(conferirHorimetro(valorH, ultima, estimadoH, new Date()), setErro))) return;
    setSalvando(true);
    try {
      await registrarLeituraHorimetro({
        maquinaId: maquina.id,
        usoId,
        valorH,
        estimadoH,
        fotoUri: await guardarFoto(foto),
      });
      onClose();
    } catch (falha) {
      avisarFalha(falha);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <FormModal
      visible
      title="Horímetro"
      subtitle={maquina.nome}
      onClose={onClose}
      onSubmit={salvar}
      submitLabel="Registrar"
      loading={salvando}>
      <View style={styles.conteudo}>
        <CustomInput
          label="Horas no painel"
          value={valor}
          onChangeText={setValor}
          keyboardType="decimal-pad"
          placeholder="Digite o número que aparece"
          error={erro}
          helperText={ultima ? `Última leitura: ${formatNumero(ultima.valorH)} h` : undefined}
          autoFocus
          style={styles.numeroGrande}
        />
        <CampoFoto label="Foto do painel (opcional)" uri={foto} onChange={setFoto} />
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: Spacing.lg,
  },
  numeroGrande: {
    fontSize: 24,
  },
});
