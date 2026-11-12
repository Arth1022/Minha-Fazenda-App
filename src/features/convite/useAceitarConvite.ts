import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { definirFazendaAtiva } from '@/features/fazenda';
import { useEstadoDaConta } from '@/services/usuario';
import { ehErroApi, mensagemDoErro } from '@/shared/api';
import { guardarConvite, esquecerConvite } from './conviteGuardado';
import { aceitarConvite } from './servicoConvite';

export type SituacaoConvite = 'aceitando' | 'expirado' | 'erro' | 'sem-conta';

/**
 * Link do convite (`minhafazenda://convite/<token>`): logado, aceita e abre a
 * fazenda; deslogado, guarda o token e vai para as boas-vindas (o cadastro ou
 * o login usam o token). `410` mostra que o convite expirou.
 */
export function useAceitarConvite(token: string | undefined) {
  const router = useRouter();
  const estado = useEstadoDaConta();
  const [resultado, setResultado] = useState<SituacaoConvite>('aceitando');
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (!token || estado === 'carregando') return;
    if (estado === 'deslogado') {
      guardarConvite(token);
      router.replace('/boas-vindas');
      return;
    }
    // Sem conta não aceita convite (ver `situacao` abaixo)
    if (estado === 'sem-conta') return;
    let ativo = true;
    aceitarConvite(token).then(
      ({ fazendaId }) => {
        esquecerConvite();
        definirFazendaAtiva(fazendaId);
        // A lista mostra "abrindo" até a fazenda descer pelo sync, e então abre nela
        if (ativo) router.replace('/fazendas');
      },
      (erro: unknown) => {
        if (!ativo) return;
        if (ehErroApi(erro) && erro.status === 410) {
          esquecerConvite();
          setResultado('expirado');
        } else {
          setResultado('erro');
          setMensagem(mensagemDoErro(erro));
        }
      }
    );
    return () => {
      ativo = false;
    };
  }, [token, estado, router]);

  // TODO(decisao): criar conta a partir do modo sem conta (e levar os dados) fica fora desta entrega
  const situacao: SituacaoConvite = estado === 'sem-conta' ? 'sem-conta' : resultado;
  return { situacao, mensagem };
}
