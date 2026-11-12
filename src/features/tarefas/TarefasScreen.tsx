import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ChipSelector, CustomInput, type ChipOption } from '@/components/forms';
import {
  AppIcon,
  Badge,
  BottomSheet,
  Button,
  Card,
  COR_BADGE_SOLIDO,
  EmptyState,
  Header,
  ScreenContainer,
  SegmentedTabs,
  type BadgeVariant,
  type SegmentedTabItem,
} from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  useConsultaAoVivo,
  useLiveQuery,
  type StatusTarefa,
  type TarefaOcorrencia,
} from '@/database';
import { NovoTratamentoForm } from '@/features/rebanho/components/NovoTratamentoForm';
import { listarAnimais } from '@/features/rebanho/data/animais';
import {
  atribuirOcorrencia,
  cancelarOcorrencia,
  concluirOcorrencia,
  garantirSeedOcorrencias,
  iniciarOcorrencia,
  listarMinhasTarefas,
  listarTodasTarefas,
  pegarTarefa,
  ROTULO_CATEGORIA_TAREFA,
  ROTULO_STATUS_TAREFA,
  soltarTarefa,
  TABELAS_OCORRENCIAS,
} from '@/services/ocorrenciaService';
import {
  listarColaboradores,
  podeAtribuirTarefas,
  podeCancelarTarefa,
  podeSoltarTarefa,
  TABELAS_MEMBROS,
  useUsuarioAtual,
  type Usuario,
} from '@/services/usuario';
import { formatDiaMes } from '@/utils/date';
import { ICONE_CATEGORIA_TAREFA } from './categorias';
import { PlayerNotaVozCompacto } from './NotaVozField';
import { useRelatarProblema } from './RelatarProblemaProvider';

type AbaPrincipal = 'minhas' | 'todas';

const ABAS: SegmentedTabItem<AbaPrincipal>[] = [
  { key: 'minhas', label: 'Minhas tarefas' },
  { key: 'todas', label: 'Todas as tarefas' },
];

const VARIANTE_STATUS: Record<StatusTarefa, BadgeVariant> = {
  aberta: 'warning',
  em_andamento: 'info',
  concluida: 'success',
  cancelada: 'neutral',
};

interface CardTarefaProps {
  tarefa: TarefaOcorrencia;
  nomeResponsavel: string;
  euId: string;
  ehAdmin: boolean;
  temEquipe: boolean;
  carregando: boolean;
  onPegar: (id: string) => void;
  onSoltar: (id: string) => void;
  onIniciar: (id: string) => void;
  onConcluir: (tarefa: TarefaOcorrencia) => void;
  onAtribuir: (tarefa: TarefaOcorrencia) => void;
  onCancelar: (tarefa: TarefaOcorrencia) => void;
}

const CardTarefa = React.memo(function CardTarefa({
  tarefa,
  nomeResponsavel,
  euId,
  ehAdmin,
  temEquipe,
  carregando,
  onPegar,
  onSoltar,
  onIniciar,
  onConcluir,
  onAtribuir,
  onCancelar,
}: CardTarefaProps) {
  const usuarioContexto = { id: euId, nome: '', papel: ehAdmin ? ('owner' as const) : ('collaborator' as const) };
  const semDono = tarefa.responsavelId === null;
  const ehDonoOuAdmin = tarefa.responsavelId === euId || ehAdmin;
  const podePegar = tarefa.status === 'aberta' && semDono;
  const podeSoltar = podeSoltarTarefa(tarefa, usuarioContexto);
  const podeIniciar = tarefa.status === 'aberta' && ehDonoOuAdmin && !semDono;
  // Concluir só depois de iniciar: no primeiro contato as opções são Iniciar ou Desistir
  const podeConcluir = tarefa.status === 'em_andamento' && ehDonoOuAdmin && !semDono;
  const podeAtribuir =
    ehAdmin && temEquipe && (tarefa.status === 'aberta' || tarefa.status === 'em_andamento');
  const podeCancelar = podeCancelarTarefa(tarefa, usuarioContexto);

  return (
    <Card
      style={[
        styles.card,
        // Faixa à esquerda na mesma cor do selo de estado (urgente sobrepõe)
        {
          borderLeftColor: tarefa.urgente
            ? COR_BADGE_SOLIDO.danger
            : COR_BADGE_SOLIDO[VARIANTE_STATUS[tarefa.status]],
        },
      ]}>
      <View style={styles.cardHeader}>
        <View
          style={[styles.categoriaIcone, tarefa.urgente && styles.categoriaIconeUrgente]}>
          <AppIcon
            name={ICONE_CATEGORIA_TAREFA[tarefa.categoria]}
            size={22}
            color={AgroColors.textInverse}
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

      {tarefa.descricao ? <Text style={styles.cardDescricao}>{tarefa.descricao}</Text> : null}

      {tarefa.audioUri ? (
        <PlayerNotaVozCompacto audioUri={tarefa.audioUri} />
      ) : null}

      <View style={styles.badgesRow}>
        {tarefa.urgente ? <Badge label="Urgente" variant="danger" dot solid /> : null}
        <Badge
          label={ROTULO_STATUS_TAREFA[tarefa.status]}
          variant={VARIANTE_STATUS[tarefa.status]}
          solid
        />
        {tarefa.maquinaParada ? <Badge label="Máquina parada" variant="danger" solid /> : null}
        {tarefa.audioUri ? <Badge label="Nota de voz" variant="info" /> : null}
        {tarefa.pontoLat !== null && tarefa.pontoLng !== null ? (
          <Badge label="No mapa" variant="info" />
        ) : null}
      </View>

      {/* Todas as ações numa linha só, para economizar espaço */}
      {podePegar || podeIniciar || podeConcluir || podeSoltar || podeAtribuir || podeCancelar ? (
        <View style={styles.acoesRow}>
          {podePegar ? (
            <Button
              label="Pegar tarefa"
              size="sm"
              variant="outline"
              loading={carregando}
              onPress={() => onPegar(tarefa.id)}
              style={styles.botaoAcao}
            />
          ) : null}

          {podeIniciar ? (
            <Button
              label="Iniciar"
              size="sm"
              variant="secondary"
              loading={carregando}
              onPress={() => onIniciar(tarefa.id)}
              style={styles.botaoAcao}
            />
          ) : null}

          {podeConcluir ? (
            <Button
              label="Concluir"
              size="sm"
              variant="primary"
              loading={carregando}
              leftIcon={<AppIcon name="check" size={16} color={AgroColors.textInverse} />}
              onPress={() => onConcluir(tarefa)}
              style={styles.botaoAcao}
            />
          ) : null}

          {podeSoltar ? (
            <Button
              label="Desistir"
              size="sm"
              variant="outline"
              loading={carregando}
              onPress={() => onSoltar(tarefa.id)}
              style={styles.botaoAcao}
            />
          ) : null}

          {podeAtribuir ? (
            <Button
              label={semDono ? 'Atribuir' : 'Reatribuir'}
              size="sm"
              variant="secondary"
              loading={carregando}
              onPress={() => onAtribuir(tarefa)}
              style={styles.botaoAcao}
            />
          ) : null}

          {podeCancelar ? (
            <Button
              label="Cancelar"
              size="sm"
              variant="outline"
              loading={carregando}
              onPress={() => onCancelar(tarefa)}
              style={styles.botaoAcao}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
});

export default function TarefasScreen() {
  const eu = useUsuarioAtual();
  const ehAdmin = podeAtribuirTarefas(eu);
  const relatarProblema = useRelatarProblema();
  // Outras telas (mapa, ficha do animal) pedem o relato por parâmetro de rota
  const { relatarAreaId, relatarAnimalId } = useLocalSearchParams<{
    relatarAreaId?: string;
    relatarAnimalId?: string;
  }>();
  const { data: animaisAtivos } = useLiveQuery(listarAnimais());
  const { dados: colaboradores } = useConsultaAoVivo<Usuario[]>(
    listarColaboradores,
    TABELAS_MEMBROS,
    eu.id,
    [eu]
  );
  const temEquipe = colaboradores.length > 1;
  const mapaNomes = useMemo(
    () => new Map(colaboradores.map((c) => [c.id, c.nome])),
    [colaboradores]
  );

  const [abaAtiva, setAbaAtiva] = useState<AbaPrincipal>('minhas');
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  // Modais de Atribuição (admin) e Cancelamento (com motivo obrigatório)
  const [tarefaParaAtribuir, setTarefaParaAtribuir] = useState<TarefaOcorrencia | null>(null);
  const [tarefaParaCancelar, setTarefaParaCancelar] = useState<TarefaOcorrencia | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Fechamento de ciclo: Animal -> Tratamento no Rebanho
  const [animalParaTratamento, setAnimalParaTratamento] = useState<{
    id: string;
    identificacao: string;
  } | null>(null);
  const [modalPerguntaTratamento, setModalPerguntaTratamento] = useState(false);
  const [modalFormTratamento, setModalFormTratamento] = useState(false);

  useEffect(() => {
    garantirSeedOcorrencias().catch((err) =>
      console.warn('[Tarefas] Falha ao garantir seed inicial:', err)
    );
  }, []);

  useEffect(() => {
    if (!relatarAreaId && !relatarAnimalId) return;
    router.setParams({ relatarAreaId: undefined, relatarAnimalId: undefined });
    relatarProblema({ areaId: relatarAreaId, animalId: relatarAnimalId });
  }, [relatarAreaId, relatarAnimalId, relatarProblema]);

  const chaveConsulta = `${abaAtiva}:${eu.id}`;
  const { dados: listaTarefas, carregado } = useConsultaAoVivo<TarefaOcorrencia[]>(
    () => (abaAtiva === 'minhas' ? listarMinhasTarefas(eu.id) : listarTodasTarefas()),
    TABELAS_OCORRENCIAS,
    chaveConsulta,
    []
  );

  const executarAcao = useCallback(async (id: string, acao: () => Promise<unknown>) => {
    setProcessandoId(id);
    try {
      await acao();
      return true;
    } catch (erro) {
      Alert.alert(
        'Não foi possível atualizar',
        erro instanceof Error ? erro.message : 'Tente novamente.'
      );
      return false;
    } finally {
      setProcessandoId(null);
    }
  }, []);

  const handlePegar = useCallback(
    (id: string) => {
      void executarAcao(id, () => pegarTarefa(id, eu.id));
    },
    [executarAcao, eu.id]
  );
  const handleSoltar = useCallback(
    (id: string) => {
      void executarAcao(id, () => soltarTarefa(id, eu.id));
    },
    [executarAcao, eu.id]
  );
  const handleIniciar = useCallback(
    (id: string) => {
      void executarAcao(id, () => iniciarOcorrencia(id, eu));
    },
    [executarAcao, eu]
  );
  const handleConcluir = useCallback(
    async (tarefa: TarefaOcorrencia) => {
      const ok = await executarAcao(tarefa.id, () => concluirOcorrencia(tarefa.id, { autor: eu }));
      if (!ok) return;

      if (tarefa.categoria === 'animal' || tarefa.animalId) {
        const animalVinc = tarefa.animalId
          ? animaisAtivos.find((a) => a.id === tarefa.animalId)
          : animaisAtivos[0];
        if (animalVinc) {
          const identificacao = animalVinc.nome
            ? `${animalVinc.nome} (#${animalVinc.brinco})`
            : `Brinco #${animalVinc.brinco}`;
          setAnimalParaTratamento({ id: animalVinc.id, identificacao });
          setModalPerguntaTratamento(true);
        }
      }
    },
    [executarAcao, eu, animaisAtivos]
  );
  const handleAbrirAtribuir = useCallback((tarefa: TarefaOcorrencia) => {
    setTarefaParaAtribuir(tarefa);
  }, []);
  const handleSelecionarResponsavelAtribuicao = useCallback(
    async (valor: string) => {
      if (!tarefaParaAtribuir) return;
      const alvo = tarefaParaAtribuir;
      const responsavelId = valor === 'nenhum' ? null : valor;
      setTarefaParaAtribuir(null);
      await executarAcao(alvo.id, () => atribuirOcorrencia(alvo.id, responsavelId, eu));
    },
    [tarefaParaAtribuir, executarAcao, eu]
  );
  const handleAbrirCancelar = useCallback((tarefa: TarefaOcorrencia) => {
    setMotivoCancelamento('');
    setTarefaParaCancelar(tarefa);
  }, []);
  const handleConfirmarCancelamento = useCallback(async () => {
    if (!tarefaParaCancelar) return;
    const alvo = tarefaParaCancelar;
    const ok = await executarAcao(alvo.id, () =>
      cancelarOcorrencia(alvo.id, motivoCancelamento, eu)
    );
    if (ok) {
      setTarefaParaCancelar(null);
      setMotivoCancelamento('');
    }
  }, [tarefaParaCancelar, motivoCancelamento, executarAcao, eu]);

  const opcoesResponsavel = useMemo<ChipOption<string>[]>(
    () => [
      { label: 'Sem responsável', value: 'nenhum' },
      ...colaboradores.map((c) => ({
        label: c.id === eu.id ? `${c.nome} (você)` : c.nome,
        value: c.id,
      })),
    ],
    [colaboradores, eu.id]
  );

  return (
    <ScreenContainer header={<Header title="Tarefas e Ocorrências" />}>
      <SegmentedTabs tabs={ABAS} activeTab={abaAtiva} onTabChange={setAbaAtiva} />

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
        {listaTarefas.map((tarefa) => (
          <CardTarefa
            key={tarefa.id}
            tarefa={tarefa}
            nomeResponsavel={
              tarefa.responsavelId
                ? (mapaNomes.get(tarefa.responsavelId) ?? tarefa.responsavelId)
                : 'Sem responsável'
            }
            euId={eu.id}
            ehAdmin={ehAdmin}
            temEquipe={temEquipe}
            carregando={processandoId === tarefa.id}
            onPegar={handlePegar}
            onSoltar={handleSoltar}
            onIniciar={handleIniciar}
            onConcluir={handleConcluir}
            onAtribuir={handleAbrirAtribuir}
            onCancelar={handleAbrirCancelar}
          />
        ))}
      </View>

      <BottomSheet
        visible={modalPerguntaTratamento}
        title="Deseja registrar tratamento no Rebanho?"
        subtitle={
          animalParaTratamento
            ? `Ocorrência concluída para ${animalParaTratamento.identificacao}. Deseja agendar remédio ou vacina agora?`
            : 'Deseja agendar remédio ou vacina para o animal agora?'
        }
        onClose={() => setModalPerguntaTratamento(false)}>
        <View style={styles.acoesRow}>
          <Button
            label="Agora não"
            variant="secondary"
            onPress={() => setModalPerguntaTratamento(false)}
            style={styles.botaoAcao}
          />
          <Button
            label="Registrar tratamento"
            variant="primary"
            onPress={() => {
              setModalPerguntaTratamento(false);
              setModalFormTratamento(true);
            }}
            style={styles.botaoAcao}
          />
        </View>
      </BottomSheet>

      <NovoTratamentoForm
        visible={modalFormTratamento}
        animalId={animalParaTratamento?.id}
        identificacao={animalParaTratamento?.identificacao ?? ''}
        onClose={() => setModalFormTratamento(false)}
      />

      <BottomSheet
        visible={tarefaParaAtribuir !== null}
        title="Atribuir responsável"
        subtitle={tarefaParaAtribuir?.titulo ?? 'Escolha quem ficará responsável pela tarefa'}
        onClose={() => setTarefaParaAtribuir(null)}>
        <View style={styles.modalBody}>
          <ChipSelector
            label="Responsável"
            options={opcoesResponsavel}
            value={tarefaParaAtribuir?.responsavelId ?? 'nenhum'}
            onChange={(valor) => void handleSelecionarResponsavelAtribuicao(valor)}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={tarefaParaCancelar !== null}
        title="Cancelar tarefa"
        subtitle={tarefaParaCancelar?.titulo ?? 'Informe o motivo do cancelamento'}
        onClose={() => setTarefaParaCancelar(null)}>
        <View style={styles.modalBody}>
          <CustomInput
            label="Motivo do cancelamento *"
            placeholder="Ex.: Problema resolvido antes ou relatado por engano..."
            value={motivoCancelamento}
            onChangeText={setMotivoCancelamento}
            multiline
          />
          <View style={styles.acoesRow}>
            <Button
              label="Voltar"
              variant="secondary"
              onPress={() => setTarefaParaCancelar(null)}
              style={styles.botaoAcao}
            />
            <Button
              label="Confirmar cancelamento"
              variant="primary"
              loading={
                tarefaParaCancelar !== null && processandoId === tarefaParaCancelar.id
              }
              onPress={() => void handleConfirmarCancelamento()}
              style={styles.botaoAcao}
            />
          </View>
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: Spacing.md,
  },
  // Card liso: sem a sombra (no Android vira um brilho em volta da borda)
  // Card forte sem sombra (no Android a sombra vira brilho): borda grossa e faixa de estado
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1.5,
    borderColor: AgroColors.borderStrong,
    borderLeftWidth: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  categoriaIcone: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: AgroColors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriaIconeUrgente: {
    backgroundColor: AgroColors.danger,
  },
  cardTextos: {
    flex: 1,
    gap: 2,
  },
  cardTitulo: {
    ...Typography.bodyBold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: AgroColors.textPrimary,
  },
  cardMeta: {
    ...Typography.caption,
    fontWeight: '600',
    color: AgroColors.textSecondary,
  },
  cardDescricao: {
    fontSize: 14.5,
    lineHeight: 20,
    color: AgroColors.textPrimary,
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
});
