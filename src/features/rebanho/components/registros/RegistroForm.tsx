import React from 'react';

import type { Animal } from '@/dtos';
import type { TipoRegistro } from '../ficha/RegistrarMenu';
import { CoberturaForm } from './CoberturaForm';
import { LeiteForm } from './LeiteForm';
import { PartoForm } from './PartoForm';
import { PesagemForm } from './PesagemForm';
import { SaidaForm } from './SaidaForm';

export interface RegistroFormProps {
  /** O tratamento tem formulário próprio (NovoTratamentoForm) */
  tipo: Exclude<TipoRegistro, 'tratamento'>;
  animalId: string;
  /** Machos do rebanho, para escolher o touro da cobertura */
  touros: Animal[];
  onClose: () => void;
}

/**
 * Abre o mini-formulário do registro escolhido no menu "Registrar" da ficha.
 * Renderize só enquanto estiver aberto: cada abertura começa com campos limpos.
 */
export function RegistroForm({ tipo, animalId, touros, onClose }: RegistroFormProps) {
  switch (tipo) {
    case 'pesagem':
      return <PesagemForm animalId={animalId} onClose={onClose} />;
    case 'leite':
      return <LeiteForm animalId={animalId} onClose={onClose} />;
    case 'cobertura':
      return <CoberturaForm animalId={animalId} touros={touros} onClose={onClose} />;
    case 'parto':
      return <PartoForm maeId={animalId} onClose={onClose} />;
    case 'saida':
      return <SaidaForm animalId={animalId} onClose={onClose} />;
  }
}
