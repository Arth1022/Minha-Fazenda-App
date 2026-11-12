import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BotaoConta, CampoConta, ErroConta, LinkConta, PerguntaComLink, TelaConta, TituloConta } from './componentes';
import { avisarEsqueciSenha } from './semEndpoint';
import { useEntrar } from './useEntrar';

/** Login com e-mail e senha; a lógica fica em useEntrar. */
export default function EntrarScreen() {
  const router = useRouter();
  const e = useEntrar();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const fechar = () => (router.canGoBack() ? router.back() : router.replace('/boas-vindas'));

  return (
    <TelaConta
      canto={{ icone: 'x', rotulo: 'Fechar', onPress: fechar }}
      rodape={
        <PerguntaComLink pergunta="Não tem conta?" link="Criar conta" onPress={() => router.replace('/cadastro')} />
      }>
      <TituloConta titulo="Entrar" subtitulo="Com o e-mail e a senha da sua conta." />

      <CampoConta
        rotulo="E-mail"
        icone="mail"
        value={email}
        onChangeText={(texto) => {
          setEmail(texto);
          e.setCredencial({ tipo: 'senha', email: texto.trim(), senha });
        }}
        erro={e.erroEmail}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        returnKeyType="next"
      />
      <View style={estilos.senha}>
        <CampoConta
          rotulo="Senha"
          icone="lock"
          senha
          value={senha}
          onChangeText={(texto) => {
            setSenha(texto);
            e.setCredencial({ tipo: 'senha', email: email.trim(), senha: texto });
          }}
          erro={e.erroSenha}
          autoCapitalize="none"
          autoComplete="current-password"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={e.concluir}
        />
        <LinkConta texto="Esqueci a senha" onPress={avisarEsqueciSenha} style={estilos.esqueci} />
      </View>

      <ErroConta mensagem={e.erroGeral} />
      <BotaoConta rotulo="Entrar" onPress={e.concluir} carregando={e.enviando} style={estilos.entrar} />
    </TelaConta>
  );
}

const estilos = StyleSheet.create({
  senha: { gap: 18 },
  esqueci: { alignSelf: 'flex-end' },
  entrar: { marginTop: 6 },
});
