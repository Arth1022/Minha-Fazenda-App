import { Alert } from 'react-native';
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
    try {
      await estoqueRepository.adjustQuantity(id, delta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao ajustar quantidade de estoque';
      Alert.alert('Ajuste de Estoque', message);
    }
  };

  return {
    insumos: itens.filter((i: EstoqueItem) => i.categoria === 'insumo'),
    medicamentos: itens.filter((i: EstoqueItem) => i.categoria === 'medicamento'),
    pecas: itens.filter((i: EstoqueItem) => i.categoria === 'peca_maquina'),
    ajustarQuantidade,
  };
}
