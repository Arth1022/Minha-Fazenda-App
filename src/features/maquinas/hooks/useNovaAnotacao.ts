import { useState } from 'react';
import { Alert } from 'react-native';

import { criarAnotacao } from '../data/anotacoes';

/** Texto, envio e erro do mini-formulário de anotação da máquina. */
export function useNovaAnotacao(maquinaId: string, onSaved: () => void, usoId: string | null = null) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const alterarTexto = (valor: string) => {
    setTexto(valor);
    if (erro) setErro(undefined);
  };

  const submit = async () => {
    if (!texto.trim()) {
      setErro('Escreva a anotação.');
      return;
    }
    setSaving(true);
    try {
      await criarAnotacao(maquinaId, texto, usoId);
      setTexto('');
      onSaved();
    } catch {
      Alert.alert('Não foi possível salvar', 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const limpar = () => {
    setTexto('');
    setErro(undefined);
  };

  return { texto, alterarTexto, erro, saving, submit, limpar };
}
