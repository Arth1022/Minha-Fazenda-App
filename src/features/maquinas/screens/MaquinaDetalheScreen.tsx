import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { AppIcon, Button, EmptyState, FichaTopo, Header, ScreenContainer } from '@/components/ui';
import { AgroColors } from '@/constants/theme';
import { CONDICAO_LABEL, TIPO_MAQUINA_LABEL } from '../constants';
import { DadosMaquinaTab } from '../components/ficha/DadosMaquinaTab';
import { HistoricoMaquinaTab } from '../components/ficha/HistoricoMaquinaTab';
import { ResumoMaquinaTab } from '../components/ficha/ResumoMaquinaTab';
import { MaquinaAvatar } from '../components/MaquinaAvatar';
import { NovaAnotacaoForm } from '../components/NovaAnotacaoForm';
import { NovaMaquinaForm } from '../components/NovaMaquinaForm';
import { QrCodeMaquinaModal } from '../components/QrCodeMaquinaModal';
import { useAnotacoesMaquina, useFichaMaquina } from '../hooks/useFichaMaquina';
import { useFluxosMaquina, type FluxoMaquina } from '../hooks/useFluxosMaquina';
import { useSituacaoMaquina } from '../hooks/useSituacaoMaquina';
import { ehImplemento } from '../services/padroes';

type AbaMaquina = 'resumo' | 'historico' | 'dados';

const ABAS = [
  { key: 'resumo' as const, label: 'Resumo' },
  { key: 'historico' as const, label: 'Histórico' },
  { key: 'dados' as const, label: 'Dados' },
];

/**
 * Ficha da máquina: topo verde com a identificação e as abas Resumo (situação,
 * uso na semana e registros), Histórico (tudo o que aconteceu, por dia) e
 * Dados (cadastro e anotações). O rodapé liga, desliga ou assume a máquina.
 */
export default function MaquinaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ficha = useFichaMaquina(id);
  const anotacoes = useAnotacoesMaquina(id);
  const situacao = useSituacaoMaquina(ficha?.maquina ?? null);
  const fluxos = useFluxosMaquina();
  const [aba, setAba] = useState<AbaMaquina>('resumo');
  const [anotacaoVisivel, setAnotacaoVisivel] = useState(false);
  const [qrVisivel, setQrVisivel] = useState(false);
  const [editando, setEditando] = useState(false);

  if (!ficha) {
    return (
      <ScreenContainer withTabInset={false} header={<Header title="Ficha da máquina" showBack />}>
        <EmptyState message="Carregando máquina..." />
      </ScreenContainer>
    );
  }

  const { maquina } = ficha;
  const implemento = ehImplemento(maquina);
  const { usoAberto, deOutraPessoa, condicao } = situacao;
  const emUso = usoAberto !== null || situacao.engatadoEm !== null;
  const meuUso = usoAberto !== null && !deOutraPessoa;
  const abrir = (fluxo: FluxoMaquina) => fluxos.abrir(fluxo, maquina, { usoAberto, condicao, deOutraPessoa });

  const subtitulo = [TIPO_MAQUINA_LABEL[maquina.tipo], maquina.marca, maquina.modelo].filter(Boolean).join(' · ');
  const etiqueta = emUso ? 'Em uso' : condicao === 'ok' ? (implemento ? 'Parado' : 'Parada') : CONDICAO_LABEL[condicao];

  // Implemento não liga sozinho (vem engatado no trator); inativa não liga
  let rodape: React.ReactNode = null;
  if (!implemento && meuUso) {
    rodape = (
      <Button
        label="Desligar"
        variant="danger"
        size="lg"
        fullWidth
        loading={fluxos.ocupado}
        leftIcon={<AppIcon name="power" size={22} color={AgroColors.textInverse} />}
        onPress={() => fluxos.desligar(maquina)}
      />
    );
  } else if (!implemento && maquina.status !== 'inativa') {
    rodape = (
      <Button
        label={deOutraPessoa ? 'Assumir' : 'Ligar'}
        variant="primary"
        size="lg"
        fullWidth
        loading={fluxos.ocupado}
        leftIcon={<AppIcon name="power" size={22} color={AgroColors.textInverse} />}
        onPress={() => abrir('ligar')}
      />
    );
  }

  return (
    <ScreenContainer
      withTabInset={false}
      header={
        <FichaTopo
          titulo="Ficha da máquina"
          avatar={<MaquinaAvatar tipo={maquina.tipo} marca={maquina.marca} size={60} variant="translucido" />}
          nome={maquina.nome}
          etiqueta={etiqueta}
          etiquetaTom={!emUso && (condicao === 'paradaPorProblema' || condicao === 'atencao') ? 'alerta' : 'padrao'}
          subtitulo={subtitulo}
          acoes={[
            { icone: 'scanQr', label: 'Ver QR Code da máquina', onPress: () => setQrVisivel(true) },
            { icone: 'edit', label: 'Editar máquina', onPress: () => setEditando(true) },
          ]}
          abas={ABAS}
          aba={aba}
          onAbaChange={setAba}
        />
      }
      footer={rodape}>
      {aba === 'resumo' ? <ResumoMaquinaTab ficha={ficha} situacao={situacao} onRegistrar={abrir} /> : null}

      {aba === 'historico' ? (
        <HistoricoMaquinaTab maquinaId={maquina.id} usos={ficha.usosRecentes} implemento={implemento} />
      ) : null}

      {aba === 'dados' ? (
        <DadosMaquinaTab
          ficha={ficha}
          anotacoes={anotacoes}
          onEditar={() => setEditando(true)}
          onAdicionarAnotacao={() => setAnotacaoVisivel(true)}
        />
      ) : null}

      <NovaAnotacaoForm
        visible={anotacaoVisivel}
        maquinaId={maquina.id}
        nome={maquina.nome}
        usoId={meuUso ? usoAberto.id : null}
        onClose={() => setAnotacaoVisivel(false)}
      />

      {/* Montado só aberto: cada abertura começa com os dados atuais do cadastro */}
      {editando ? (
        <NovaMaquinaForm
          visible
          maquina={maquina}
          onClose={() => setEditando(false)}
          onCreated={() => setEditando(false)}
        />
      ) : null}

      <QrCodeMaquinaModal visible={qrVisivel} maquina={maquina} onClose={() => setQrVisivel(false)} />
      {fluxos.modais}
    </ScreenContainer>
  );
}
