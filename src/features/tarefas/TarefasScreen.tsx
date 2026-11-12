import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipSelector, CustomInput, type ChipOption } from '@/components/forms';
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
  type BadgeVariant,
  type SegmentedTabItem,
} from '@/components/ui';
import { AgroColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  CATEGORIAS_TAREFA,
  useConsultaAoVivo,
  useLiveQuery,
  type CategoriaTarefa,
  type StatusTarefa,
  type TarefaOcorrencia,
} from '@/database';
import { listarMaquinas } from '@/features/maquinas/data/maquinas';
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
  resolverQrCodeParaOcorrencia,
  ROTULO_CATEGORIA_TAREFA,
  ROTULO_STATUS_TAREFA,
  soltarTarefa,
  TABELAS_OCORRENCIAS,
} from '@/services/ocorrenciaService';
import { useLeitorQrCode } from '@/services/qrcode';
import { listarTalhoesAtivos } from '@/services/talhaoService';
import {
  listarColaboradores,
  podeAtribuirTarefas,
  podeCancelarOuEditarTarefa,
  podeSoltarTarefa,
  TABELAS_MEMBROS,
  useUsuarioAtual,
  type Usuario,
} from '@/services/usuario';
import { formatDiaMes } from '@/utils/date';
import { PlayerNotaVozCompacto } from './NotaVozField';
import { ICONE_CATEGORIA_TAREFA, useRelatarProblema } from './RelatarProblemaProvider';

export { ICONE_CATEGORIA_TAREFA };

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
  const podeConcluir =
    (tarefa.status === 'aberta' || tarefa.status === 'em_andamento') && ehDonoOuAdmin && !semDono;
  const podeAtribuir =
    ehAdmin && temEquipe && (tarefa.status === 'aberta' || tarefa.status === 'em_andamento');
  const podeCancelar = podeCancelarOuEditarTarefa(tarefa, usuarioContexto);

  return (
    <Card style={tarefa.urgente ? [styles.card, styles.cardUrgente] : styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[styles.categoriaIcone, tarefa.urgente && styles.categoriaIconeUrgente]}>
          <AppIcon
            name={ICONE_CATEGORIA_TAREFA[tarefa.categoria]}
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

      {tarefa.descricao ? <Text style={styles.cardDescricao}>{tarefa.descricao}</Text> : null}

      {tarefa.audioUri ? (
        <PlayerNotaVozCompacto audioUri={tarefa.audioUri} />
      ) : null}

      <View style={styles.badgesRow}>
        {tarefa.urgente ? <Badge label="Urgente" variant="danger" dot /> : null}
        <Badge
          label={ROTULO_STATUS_TAREFA[tarefa.status]}
          variant={VARIANTE_STATUS[tarefa.status]}
        />
        {tarefa.maquinaParada ? <Badge label="Máquina parada" variant="danger" /> : null}
        {tarefa.audioUri ? <Badge label="Nota de voz" variant="info" /> : null}
        {tarefa.pontoLat !== null && tarefa.pontoLng !== null ? (
          <Badge label="No mapa" variant="info" />
        ) : null}
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
        </View>
      ) : null}

      {podeSoltar || podeAtribuir || podeCancelar ? (
        <View style={styles.acoesRow}>
          {podeSoltar ? (
            <Button
              label="Soltar"
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
  const lerQrCode = useLeitorQrCode();
  const abrirModalRelato = useRelatarProblema();
  const { relatarAreaId, relatarAnimalId, relatarMaquinaId } = useLocalSearchParams<{
    relatarAreaId?: string;
    relatarAnimalId?: string;
    relatarMaquinaId?: string;
  }>();
  const { data: talhoes } = useLiveQuery(listarTalhoesAtivos());
  const { data: animaisAtivos } = useLiveQuery(listarAnimais());
  const { data: listaMaquinas } = useLiveQuery(listarMaquinas());
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
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>('todas');
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | CategoriaTarefa>('todas');
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

  const escanearQrParaOcorrencia = useCallback(async () => {
    const valor = await lerQrCode({
      titulo: 'Ler QR Code de Animal ou Máquina',
    });
    if (!valor) return;
    const alvo = await resolverQrCodeParaOcorrencia(valor);
    if (!alvo) {
      Alert.alert(
        'QR Code não encontrado',
        'Nenhum animal ou máquina cadastrado corresponde a este QR Code.'
      );
      return;
    }
    await abrirModalRelato({
      alvoQr: alvo,
      responsavelPadraoId: abaAtiva === 'minhas' ? eu.id : null,
    });
  }, [lerQrCode, abrirModalRelato, abaAtiva, eu.id]);

  useEffect(() => {
    if (relatarAreaId && talhoes.length > 0) {
      const alvo = talhoes.find((t) => t.id === relatarAreaId);
      if (alvo) {
        router.setParams({ relatarAreaId: undefined });
        void abrirModalRelato({
          area: alvo,
          responsavelPadraoId: abaAtiva === 'minhas' ? eu.id : null,
        });
      }
    }
  }, [relatarAreaId, talhoes, abrirModalRelato, abaAtiva, eu.id]);

  useEffect(() => {
    if (relatarAnimalId && animaisAtivos.length > 0) {
      const animal = animaisAtivos.find((a) => a.id === relatarAnimalId);
      if (animal) {
        router.setParams({ relatarAnimalId: undefined });
        void abrirModalRelato({
          alvoQr: {
            tipo: 'animal',
            animalId: animal.id,
            identificacao: animal.nome ? `${animal.nome} (#${animal.brinco})` : `Brinco #${animal.brinco}`,
            categoria: 'animal',
          },
          responsavelPadraoId: abaAtiva === 'minhas' ? eu.id : null,
        });
      }
    }
  }, [relatarAnimalId, animaisAtivos, abrirModalRelato, abaAtiva, eu.id]);

  useEffect(() => {
    if (relatarMaquinaId && listaMaquinas.length > 0) {
      const maq = listaMaquinas.find((m) => m.id === relatarMaquinaId);
      if (maq) {
        router.setParams({ relatarMaquinaId: undefined });
        void abrirModalRelato({
          alvoQr: {
            tipo: 'maquina',
            maquinaId: maq.id,
            identificacao: `${maq.nome} (${maq.codigo})`,
            categoria: 'maquina',
          },
          responsavelPadraoId: abaAtiva === 'minhas' ? eu.id : null,
        });
      }
    }
  }, [relatarMaquinaId, listaMaquinas, abrirModalRelato, abaAtiva, eu.id]);

  return (
    <ScreenContainer header={<Header title="Tarefas e Ocorrências" />}>
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

      <View style={styles.topoAcoesRow}>
        <Pressable
          onPress={() =>
            void abrirModalRelato({
              responsavelPadraoId: abaAtiva === 'minhas' ? eu.id : null,
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Relatar problema"
          style={({ pressed }) => [styles.fabInline, pressed && styles.fabPressed]}>
          <View style={styles.fabIconWrap}>
            <AppIcon name="plus" size={20} color={AgroColors.textInverse} />
          </View>
          <View style={styles.fabTextCol}>
            <Text style={styles.fabTitle}>Relatar problema</Text>
            <Text style={styles.fabSubtitle}>GPS, foto ou nota de voz</Text>
          </View>
          <AppIcon name="chevronRight" size={20} color={AgroColors.textInverse} />
        </Pressable>

        <Pressable
          onPress={() => void escanearQrParaOcorrencia()}
          accessibilityRole="button"
          accessibilityLabel="Ler QR Code de animal ou máquina"
          style={({ pressed }) => [styles.botaoQrTopo, pressed && styles.fabPressed]}>
          <AppIcon name="qrcode" size={24} color={AgroColors.forest} />
          <Text style={styles.textoBotaoQr}>QR Code</Text>
        </Pressable>
      </View>

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
  filtrosBloco: {
    gap: Spacing.sm,
    backgroundColor: AgroColors.cardBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AgroColors.border,
  },
  topoAcoesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  fabInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: AgroColors.forest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    ...Shadows.md,
  },
  botaoQrTopo: {
    width: 78,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.mintBg,
    borderWidth: 1,
    borderColor: AgroColors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
  },
  textoBotaoQr: {
    fontSize: 11.5,
    fontWeight: '700',
    color: AgroColors.forest,
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
});
