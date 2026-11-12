import React, { useState } from 'react';

import { CustomInput } from '@/components/forms';
import type { Credencial } from './servicoConta';

export interface CredencialFormProps {
  /** Devolve o objeto `credencial` a cada mudança */
  onChange: (credencial: Credencial) => void;
  erro?: string | null;
}

/**
 * Campos da credencial do login e do cadastro. Só a versão dev: e-mail →
 * `{ tipo: "dev", email }`.
 * TODO(decisao): método de login real (o "code"); troca só aqui e no tipo `Credencial`.
 */
export function CredencialForm({ onChange, erro }: CredencialFormProps) {
  const [email, setEmail] = useState('');
  return (
    <CustomInput
      label="E-mail"
      value={email}
      onChangeText={(texto) => {
        setEmail(texto);
        onChange({ tipo: 'dev', email: texto.trim() });
      }}
      error={erro ?? undefined}
      placeholder="voce@exemplo.com"
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      autoCorrect={false}
      required
    />
  );
}
