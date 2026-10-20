import { useEffect, useState } from 'react';
import EstoqueItem from '@/entities/EstoqueItem';
import { estoqueRepository } from './EstoqueRepository';

export function useEstoque() {
  const [itens, setItens] = useState<EstoqueItem[]>([]);

  useEffect(() => {
    const subscription = estoqueRepository.observeAll().subscribe(setItens);
    return () => subscription.unsubscribe();
  }, []);

  const ajustarQuantidade = async (id: string, delta: number) => {
    await estoqueRepository.adjustQuantity(id, delta);
  };

  return {
    insumos: itens.filter((i: EstoqueItem) => i.categoria === 'insumo'),
    medicamentos: itens.filter((i: EstoqueItem) => i.categoria === 'medicamento'),
    pecas: itens.filter((i: EstoqueItem) => i.categoria === 'peca_maquina'),
    ajustarQuantidade,
  };
}
