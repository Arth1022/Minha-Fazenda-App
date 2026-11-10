import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, type Talhao } from '@/database';
import { buscarAnimais } from '@/features/rebanho/services/busca';
import { listarLotes, TABELAS_LOTES, type LoteResumo } from '@/services/loteService';
import {
  animaisComLocal,
  moverAnimais,
  moverLote,
  TABELAS_ANIMAIS_COM_LOCAL,
} from '@/services/movimentacaoService';
import { BotaoMapa, CoresTexto } from '../elementos';
import { identificacaoAnimal } from '../../services/ocupacao';
import { CabecalhoPainel, CaixaMarcar, SeletorSegmentado } from './elementosPainel';

type Aba = 'animais' | 'lotes';

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'animais', rotulo: 'Animais' },
  { valor: 'lotes', rotulo: 'Lotes' },
];

type AnimalComLocal = Awaited<ReturnType<typeof animaisComLocal>>[number];

export interface ColocarNoPastoProps {
  area: Talhao;
  /** Teclado aberto: a lista encolhe para o botão continuar à vista */
  tecladoAberto: boolean;
  onFechar: () => void;
  onErro: (mensagem: string) => void;
}

/**
 * "Colocar no Pasto 1" (protótipo, tela 18): escolher animais soltos (com
 * busca por nome ou brinco) ou lotes inteiros. Quem já está no pasto não aparece.
 */
export function ColocarNoPasto({ area, tecladoAberto, onFechar, onErro }: ColocarNoPastoProps) {
  const { height } = useWindowDimensions();
  const [aba, setAba] = useState<Aba>('animais');
  const [termo, setTermo] = useState('');
  const [animaisMarcados, setAnimaisMarcados] = useState<ReadonlySet<string>>(new Set());
  const [lotesMarcados, setLotesMarcados] = useState<ReadonlySet<string>>(new Set());
  const [salvando, setSalvando] = useState(false);

  const { dados: rebanho } = useConsultaAoVivo<AnimalComLocal[]>(
    () => animaisComLocal(),
    TABELAS_ANIMAIS_COM_LOCAL,
    'colocar',
    []
  );
  const { dados: lotes } = useConsultaAoVivo<LoteResumo[]>(() => listarLotes(), TABELAS_LOTES, 'lotes', []);

  const candidatos = useMemo(() => rebanho.filter((a) => a.areaId !== area.id), [rebanho, area.id]);
  const encontrados = useMemo(() => buscarAnimais(candidatos, termo), [candidatos, termo]);
  const lotesComAnimais = useMemo(() => lotes.filter((l) => l.animais > 0), [lotes]);

  const quantidade =
    aba === 'animais'
      ? animaisMarcados.size
      : lotesComAnimais.filter((l) => lotesMarcados.has(l.id)).reduce((soma, l) => soma + l.animais, 0);
  const alturaLista = Math.round(tecladoAberto ? height * 0.22 : height * 0.34);

  const alternar = (conjunto: ReadonlySet<string>, id: string) => {
    const novo = new Set(conjunto);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    return novo;
  };

  const colocar = async () => {
    setSalvando(true);
    try {
      if (aba === 'animais') {
        await moverAnimais({ animalIds: [...animaisMarcados], destinoId: area.id });
      } else {
        for (const loteId of lotesMarcados) await moverLote(loteId, area.id);
      }
      onFechar();
    } catch (erro) {
      onErro(erro instanceof Error ? erro.message : 'Não foi possível colocar os animais.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <CabecalhoPainel titulo={`Colocar no ${area.nome}`} onFechar={onFechar} />
      <SeletorSegmentado opcoes={ABAS} valor={aba} onChange={setAba} />

      {aba === 'animais' ? (
        <>
          <View style={estilos.busca}>
            <AppIcon name="search" size={20} color={CoresTexto.suave} />
            <TextInput
              value={termo}
              onChangeText={setTermo}
              placeholder="Nome ou brinco"
              placeholderTextColor={CoresTexto.suave}
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Buscar animal por nome ou brinco"
              style={estilos.buscaTexto}
            />
          </View>
          <FlatList
            data={encontrados}
            keyExtractor={(a) => a.id}
            style={{ maxHeight: alturaLista }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={estilos.vazio}>
                {termo ? 'Nenhum animal com esse nome ou brinco.' : 'Todo o rebanho já está neste pasto.'}
              </Text>
            }
            renderItem={({ item, index }) => (
              <Linha
                titulo={identificacaoAnimal(item)}
                detalhe={[item.areaNome ?? 'Sem local', item.loteNome ? `Lote ${item.loteNome}` : null]
                  .filter(Boolean)
                  .join(' · ')}
                marcada={animaisMarcados.has(item.id)}
                divisor={index > 0}
                onPress={() => setAnimaisMarcados((atual) => alternar(atual, item.id))}
              />
            )}
          />
        </>
      ) : (
        <FlatList
          data={lotesComAnimais}
          keyExtractor={(l) => l.id}
          style={{ maxHeight: alturaLista }}
          ListEmptyComponent={
            <Text style={estilos.vazio}>Nenhum lote com animais. Crie lotes no Rebanho (é opcional).</Text>
          }
          renderItem={({ item, index }) => {
            const jaAqui = item.areaId === area.id;
            return (
              <Linha
                titulo={`Lote ${item.nome}`}
                detalhe={[
                  item.animais === 1 ? '1 animal' : `${item.animais} animais`,
                  jaAqui ? 'já está aqui' : (item.areaNome ?? 'sem local'),
                ].join(' · ')}
                marcada={lotesMarcados.has(item.id)}
                desabilitada={jaAqui}
                divisor={index > 0}
                onPress={() => setLotesMarcados((atual) => alternar(atual, item.id))}
              />
            );
          }}
        />
      )}

      <BotaoMapa
        rotulo={quantidade === 1 ? 'Colocar 1 animal' : `Colocar ${quantidade} animais`}
        desabilitado={quantidade === 0}
        carregando={salvando}
        onPress={colocar}
      />
    </>
  );
}

function Linha({
  titulo,
  detalhe,
  marcada,
  desabilitada = false,
  divisor,
  onPress,
}: {
  titulo: string;
  detalhe: string;
  marcada: boolean;
  desabilitada?: boolean;
  divisor: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitada}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada, disabled: desabilitada }}
      style={({ pressed }) => [
        estilos.linha,
        divisor && estilos.linhaDivisor,
        desabilitada && estilos.desabilitada,
        pressed && estilos.pressionado,
      ]}>
      <CaixaMarcar marcada={marcada} />
      <View style={estilos.linhaTextos}>
        <Text style={estilos.linhaTitulo} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={estilos.linhaDetalhe} numberOfLines={1}>
          {detalhe}
        </Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  busca: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.three,
    borderWidth: 1.5,
    borderColor: '#D5DAD6',
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.cardBg,
  },
  buscaTexto: { flex: 1, fontSize: 16, color: CoresTexto.escuro, paddingVertical: 10 },
  vazio: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave, paddingVertical: Spacing.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  linhaDivisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  linhaTextos: { flex: 1, gap: 2 },
  linhaTitulo: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: CoresTexto.escuro },
  linhaDetalhe: { fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
  desabilitada: { opacity: 0.45 },
  pressionado: { opacity: 0.75 },
});
