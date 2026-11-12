import { useEffect, useState } from 'react';
import { Alert, Share } from 'react-native';

import { useConsultaAoVivo } from '@/database';
import { limparFazendaAtiva, renomearFazenda, useFazendaAtiva, usePapel } from '@/features/fazenda';
import { listarMembros, TABELAS_MEMBROS, useUsuarioAtual, type MembroDaFazenda } from '@/services/usuario';
import { mensagemDoErro } from '@/shared/api';
import {
  codigoConviteValido,
  gerarCodigoConvite,
  mudarPapel,
  removerMembro,
  sairDaFazenda,
  type CodigoConvite,
} from './servicoConvite';

function confirmar(titulo: string, mensagem: string, rotulo: string): Promise<boolean> {
  return new Promise((resolver) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: rotulo, style: 'destructive', onPress: () => resolver(true) },
    ]);
  });
}

/**
 * Membros da fazenda ativa e as ações de cada papel. Os botões de dono ficam
 * escondidos para o colaborador, mas quem garante a regra é a API.
 */
export function useMembros() {
  const { fazenda } = useFazendaAtiva();
  const papel = usePapel();
  const eu = useUsuarioAtual();
  const ehDono = papel === 'owner';
  const { dados: membros, carregado } = useConsultaAoVivo<MembroDaFazenda[]>(
    listarMembros,
    TABELAS_MEMBROS,
    fazenda?.id ?? '',
    []
  );

  const [codigo, setCodigo] = useState<CodigoConvite | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const executar = async (acao: () => Promise<void>, sucesso?: string) => {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      await acao();
      if (sucesso) setAviso(sucesso);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  };

  const fazendaId = fazenda?.id ?? '';

  // O dono voltou para a tela: mostra o código que ainda vale (se houver)
  useEffect(() => {
    if (!ehDono || !fazendaId) return;
    let ativo = true;
    codigoConviteValido(fazendaId).then(
      (atual) => ativo && setCodigo(atual),
      () => undefined
    );
    return () => {
      ativo = false;
    };
  }, [ehDono, fazendaId]);

  return {
    fazenda,
    membros,
    carregado,
    euId: eu.id,
    ehDono,
    codigo,
    ocupado,
    erro,
    aviso,
    /** Código novo: 6 caracteres, vale 24 horas e para uma pessoa só. */
    gerarCodigo: () => executar(async () => setCodigo(await gerarCodigoConvite(fazendaId))),
    compartilhar: async () => {
      if (!codigo) return;
      await Share.share({ message: codigo.mensagem || `Entre na minha fazenda: ${codigo.codigo}` }).catch(
        () => undefined
      );
    },
    promover: (membro: MembroDaFazenda) =>
      executar(() => mudarPapel(fazendaId, membro.id, 'owner'), `${membro.nome} agora é dono.`),
    rebaixar: (membro: MembroDaFazenda) =>
      executar(() => mudarPapel(fazendaId, membro.id, 'collaborator'), `${membro.nome} agora é colaborador.`),
    remover: async (membro: MembroDaFazenda) => {
      const ok = await confirmar('Remover da fazenda', `Remover ${membro.nome} da fazenda?`, 'Remover');
      if (ok) await executar(() => removerMembro(fazendaId, membro.id), `${membro.nome} saiu da fazenda.`);
    },
    sair: async () => {
      const ok = await confirmar('Sair da fazenda', `Sair de ${fazenda?.nome ?? 'esta fazenda'}?`, 'Sair');
      if (!ok) return;
      await executar(async () => {
        await sairDaFazenda(fazendaId);
        limparFazendaAtiva();
      });
    },
    renomear: (nome: string) => executar(() => renomearFazenda(fazendaId, nome), 'Nome alterado. Ele aparece depois do sync.'),
  };
}
