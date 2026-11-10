import React, { useState } from 'react';
import { Alert } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { usePastosComOcupacao } from '../hooks/usePastosComOcupacao';
import { EscolherPasto } from './painel/EscolherPasto';

export interface MoverParaPastoSheetProps {
  /** "Mover lote Novilhas", "Mover Estrela" */
  titulo: string;
  subtitulo?: string;
  quantidade: number;
  /** Pasto onde estão agora (sai da lista) */
  origemId: string | null;
  /** Animal sozinho pode ficar sem local definido */
  permitirSemLocal?: boolean;
  /** Grava a mudança; o erro vira aviso e a folha continua aberta */
  onConfirmar: (destinoId: string | null) => Promise<void>;
  onClose: () => void;
}

/**
 * "Mover para…" fora do mapa (tela do lote, ficha do animal): a mesma escolha
 * de pasto da tela 17, numa folha que sobe do rodapé. Monte só quando abrir.
 */
export function MoverParaPastoSheet({
  titulo,
  subtitulo,
  quantidade,
  origemId,
  permitirSemLocal = false,
  onConfirmar,
  onClose,
}: MoverParaPastoSheetProps) {
  const { pastos, ocupacoes } = usePastosComOcupacao();
  const [destinoId, setDestinoId] = useState<string | null | undefined>(undefined);
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    if (destinoId === undefined) return;
    setSalvando(true);
    try {
      await onConfirmar(destinoId);
      onClose();
    } catch (erro) {
      Alert.alert('Não deu certo', erro instanceof Error ? erro.message : 'Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BottomSheet visible title={titulo} subtitle={subtitulo} alturaMaxima={0.75} onClose={onClose}>
      <EscolherPasto
        pastos={pastos.filter((p) => p.id !== origemId)}
        ocupacoes={ocupacoes}
        quantidade={quantidade}
        destinoId={destinoId}
        onDestino={setDestinoId}
        permitirSemLocal={permitirSemLocal && origemId !== null}
        salvando={salvando}
        onConfirmar={confirmar}
      />
    </BottomSheet>
  );
}
