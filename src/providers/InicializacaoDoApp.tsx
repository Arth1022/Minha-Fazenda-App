import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { inicializarMaquinas, ouvirRespostasDeAviso } from '@/features/maquinas';
import { aoTocarNotificacao, configurarNotificacoes } from '@/services/notificacoes';
import { preencherPerimetrosPendentes } from '@/services/talhaoService';

/**
 * Tarefas de inicialização que precisam do banco pronto: notificações (canais,
 * exibição com o app aberto e o toque abrindo a tela certa), o uso de máquina
 * que ficou aberto e o perímetro das áreas antigas. Não desenha nada.
 */
export function InicializacaoDoApp() {
  const router = useRouter();

  useEffect(() => {
    configurarNotificacoes().catch(() => undefined);
    inicializarMaquinas().catch(() => undefined);
    preencherPerimetrosPendentes().catch(() => undefined);
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

  return null;
}
