import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useFazendaAtiva } from '@/features/fazenda';
import { inicializarMaquinas, ouvirRespostasDeAviso } from '@/features/maquinas';
import { aoTocarNotificacao, configurarNotificacoes } from '@/services/notificacoes';

/**
 * Tarefas de inicialização que precisam do banco pronto: notificações (canais,
 * exibição com o app aberto e o toque abrindo a tela certa) e, com uma fazenda
 * aberta, o uso de máquina que ficou aberto nela. Não desenha nada.
 */
export function InicializacaoDoApp() {
  const router = useRouter();
  const fazendaId = useFazendaAtiva().fazenda?.id ?? null;

  useEffect(() => {
    configurarNotificacoes().catch(() => undefined);
    const pararDeOuvirAvisos = ouvirRespostasDeAviso();
    // Toque na notificação abre a tela dela (ex.: o uso da máquina em andamento)
    const pararDeOuvirToques = aoTocarNotificacao((dados) => {
      if (typeof dados.url === 'string') router.push(dados.url as Href);
    });
    return () => {
      pararDeOuvirAvisos();
      pararDeOuvirToques();
    };
  }, [router]);

  // O uso de máquina aberto é da fazenda: confere de novo ao trocar de fazenda
  useEffect(() => {
    if (fazendaId) inicializarMaquinas().catch(() => undefined);
  }, [fazendaId]);

  return null;
}
