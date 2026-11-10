import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, type Talhao } from '@/database';
import { listarLotes, TABELAS_LOTES, type LoteResumo } from '@/services/loteService';
import { moverAnimais, moverLote } from '@/services/movimentacaoService';
import { CoresTexto } from '../elementos';
import { gruposPorLote, type OcupacaoArea } from '../../services/ocupacao';
import { CabecalhoPainel } from './elementosPainel';
import { EscolherPasto } from './EscolherPasto';
import type { AnimalNoPasto } from './ResumoPasto';

/** O que vai sair do pasto: um lote inteiro, os sem lote ou todos que estão nele. */
type Grupo = { tipo: 'lote'; loteId: string } | { tipo: 'semLote' } | { tipo: 'todos' };

export interface MoverDoPastoProps {
  area: Talhao;
  animais: readonly AnimalNoPasto[];
  /** Pastos da fazenda (o de origem é tirado da lista) */
  pastos: readonly Talhao[];
  ocupacoes: ReadonlyMap<string, OcupacaoArea>;
  /** Pasto escolhido como destino, para o mapa destacar com tracejado */
  onDestaque: (areaId: string | null) => void;
  onFechar: () => void;
  onErro: (mensagem: string) => void;
}

/**
 * "Mover lote Novilhas" (protótipo, tela 17). Mover um lote leva o lote
 * inteiro (inclusive quem está fora do pasto dele) e vira o pasto do lote.
 */
export function MoverDoPasto({
  area,
  animais,
  pastos,
  ocupacoes,
  onDestaque,
  onFechar,
  onErro,
}: MoverDoPastoProps) {
  const { dados: lotes } = useConsultaAoVivo<LoteResumo[]>(() => listarLotes(), TABELAS_LOTES, 'lotes', []);
  const grupos = useMemo(() => gruposPorLote(animais), [animais]);
  const maiorLote = grupos.find((g) => g.loteId !== null)?.loteId ?? null;
  const [grupo, setGrupo] = useState<Grupo>(
    maiorLote ? { tipo: 'lote', loteId: maiorLote } : { tipo: 'todos' }
  );
  const [destinoId, setDestinoId] = useState<string | undefined>(undefined);
  const [salvando, setSalvando] = useState(false);

  const destinos = useMemo(() => pastos.filter((p) => p.id !== area.id), [pastos, area.id]);
  const lote = grupo.tipo === 'lote' ? lotes.find((l) => l.id === grupo.loteId) : undefined;
  // Lote: vai o lote inteiro; senão, os animais do grupo que estão aqui
  const idsDoGrupo =
    grupo.tipo === 'todos'
      ? animais.map((a) => a.id)
      : grupo.tipo === 'semLote'
        ? animais.filter((a) => !a.loteId).map((a) => a.id)
        : animais.filter((a) => a.loteId === grupo.loteId).map((a) => a.id);
  const quantidade = lote ? lote.animais : idsDoGrupo.length;

  const titulo =
    grupo.tipo === 'lote'
      ? `Mover lote ${lote?.nome ?? ''}`.trim()
      : grupo.tipo === 'semLote'
        ? 'Mover animais sem lote'
        : `Mover animais do ${area.nome}`;
  const subtitulo = `${quantidade === 1 ? '1 animal' : `${quantidade} animais`} · hoje no ${area.nome}`;

  const escolherDestino = (id: string | null) => {
    if (id === null) return;
    setDestinoId(id);
    onDestaque(id);
  };

  const fechar = () => {
    onDestaque(null);
    onFechar();
  };

  const mover = async () => {
    if (!destinoId) return;
    setSalvando(true);
    try {
      if (grupo.tipo === 'lote') await moverLote(grupo.loteId, destinoId);
      else await moverAnimais({ animalIds: idsDoGrupo, destinoId });
      fechar();
    } catch (erro) {
      onErro(erro instanceof Error ? erro.message : 'Não foi possível mover os animais.');
    } finally {
      setSalvando(false);
    }
  };

  // Mais de um grupo no pasto: escolhe o que vai (o maior lote vem marcado)
  const opcoes: { chave: string; rotulo: string; grupo: Grupo }[] =
    grupos.length > 1
      ? [
          ...grupos.map((g) =>
            g.loteId
              ? { chave: g.loteId, rotulo: g.nome, grupo: { tipo: 'lote', loteId: g.loteId } as Grupo }
              : { chave: 'sem-lote', rotulo: `Sem lote (${g.quantidade})`, grupo: { tipo: 'semLote' } as Grupo }
          ),
          { chave: 'todos', rotulo: `Todos (${animais.length})`, grupo: { tipo: 'todos' } },
        ]
      : [];
  const chaveAtual = grupo.tipo === 'lote' ? grupo.loteId : grupo.tipo === 'semLote' ? 'sem-lote' : 'todos';

  return (
    <>
      <CabecalhoPainel titulo={titulo} subtitulo={subtitulo} onFechar={fechar} />
      {opcoes.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.grupos}>
          {opcoes.map((opcao) => {
            const ativa = opcao.chave === chaveAtual;
            return (
              <Pressable
                key={opcao.chave}
                onPress={() => setGrupo(opcao.grupo)}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativa }}
                style={[estilos.grupo, ativa && estilos.grupoAtivo]}>
                <Text style={[estilos.grupoTexto, ativa && estilos.grupoTextoAtivo]}>{opcao.rotulo}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <EscolherPasto
        pastos={destinos}
        ocupacoes={ocupacoes}
        quantidade={quantidade}
        destinoId={destinoId}
        onDestino={escolherDestino}
        salvando={salvando}
        onConfirmar={mover}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  grupos: { gap: Spacing.sm },
  grupo: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: '#D5DAD6',
    backgroundColor: AgroColors.cardBg,
  },
  grupoAtivo: { backgroundColor: AgroColors.forest, borderColor: AgroColors.forest },
  grupoTexto: { fontSize: 14.5, fontWeight: '600', color: CoresTexto.escuro },
  grupoTextoAtivo: { color: AgroColors.textInverse, fontWeight: '700' },
});
