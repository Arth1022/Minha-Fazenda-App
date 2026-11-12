import { useRouter } from 'expo-router';
import React from 'react';

import { BotaoConta, CampoConta, ErroConta, FotoConta, TelaConta, TituloConta } from './componentes';
import { useSemConta } from './useSemConta';

/**
 * Entrar sem conta: o aviso ("Usar só neste celular?") fica nas boas-vindas;
 * aqui vêm o perfil e a fazenda locais.
 * TODO(decisao): migrar os dados do modo sem conta ao criar conta (fora desta entrega).
 */
export default function SemContaScreen() {
  const router = useRouter();
  const s = useSemConta();
  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/boas-vindas'));

  return (
    <TelaConta
      canto={{ icone: 'arrowLeft', rotulo: 'Voltar', onPress: voltar }}
      rodape={<BotaoConta rotulo="Começar" onPress={s.concluir} carregando={s.salvando} />}>
      <TituloConta titulo="Seu perfil" subtitulo="Os dados ficam só neste celular." />
      <FotoConta fotoUri={s.fotoUri} onEscolher={s.escolherFoto} onRemover={s.tirarFoto} />
      <CampoConta
        rotulo="Seu nome"
        value={s.nome}
        onChangeText={s.setNome}
        erro={s.erros.nome}
        maxLength={60}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
      />
      <CampoConta
        rotulo="Nome da fazenda"
        value={s.nomeFazenda}
        onChangeText={s.setNomeFazenda}
        erro={s.erros.nomeFazenda}
        placeholder="Ex.: Sítio Boa Vista"
        maxLength={100}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={s.concluir}
      />
      <ErroConta mensagem={s.erroGeral} />
    </TelaConta>
  );
}
