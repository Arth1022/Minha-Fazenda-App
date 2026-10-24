import { useState } from 'react';
import { Alert } from 'react-native';

/**
 * Envio dos mini-formulários da ficha: mostra o carregamento, fecha ao salvar
 * e avisa se der erro.
 */
export function useEnvioRegistro(enviar: () => Promise<unknown>, onClose: () => void) {
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await enviar();
      onClose();
    } catch {
      Alert.alert('Não foi possível salvar', 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return { saving, submit };
}
