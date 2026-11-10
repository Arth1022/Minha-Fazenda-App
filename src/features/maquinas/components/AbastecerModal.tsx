import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipSelector, CustomInput, FormModal, SwitchField } from '@/components/forms';
import { Spacing } from '@/constants/theme';
import { ORIGENS_ABASTECIMENTO } from '@/database';
import type { Maquina, OrigemAbastecimento } from '@/dtos';
import { guardarFoto } from '@/services/fotos';
import { parseDecimal } from '@/utils';
import { formatNumero } from '@/utils/formatters';
import { ORIGEM_ABASTECIMENTO_LABEL } from '../constants';
import { registrarAbastecimento } from '../data/abastecimentos';
import { useHorimetro } from '../hooks/useHorimetro';
import { posicaoRapida } from '../rastro/localizacao';
import { conferirAbastecimento, conferirHorimetro } from '../services/registros';
import { CampoFoto } from './CampoFoto';
import { avisarFalha, passarPelaConferencia } from './conferencia';

export interface AbastecerModalProps {
  maquina: Maquina;
  /** Uso em andamento: abastece sem encerrar */
  usoId: string | null;
  onClose: () => void;
}

/**
 * Abastecimento: litros (teclado numérico), "completou o tanque?" (padrão sim),
 * origem e, se a máquina tem horímetro, a leitura dele. Foto opcional.
 */
export function AbastecerModal({ maquina, usoId, onClose }: AbastecerModalProps) {
  const horimetro = useHorimetro(maquina);
  const [litros, setLitros] = useState('');
  const [tanqueCheio, setTanqueCheio] = useState(true);
  const [origem, setOrigem] = useState<OrigemAbastecimento>('fazenda');
  const [leitura, setLeitura] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [erroLitros, setErroLitros] = useState<string>();
  const [erroHorimetro, setErroHorimetro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setErroLitros(undefined);
    setErroHorimetro(undefined);
    const valorLitros = parseDecimal(litros);
    if (!(await passarPelaConferencia(conferirAbastecimento(valorLitros, maquina.tanqueLitros), setErroLitros))) return;

    const valorHorimetro = leitura.trim() ? parseDecimal(leitura) : null;
    if (valorHorimetro !== null) {
      const conferencia = conferirHorimetro(valorHorimetro, horimetro.ultima, horimetro.estimadoH, new Date());
      if (!(await passarPelaConferencia(conferencia, setErroHorimetro))) return;
    }

    setSalvando(true);
    try {
      await registrarAbastecimento({
        maquinaId: maquina.id,
        usoId,
        litros: valorLitros,
        tanqueCheio,
        origem,
        horimetroH: valorHorimetro,
        horimetroEstimadoH: horimetro.estimadoH,
        fotoUri: await guardarFoto(foto),
        posicao: await posicaoRapida(),
      });
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
      title="Abastecer"
      subtitle={maquina.nome}
      onClose={onClose}
      onSubmit={salvar}
      submitLabel="Registrar"
      loading={salvando}>
      <View style={styles.conteudo}>
        <CustomInput
          label="Litros"
          value={litros}
          onChangeText={setLitros}
          keyboardType="decimal-pad"
          placeholder="Ex: 80"
          error={erroLitros}
          helperText={maquina.tanqueLitros ? `Tanque de ${formatNumero(maquina.tanqueLitros)} L` : undefined}
          autoFocus
          style={styles.numeroGrande}
        />
        <SwitchField
          label="Completou o tanque?"
          value={tanqueCheio}
          onChange={setTanqueCheio}
          helperText="O consumo é calculado de tanque cheio a tanque cheio."
        />
        <ChipSelector
          label="Origem"
          value={origem}
          onChange={setOrigem}
          options={ORIGENS_ABASTECIMENTO.map((o) => ({ label: ORIGEM_ABASTECIMENTO_LABEL[o], value: o }))}
        />
        {maquina.possuiHorimetro ? (
          <CustomInput
            label="Horímetro (opcional)"
            value={leitura}
            onChangeText={setLeitura}
            keyboardType="decimal-pad"
            placeholder="O número do painel"
            error={erroHorimetro}
          />
        ) : null}
        <CampoFoto label="Foto da bomba ou da nota (opcional)" uri={foto} onChange={setFoto} />
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
