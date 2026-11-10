import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CustomInput, FormModal } from '@/components/forms';
import { AppIcon } from '@/components/ui';
import { AgroColors, IconSize, Spacing, Typography } from '@/constants/theme';
import { useConsultaAoVivo } from '@/database';
import { CaixaMarcar, identificacaoAnimal } from '@/features/mapa';
import { salvarAnimaisDoLote } from '@/services/loteService';
import { animaisComLocal, TABELAS_ANIMAIS_COM_LOCAL } from '@/services/movimentacaoService';
import { buscarAnimais } from '../../services/busca';

type AnimalComLocal = Awaited<ReturnType<typeof animaisComLocal>>[number];

export interface AnimaisDoLoteSheetProps {
  loteId: string;
  nomeLote: string;
  onClose: () => void;
}

/**
 * "Adicionar" na tela do lote (RF-015): o rebanho com caixinhas, os do lote já
 * marcados. Marcar põe no lote (tirando de outro lote); desmarcar tira.
 */
export function AnimaisDoLoteSheet({ loteId, nomeLote, onClose }: AnimaisDoLoteSheetProps) {
  const { height } = useWindowDimensions();
  const { dados: rebanho, carregado } = useConsultaAoVivo<AnimalComLocal[]>(
    () => animaisComLocal(),
    TABELAS_ANIMAIS_COM_LOCAL,
    'lote-membros',
    []
  );
  const [termo, setTermo] = useState('');
  // Começa com os que já são do lote; depois é a escolha da pessoa
  const [marcados, setMarcados] = useState<ReadonlySet<string> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const doLote = useMemo(
    () => new Set(rebanho.filter((a) => a.loteId === loteId).map((a) => a.id)),
    [rebanho, loteId]
  );
  const escolhidos = marcados ?? doLote;
  const encontrados = useMemo(() => buscarAnimais(rebanho, termo), [rebanho, termo]);

  const alternar = (id: string) => {
    const novo = new Set(escolhidos);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setMarcados(novo);
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(undefined);
    try {
      await salvarAnimaisDoLote(loteId, [...escolhidos]);
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <FormModal
      visible
      title={`Animais do lote ${nomeLote}`}
      subtitle={escolhidos.size === 1 ? '1 animal marcado' : `${escolhidos.size} animais marcados`}
      onClose={onClose}
      onSubmit={salvar}
      submitLabel="Salvar"
      loading={salvando}
      scrollable={false}>
      <CustomInput
        value={termo}
        onChangeText={setTermo}
        placeholder="Nome ou brinco"
        autoCorrect={false}
        leftIcon={<AppIcon name="search" size={IconSize.md} color={AgroColors.textMuted} />}
      />
      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
      <FlatList
        data={encontrados}
        keyExtractor={(a) => a.id}
        style={{ height: Math.round(height * 0.45) }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          carregado ? <Text style={estilos.vazio}>Nenhum animal com esse nome ou brinco.</Text> : undefined
        }
        renderItem={({ item, index }) => {
          const outroLote = item.loteId && item.loteId !== loteId ? `Lote ${item.loteNome}` : null;
          return (
            <Pressable
              onPress={() => alternar(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: escolhidos.has(item.id) }}
              style={({ pressed }) => [estilos.linha, index > 0 && estilos.divisor, pressed && estilos.pressionado]}>
              <CaixaMarcar marcada={escolhidos.has(item.id)} />
              <View style={estilos.textos}>
                <Text style={estilos.nome} numberOfLines={1}>
                  {identificacaoAnimal(item)}
                </Text>
                <Text style={estilos.detalhe} numberOfLines={1}>
                  {[item.areaNome ?? 'Sem local', outroLote].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </FormModal>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  pressionado: { opacity: 0.75 },
  textos: { flex: 1, gap: 2 },
  nome: { ...Typography.bodyBold, fontSize: 16 },
  detalhe: { ...Typography.caption, fontSize: 13.5 },
  vazio: { ...Typography.caption, fontSize: 14, paddingVertical: Spacing.md },
  erro: { ...Typography.captionBold, color: AgroColors.danger },
});
