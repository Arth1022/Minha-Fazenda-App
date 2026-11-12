import React, { useState } from 'react';

import { CustomInput } from '@/components/forms';
import type { Credencial } from './servicoConta';

export interface CredencialFormProps {
  /** Devolve o objeto `credencial` a cada mudança */
  onChange: (credencial: Credencial) => void;
  erro?: string | null;
  erroSenha?: string | null;
  /** Cadastro: mostra a regra da senha */
  novaSenha?: boolean;
}

/** Campos da credencial do login e do cadastro: e-mail e senha → `{ tipo: "senha", email, senha }`. */
export function CredencialForm({ onChange, erro, erroSenha, novaSenha = false }: CredencialFormProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  return (
    <>
      <CustomInput
        label="E-mail"
        value={email}
        onChangeText={(texto) => {
          setEmail(texto);
          onChange({ tipo: 'senha', email: texto.trim(), senha });
        }}
        error={erro ?? undefined}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        required
      />
      <CustomInput
        label="Senha"
        value={senha}
        onChangeText={(texto) => {
          setSenha(texto);
          onChange({ tipo: 'senha', email: email.trim(), senha: texto });
        }}
        error={erroSenha ?? undefined}
        helperText={novaSenha ? 'Pelo menos 8 caracteres' : undefined}
        isPassword
        autoCapitalize="none"
        autoComplete={novaSenha ? 'new-password' : 'current-password'}
        autoCorrect={false}
        required
      />
    </>
  );
}
