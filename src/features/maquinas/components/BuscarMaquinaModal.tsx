import React from 'react';

import { BuscaModal, ResultadoBuscaItem } from '@/components/forms';
import type { MaquinaComUso } from '@/dtos';
import { TIPO_MAQUINA_LABEL } from '../constants';
import { buscarMaquinas } from '../services/busca';
import { MaquinaAvatar } from './MaquinaAvatar';

function contagem(total: number, buscando: boolean): string {
  if (total === 0) return buscando ? 'Nenhuma máquina encontrada' : 'Nenhuma máquina cadastrada';
  if (buscando) return total === 1 ? '1 máquina encontrada' : `${total} máquinas encontradas`;
  return total === 1 ? '1 máquina na frota' : `${total} máquinas na frota`;
}

/** "Trator · Valtra · Em uso" */
function detalhe(maquina: MaquinaComUso): string {
  return [TIPO_MAQUINA_LABEL[maquina.tipo], maquina.marca, maquina.usoAtual ? 'Em uso' : null]
    .filter(Boolean)
    .join(' · ');
}

export interface BuscarMaquinaModalProps {
  visible: boolean;
  /** Frota inteira: a busca não depende do filtro aberto */
  maquinas: MaquinaComUso[];
  onClose: () => void;
  onSelect: (maquina: MaquinaComUso) => void;
}

/** Busca na frota por nome, marca, modelo ou tipo (usa o BuscaModal do app). */
export function BuscarMaquinaModal({ visible, maquinas, onClose, onSelect }: BuscarMaquinaModalProps) {
  return (
    <BuscaModal
      visible={visible}
      title="Buscar máquina"
      subtitle="Por nome, marca ou modelo, em toda a frota"
      placeholder="Ex: Trator ou Valtra"
      itens={maquinas}
      buscar={buscarMaquinas}
      keyExtractor={(maquina) => maquina.id}
      contagem={contagem}
      onClose={onClose}
      onSelect={onSelect}
      renderItem={(maquina, escolher) => (
        <ResultadoBuscaItem
          avatar={<MaquinaAvatar tipo={maquina.tipo} marca={maquina.marca} size={36} />}
          titulo={maquina.nome}
          detalhe={detalhe(maquina)}
          onPress={escolher}
        />
      )}
    />
  );
}
