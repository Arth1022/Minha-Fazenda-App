import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import type { Maquina, UsoMaquina } from '@/dtos';
import { encerrarUso, iniciarUso } from '../data/usos';
import { publicarStatusMaquina } from '../services/statusRemoto';
import { duracaoDoUso, formatarDuracao } from '../services/uso';

type MaquinaControlavel = Pick<Maquina, 'id' | 'codigo' | 'nome'> & {
  usoAtual: UsoMaquina | null;
};

/**
 * Liga e desliga máquinas (auditoria de uso). Pede confirmação, grava o uso e
 * avisa a API (statusRemoto). `ocupadaId` é a máquina com gravação em curso.
 * As funções são estáveis entre renders (servem a cards memorizados).
 */
export function useControleUso() {
  const [ocupadaId, setOcupadaId] = useState<string | null>(null);

  const executar = useCallback(
    async (maquina: MaquinaControlavel, acao: () => Promise<UsoMaquina>, emUso: boolean) => {
      setOcupadaId(maquina.id);
      try {
        await acao();
        // Sem await: falha de rede nunca desfaz nem trava o uso já gravado
        publicarStatusMaquina({
          maquinaId: maquina.id,
          codigo: maquina.codigo,
          emUso,
          em: new Date(),
        }).catch(() => undefined);
      } catch (erro) {
        Alert.alert(
          'Não foi possível registrar',
          erro instanceof Error ? erro.message : 'Tente novamente.'
        );
      } finally {
        setOcupadaId(null);
      }
    },
    []
  );

  const ligar = useCallback(
    (maquina: MaquinaControlavel) => {
      Alert.alert(
        `Ligar ${maquina.nome}?`,
        'A máquina ficará em uso e o tempo começa a contar agora.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ligar', onPress: () => executar(maquina, () => iniciarUso(maquina.id), true) },
        ]
      );
    },
    [executar]
  );

  const desligar = useCallback(
    (maquina: MaquinaControlavel, usoAtual: UsoMaquina) => {
      const tempo = formatarDuracao(duracaoDoUso(usoAtual, new Date()));
      Alert.alert(`Desligar ${maquina.nome}?`, `Tempo de uso: ${tempo}.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desligar',
          style: 'destructive',
          onPress: () => executar(maquina, () => encerrarUso(maquina.id), false),
        },
      ]);
    },
    [executar]
  );

  /**
   * Liga a parada, desliga a que está em uso. Sem `confirmar` grava direto: para
   * quando a própria tela já é a confirmação (ex.: modal aberto pelo QR Code).
   */
  const alternar = useCallback(
    (maquina: MaquinaControlavel, { confirmar = true }: { confirmar?: boolean } = {}) => {
      if (!confirmar) {
        if (maquina.usoAtual) executar(maquina, () => encerrarUso(maquina.id), false);
        else executar(maquina, () => iniciarUso(maquina.id), true);
      } else if (maquina.usoAtual) desligar(maquina, maquina.usoAtual);
      else ligar(maquina);
    },
    [executar, ligar, desligar]
  );

  return { alternar, ocupadaId };
}
