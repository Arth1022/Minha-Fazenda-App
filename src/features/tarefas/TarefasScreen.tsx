import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipSelector, CustomInput, SwitchField, type ChipOption } from '@/components/forms';
import {
  AppIcon,
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Header,
  ScreenContainer,
  SegmentedTabs,
  type AppIconName,
  type BadgeVariant,
  type SegmentedTabItem,
} from '@/components/ui';
import { AgroColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  CATEGORIAS_TAREFA,
  useConsultaAoVivo,
  type CategoriaTarefa,
  type StatusTarefa,
  type TarefaOcorrencia,
} from '@/database';
import {
  concluirOcorrencia,
  criarOcorrencia,
  garantirSeedOcorrencias,
  iniciarOcorrencia,
  listarMinhasTarefas,
  listarTodasTarefas,
  pegarTarefa,
  ROTULO_CATEGORIA_TAREFA,
  ROTULO_STATUS_TAREFA,
  TABELAS_OCORRENCIAS,
} from '@/services/ocorrenciaService';
import { listarColaboradores, usuarioAtual } from '@/services/usuario';
import { formatDiaMes } from '@/utils/date';

type AbaPrincipal = 'minhas' | 'todas';
type FiltroRapido = 'todas' | 'sem_responsavel' | 'abertas';

const ABAS: SegmentedTabItem<AbaPrincipal>[] = [
  { key: 'minhas', label: 'Minhas tarefas' },
  { key: 'todas', label: 'Todas as tarefas' },
];

const OPCOES_FILTRO_RAPIDO: ChipOption<FiltroRapido>[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Sem responsável', value: 'sem_responsavel' },
  { label: 'Abertas', value: 'abertas' },
];

const ICONE_CATEGORIA: Record<CategoriaTarefa, AppIconName> = {
  cerca: 'fence',
  animal: 'cow',
  maquina: 'tractor',
  agua: 'milk',
  pasto: 'sprout',
  outro: 'wrench',
};

const OPCOES_CATEGORIA: ChipOption<'todas' | CategoriaTarefa>[] = [
  { label: 'Todas categorias', value: 'todas' },
  ...CATEGORIAS_TAREFA.map((cat) => ({
    label: ROTULO_CATEGORIA_TAREFA[cat],
    value: cat,
  })),
];

const VARIANTE_STATUS: Record<StatusTarefa, BadgeVariant> = {
  aberta: 'warning',
  em_andamento: 'info',
  concluida: 'success',
  cancelada: 'neutral',
};

export default function TarefasScreen() {
  const eu = usuarioAtual();
  const colaboradores = useMemo(() => listarColaboradores(), []);
  const mapaNomes = useMemo(
    () => new Map(colaboradores.map((c) => [c.id, c.nome])),
    [colaboradores]
  );

  const [abaAtiva, setAbaAtiva] = useState<AbaPrincipal>('minhas');
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>('todas');
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | CategoriaTarefa>('todas');
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  // Estado do modal "Relatar problema"
  const [modalVisivel, setModalVisivel] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState<CategoriaTarefa>('cerca');
  const [novaUrgente, setNovaUrgente] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    garantirSeedOcorrencias().catch((err) =>
      console.warn('[Tarefas] Falha ao garantir seed inicial:', err)
    );
  }, []);

  const chaveConsulta = `${abaAtiva}:${eu.id}:${filtroRapido}:${filtroCategoria}`;
  const { dados: listaTarefas, carregado } = useConsultaAoVivo<TarefaOcorrencia[]>(
    () => {
      if (abaAtiva === 'minhas') {
        return listarMinhasTarefas(eu.id);
      }
      return listarTodasTarefas({
        status: filtroRapido === 'abertas' ? 'aberta' : undefined,
        semResponsavel: filtroRapido === 'sem_responsavel' ? true : undefined,
        categoria: filtroCategoria === 'todas' ? undefined : filtroCategoria,
      });
    },
    TABELAS_OCORRENCIAS,
    chaveConsulta,
    []
  );

  const executarAcao = async (id: string, acao: () => Promise<unknown>) => {
    setProcessandoId(id);
    try {
      await acao();
    } catch (erro) {
      Alert.alert(
        'Não foi possível atualizar',
        erro instanceof Error ? erro.message : 'Tente novamente.'
      );
    } finally {
      setProcessandoId(null);
    }
  };

  const abrirModalRelato = () => {
    setNovaCategoria('cerca');
    setNovaUrgente(false);
    setNovaDescricao('');
    setModalVisivel(true);
  };

  const salvarRelato = async () => {
    setSalvando(true);
    try {
      await criarOcorrencia({
        categoria: novaCategoria,
        urgente: novaUrgente,
        descricao: novaDescricao,
        responsavelId: abaAtiva === 'minhas' ? eu.id : null,
        autorId: eu.id,
      });
      setModalVisivel(false);
    } catch (erro) {
      Alert.alert(
        'Erro ao salvar',
        erro instanceof Error ? erro.message : 'Tente novamente.'
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScreenContainer header={<Header title="Tarefas e Ocorrências" showNotification />}>
      <SegmentedTabs tabs={ABAS} activeTab={abaAtiva} onTabChange={setAbaAtiva} />

      {abaAtiva === 'todas' ? (
        <View style={styles.filtrosBloco}>
          <ChipSelector
            label="Situação"
            options={OPCOES_FILTRO_RAPIDO}
            value={filtroRapido}
            onChange={setFiltroRapido}
          />
          <ChipSelector
            label="Categoria"
            options={OPCOES_CATEGORIA}
            value={filtroCategoria}
            onChange={setFiltroCategoria}
          />
        </View>
      ) : null}

      <Pressable
        onPress={abrirModalRelato}
        accessibilityRole="button"
        accessibilityLabel="Relatar problema"
        style={({ pressed }) => [styles.fabInline, pressed && styles.fabPressed]}>
        <View style={styles.fabIconWrap}>
          <AppIcon name="plus" size={20} color={AgroColors.textInverse} />
        </View>
        <View style={styles.fabTextCol}>
          <Text style={styles.fabTitle}>Relatar problema</Text>
          <Text style={styles.fabSubtitle}>Registre uma ocorrência em até 3 toques</Text>
        </View>
        <AppIcon name="chevronRight" size={20} color={AgroColors.textInverse} />
      </Pressable>

      {carregado && listaTarefas.length === 0 ? (
        <EmptyState
          message={
            abaAtiva === 'minhas'
              ? 'Nenhuma tarefa pendente para você no momento.'
              : 'Nenhuma tarefa encontrada para este filtro.'
          }
        />
      ) : null}

      <View style={styles.lista}>
        {listaTarefas.map((tarefa) => {
          const nomeResponsavel = tarefa.responsavelId
            ? (mapaNomes.get(tarefa.responsavelId) ?? tarefa.responsavelId)
            : 'Sem responsável';
          const podePegar = tarefa.status === 'aberta' && tarefa.responsavelId === null;
          const ehResponsavelOuAdmin =
            tarefa.responsavelId === eu.id || eu.papel === 'admin';
          const podeIniciar = tarefa.status === 'aberta' && ehResponsavelOuAdmin && !podePegar;
          const podeConcluir =
            (tarefa.status === 'aberta' || tarefa.status === 'em_andamento') &&
            ehResponsavelOuAdmin &&
            !podePegar;
          const carregandoCard = processandoId === tarefa.id;

          return (
            <Card
              key={tarefa.id}
              style={tarefa.urgente ? [styles.card, styles.cardUrgente] : styles.card}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.categoriaIcone,
                    tarefa.urgente && styles.categoriaIconeUrgente,
                  ]}>
                  <AppIcon
                    name={ICONE_CATEGORIA[tarefa.categoria]}
                    size={20}
                    color={tarefa.urgente ? AgroColors.danger : AgroColors.forest}
                  />
                </View>

                <View style={styles.cardTextos}>
                  <Text style={styles.cardTitulo}>{tarefa.titulo}</Text>
                  <Text style={styles.cardMeta}>
                    {ROTULO_CATEGORIA_TAREFA[tarefa.categoria]} · {nomeResponsavel}
                    {tarefa.prazo ? ` · Prazo ${formatDiaMes(tarefa.prazo)}` : ''}
                  </Text>
                </View>
              </View>

              {tarefa.descricao ? (
                <Text style={styles.cardDescricao}>{tarefa.descricao}</Text>
              ) : null}

              <View style={styles.badgesRow}>
                {tarefa.urgente ? (
                  <Badge label="Urgente" variant="danger" dot />
                ) : null}
                <Badge
                  label={ROTULO_STATUS_TAREFA[tarefa.status]}
                  variant={VARIANTE_STATUS[tarefa.status]}
                />
                {tarefa.syncStatus === 'pendente' ? (
                  <Badge label="Não sincronizado" variant="neutral" />
                ) : null}
              </View>

              {podePegar || podeIniciar || podeConcluir ? (
                <View style={styles.acoesRow}>
                  {podePegar ? (
                    <Button
                      label="Pegar tarefa"
                      size="sm"
                      variant="outline"
                      loading={carregandoCard}
                      onPress={() =>
                        executarAcao(tarefa.id, () => pegarTarefa(tarefa.id, eu.id))
                      }
                      style={styles.botaoAcao}
                    />
                  ) : null}

                  {podeIniciar ? (
                    <Button
                      label="Iniciar"
                      size="sm"
                      variant="secondary"
                      loading={carregandoCard}
                      onPress={() =>
                        executarAcao(tarefa.id, () => iniciarOcorrencia(tarefa.id, eu))
                      }
                      style={styles.botaoAcao}
                    />
                  ) : null}

                  {podeConcluir ? (
                    <Button
                      label="Concluir"
                      size="sm"
                      variant="primary"
                      loading={carregandoCard}
                      leftIcon={
                        <AppIcon name="check" size={16} color={AgroColors.textInverse} />
                      }
                      onPress={() =>
                        executarAcao(tarefa.id, () =>
                          concluirOcorrencia(tarefa.id, { autor: eu })
                        )
                      }
                      style={styles.botaoAcao}
                    />
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>

      <BottomSheet
        visible={modalVisivel}
        title="Relatar problema"
        subtitle="Escolha a categoria do chamado no campo"
        alturaMaxima={0.78}
        onClose={() => setModalVisivel(false)}>
        <View style={styles.modalBody}>
          <Text style={styles.secaoLabel}>Categoria *</Text>
          <View style={styles.gridCategorias}>
            {CATEGORIAS_TAREFA.map((cat) => {
              const selecionada = novaCategoria === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setNovaCategoria(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selecionada }}
                  style={[
                    styles.itemCategoria,
                    selecionada && styles.itemCategoriaAtiva,
                  ]}>
                  <AppIcon
                    name={ICONE_CATEGORIA[cat]}
                    size={26}
                    color={selecionada ? AgroColors.forest : AgroColors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.textoCategoria,
                      selecionada && styles.textoCategoriaAtiva,
                    ]}>
                    {ROTULO_CATEGORIA_TAREFA[cat]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <SwitchField
            label="Urgente"
            helperText="Destaca no topo da lista e notifica o administrador"
            value={novaUrgente}
            onChange={setNovaUrgente}
          />

          <CustomInput
            label="Observação (opcional)"
            placeholder="Ex.: Dois fios arrebentados perto da porteira..."
            value={novaDescricao}
            onChangeText={setNovaDescricao}
            multiline
          />

          <Button
            label="Registrar ocorrência"
            fullWidth
            size="lg"
            loading={salvando}
            onPress={salvarRelato}
          />
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtrosBloco: {
    gap: Spacing.sm,
    backgroundColor: AgroColors.cardBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AgroColors.border,
  },
  fabInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: AgroColors.forest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    ...Shadows.md,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabTextCol: {
    flex: 1,
    gap: 2,
  },
  fabTitle: {
    color: AgroColors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  fabSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12.5,
  },
  lista: {
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  cardUrgente: {
    borderColor: AgroColors.danger,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  categoriaIcone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AgroColors.forestTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriaIconeUrgente: {
    backgroundColor: AgroColors.dangerBg,
  },
  cardTextos: {
    flex: 1,
    gap: 2,
  },
  cardTitulo: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: AgroColors.textPrimary,
  },
  cardMeta: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
  cardDescricao: {
    fontSize: 14,
    lineHeight: 20,
    color: AgroColors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  acoesRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  botaoAcao: {
    flex: 1,
  },
  modalBody: {
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  secaoLabel: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
    fontWeight: '600',
  },
  gridCategorias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  itemCategoria: {
    width: '31%',
    minHeight: 82,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
    backgroundColor: AgroColors.subtleBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    gap: 6,
  },
  itemCategoriaAtiva: {
    backgroundColor: AgroColors.mintBg,
    borderColor: AgroColors.forest,
    borderWidth: 1.5,
  },
  textoCategoria: {
    fontSize: 12.5,
    fontWeight: '600',
    color: AgroColors.textSecondary,
    textAlign: 'center',
  },
  textoCategoriaAtiva: {
    color: AgroColors.forest,
    fontWeight: '700',
  },
});
