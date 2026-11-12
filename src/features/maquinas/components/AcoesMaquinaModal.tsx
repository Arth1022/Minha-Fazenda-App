import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FormModal } from '@/components/forms';
import { Button, InfoBanner } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { MaquinaComUso } from '@/dtos';
import { CONDICAO_LABEL, TIPO_MAQUINA_LABEL } from '../constants';
import { useFluxosMaquina, type FluxoMaquina } from '../hooks/useFluxosMaquina';
import { useMaquinaComUso } from '../hooks/useMaquinaComUso';
import { useSituacaoMaquina, type SituacaoMaquina } from '../hooks/useSituacaoMaquina';
import { ehImplemento } from '../services/padroes';
import { horaCurta } from '../services/uso';
import { MaquinaAvatar } from './MaquinaAvatar';
import { TempoDecorrido } from './TempoDecorrido';

export interface AcoesMaquinaModalProps {
  /** Máquina lida no QR Code; null fecha o modal */
  maquinaId: string | null;
  onClose: () => void;
}

/**
 * Folha de ações do QR da máquina: um toque leva ao registro já com a máquina
 * certa (Ligar ou Desligar, Abastecer, Horímetro, Problema, Ver ficha). Mostra
 * quem está usando e oferece "Assumir" na troca de turno.
 */
export function AcoesMaquinaModal({ maquinaId, onClose }: AcoesMaquinaModalProps) {
  const maquina = useMaquinaComUso(maquinaId);
  const situacao = useSituacaoMaquina(maquina);
  const fluxos = useFluxosMaquina();

  return (
    <>
      <FormModal
        visible={maquinaId !== null}
        title={maquina?.nome ?? 'Máquina'}
        subtitle="Lida pelo QR Code"
        onClose={onClose}>
        {maquina ? (
          <Conteudo maquina={maquina} situacao={situacao} fluxos={fluxos} onClose={onClose} />
        ) : (
          <ActivityIndicator color={AgroColors.primary} />
        )}
      </FormModal>
      {fluxos.modais}
    </>
  );
}

interface ConteudoProps {
  maquina: MaquinaComUso;
  situacao: SituacaoMaquina;
  fluxos: ReturnType<typeof useFluxosMaquina>;
  onClose: () => void;
}

function Conteudo({ maquina, situacao, fluxos, onClose }: ConteudoProps) {
  const router = useRouter();
  const { usoAberto, deOutraPessoa, condicao, engatadoEm } = situacao;
  const implemento = ehImplemento(maquina);
  const meuUso = usoAberto !== null && !deOutraPessoa;
  const descricao = [TIPO_MAQUINA_LABEL[maquina.tipo], maquina.marca, maquina.modelo]
    .filter(Boolean)
    .join(' · ');

  // A folha fecha e o registro abre já com a máquina certa
  const abrir = (fluxo: FluxoMaquina) => {
    onClose();
    fluxos.abrir(fluxo, maquina, { usoAberto, condicao, deOutraPessoa });
  };
  const verFicha = () => {
    onClose();
    router.push({ pathname: '/maquina/[id]', params: { id: maquina.id } });
  };
  const relatarProblema = () => {
    onClose();
    router.push({ pathname: '/estoque', params: { relatarMaquinaId: maquina.id } });
  };
  const verUso = () => {
    onClose();
    router.push('/maquina/em-uso');
  };
  const desligar = () => {
    onClose();
    fluxos.desligar(maquina);
  };

  return (
    <View style={styles.conteudo}>
      <View style={styles.perfil}>
        <MaquinaAvatar tipo={maquina.tipo} marca={maquina.marca} size={52} variant="mint" />
        <View style={styles.textos}>
          <Text style={styles.descricao} numberOfLines={1}>
            {descricao}
          </Text>
          <Situacao situacao={situacao} />
        </View>
      </View>

      {condicao === 'paradaPorProblema' ? (
        <InfoBanner message="Parada por problema: há um defeito em aberto que impede o uso." />
      ) : condicao === 'atencao' ? (
        <InfoBanner variant="info" message="Atenção: há problema relatado nesta máquina." />
      ) : null}

      <View style={styles.acoes}>
        {implemento ? (
          <Text style={styles.aviso}>
            {engatadoEm
              ? `Engatado em ${engatadoEm.nome}. O uso vem da máquina que o puxa.`
              : 'Implemento: escolha-o ao ligar a máquina que vai puxá-lo.'}
          </Text>
        ) : meuUso ? (
          <Button
            label="Desligar"
            variant="danger"
            size="lg"
            fullWidth
            loading={fluxos.ocupado}
            onPress={desligar}
          />
        ) : maquina.status === 'inativa' ? (
          <Text style={styles.aviso}>Máquina inativa: não pode ser ligada.</Text>
        ) : (
          <Button
            label={deOutraPessoa ? 'Assumir' : 'Ligar'}
            variant="primary"
            size="lg"
            fullWidth
            loading={fluxos.ocupado}
            onPress={() => abrir('ligar')}
          />
        )}

        <View style={styles.grade}>
          {!implemento ? (
            <Button label="Abastecer" variant="outline" onPress={() => abrir('abastecer')} style={styles.metade} />
          ) : null}
          {maquina.possuiHorimetro ? (
            <Button label="Horímetro" variant="outline" onPress={() => abrir('horimetro')} style={styles.metade} />
          ) : null}
          <Button label="Problema" variant="outline" onPress={relatarProblema} style={styles.metade} />
          <Button label="Ver ficha" variant="outline" onPress={verFicha} style={styles.metade} />
        </View>
        {meuUso ? <Button label="Ver uso em andamento" variant="ghost" onPress={verUso} /> : null}
      </View>
    </View>
  );
}

function Situacao({ situacao }: { situacao: SituacaoMaquina }) {
  const { usoAberto, deOutraPessoa, condicao } = situacao;
  if (usoAberto && deOutraPessoa) {
    return (
      <Text style={styles.emUso}>
        Em uso por {usoAberto.operador ?? 'outra pessoa'} desde {horaCurta(usoAberto.inicio)}
      </Text>
    );
  }
  if (usoAberto) {
    return (
      <View style={styles.linha}>
        <Text style={styles.emUso}>Em uso por você há </Text>
        <TempoDecorrido desde={usoAberto.inicio} style={styles.emUso} />
      </View>
    );
  }
  const alerta = condicao === 'paradaPorProblema' || condicao === 'atencao';
  return (
    <Text style={[styles.parada, alerta && styles.alerta]}>
      {condicao === 'ok' ? 'Parada' : CONDICAO_LABEL[condicao]}
    </Text>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: Spacing.lg,
  },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  descricao: {
    ...Typography.caption,
  },
  linha: {
    flexDirection: 'row',
  },
  emUso: {
    ...Typography.captionBold,
    color: AgroColors.primary,
  },
  parada: {
    ...Typography.caption,
  },
  alerta: {
    ...Typography.captionBold,
    color: AgroColors.warning,
  },
  acoes: {
    gap: Spacing.sm,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metade: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  aviso: {
    ...Typography.caption,
    color: AgroColors.warning,
    textAlign: 'center',
  },
});
