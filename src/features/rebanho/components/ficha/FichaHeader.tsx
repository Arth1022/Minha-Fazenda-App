import React from 'react';

import { FichaTopo, type AbaFichaTopo } from '@/components/ui';
import type { FichaAnimal } from '@/dtos';
import { FASE_LABEL, SITUACAO_LEITE_LABEL } from '../../services/fase';
import { AnimalAvatar } from '../AnimalAvatar';

export type AbaFicha = 'resumo' | 'saude' | 'reproducao';

export interface FichaHeaderProps {
  ficha: FichaAnimal;
  aba: AbaFicha;
  onAbaChange: (aba: AbaFicha) => void;
  /** Doses de hoje ainda não aplicadas: número ao lado de "Saúde" */
  pendentesHoje: number;
  /** Lápis do topo: abre a edição do cadastro */
  onEditar: () => void;
  /** Mostra o QR Code do animal (para imprimir) */
  onVerQrCode: () => void;
}

/**
 * Topo verde da Ficha do animal: voltar, identificação (nome, brinco, fase,
 * raça, idade) e as abas Resumo / Saúde / Reprodução (essa só para novilha e vaca).
 */
export function FichaHeader({
  ficha,
  aba,
  onAbaChange,
  pendentesHoje,
  onEditar,
  onVerQrCode,
}: FichaHeaderProps) {
  const { animal, fase, idade, situacaoLeite, podeReproduzir } = ficha;
  const subtitulo = [
    FASE_LABEL[fase],
    animal.raca,
    idade,
    situacaoLeite ? SITUACAO_LEITE_LABEL[situacaoLeite] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const abas: AbaFichaTopo<AbaFicha>[] = [
    { key: 'resumo', label: 'Resumo' },
    { key: 'saude', label: 'Saúde', contador: pendentesHoje },
    ...(podeReproduzir ? [{ key: 'reproducao' as const, label: 'Reprodução' }] : []),
  ];

  return (
    <FichaTopo
      titulo="Ficha do animal"
      avatar={<AnimalAvatar size={60} variant="translucido" />}
      // Sem nome, o brinco vira o título; com nome, a etiqueta leva só o número (cabe na linha)
      nome={animal.nome || `Brinco ${animal.brinco}`}
      etiqueta={animal.nome ? animal.brinco : null}
      subtitulo={subtitulo}
      acoes={[
        { icone: 'qrcode', label: 'Ver QR Code do animal', onPress: onVerQrCode },
        { icone: 'edit', label: 'Editar animal', onPress: onEditar },
      ]}
      abas={abas}
      aba={aba}
      onAbaChange={onAbaChange}
    />
  );
}
