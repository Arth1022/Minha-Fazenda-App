import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import {
  BotaoConta,
  CampoConta,
  CoresConta,
  ErroConta,
  FotoConta,
  OpcaoConta,
  PassosConta,
  PerguntaComLink,
  TelaConta,
  TituloConta,
} from './componentes';
import { useCadastro } from './useCadastro';

/** Criar conta em dois passos (você → sua fazenda); a lógica fica em useCadastro. */
export default function CadastroScreen() {
  const router = useRouter();
  const c = useCadastro();
  const noPasso2 = c.passo === 2;

  // Voltar do Android no passo 2 volta ao passo 1 (sem perder o que foi digitado)
  const { voltar } = c;
  useEffect(() => {
    if (!noPasso2) return;
    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      voltar();
      return true;
    });
    return () => inscricao.remove();
  }, [noPasso2, voltar]);

  const fechar = () => (router.canGoBack() ? router.back() : router.replace('/boas-vindas'));

  if (!noPasso2) {
    return (
      <TelaConta
        canto={{ icone: 'x', rotulo: 'Fechar', onPress: fechar }}
        rodape={
          <>
            <BotaoConta rotulo="Continuar" onPress={c.avancar} />
            <PerguntaComLink pergunta="Já tem conta?" link="Entrar" onPress={() => router.replace('/entrar')} />
          </>
        }>
        <PassosConta atual={1} total={2} />
        <TituloConta titulo="Criar conta" />
        <FotoConta fotoUri={c.fotoUri} onEscolher={c.escolherFoto} onRemover={c.tirarFoto} />
        <CampoConta
          rotulo="Seu nome"
          value={c.nome}
          onChangeText={c.setNome}
          erro={c.erros.nome}
          maxLength={60}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
        />
        <CampoConta
          rotulo="E-mail"
          value={c.email}
          onChangeText={c.setEmail}
          erro={c.erros.email}
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          returnKeyType="next"
        />
        <CampoConta
          rotulo="Senha"
          senha
          value={c.senha}
          onChangeText={c.setSenha}
          erro={c.erros.senha}
          ajuda="Pelo menos 8 caracteres"
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={c.avancar}
        />
        <ErroConta mensagem={c.erroGeral} />
      </TelaConta>
    );
  }

  return (
    <TelaConta
      canto={{ icone: 'arrowLeft', rotulo: 'Voltar ao passo 1', onPress: c.voltar }}
      rodape={<BotaoConta rotulo="Criar conta" onPress={c.concluir} carregando={c.enviando} />}>
      <PassosConta atual={2} total={2} />
      {c.comLink ? (
        // Veio pelo link de convite: a fazenda já está escolhida
        <TituloConta titulo="Sua fazenda" subtitulo="Você vai entrar na fazenda de quem te convidou." />
      ) : (
        <>
          <TituloConta titulo="Sua fazenda" subtitulo="Crie a sua ou entre na de quem te convidou." />
          <View style={estilos.opcoes} accessibilityRole="radiogroup">
            <OpcaoConta
              icone="home"
              titulo="Criar minha fazenda"
              descricao="Você será o dono"
              selecionada={c.escolha === 'criar'}
              onPress={() => c.setEscolha('criar')}
            />
            <OpcaoConta
              icone="key"
              titulo="Tenho um código"
              descricao="Entrar na fazenda de alguém"
              selecionada={c.escolha === 'codigo'}
              onPress={() => c.setEscolha('codigo')}
            />
          </View>
          {c.escolha === 'criar' ? (
            <CampoConta
              rotulo="Nome da fazenda"
              value={c.nomeFazenda}
              onChangeText={c.setNomeFazenda}
              erro={c.erros.nomeFazenda}
              placeholder="Ex.: Sítio Boa Vista"
              maxLength={100}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={c.concluir}
            />
          ) : (
            <View style={estilos.codigo}>
              <CampoConta
                rotulo="Código de convite"
                value={c.codigoConvite}
                onChangeText={c.setCodigoConvite}
                erro={c.erros.codigoConvite}
                placeholder="K7M2QX"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={c.concluir}
                estiloTexto={estilos.codigoTexto}
              />
              <Text style={estilos.codigoAjuda}>Peça o código ao dono da fazenda.</Text>
            </View>
          )}
        </>
      )}
      <ErroConta mensagem={c.erroGeral} />
    </TelaConta>
  );
}

const estilos = StyleSheet.create({
  opcoes: { gap: 14 },
  codigo: { gap: 6 },
  codigoTexto: { fontSize: 24, fontWeight: '700', letterSpacing: 6 },
  codigoAjuda: { fontSize: 14, color: CoresConta.texto },
});
