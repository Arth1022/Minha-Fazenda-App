import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useLiveQuery,
  type CategoriaTarefa,
  type StatusTarefa,
  type Talhao,
  type TarefaOcorrencia,
} from '@/database';
import { listarMaquinas } from '@/features/maquinas/data/maquinas';
import { NovoTratamentoForm } from '@/features/rebanho/components/NovoTratamentoForm';
import { listarAnimais } from '@/features/rebanho/data/animais';
import { escolherFoto, guardarFoto, type OrigemFoto } from '@/services/fotos';
import {
  concluirOcorrencia,
  criarOcorrencia,
  garantirSeedOcorrencias,
  gerarTituloOcorrencia,
  identificarAreaNoPonto,
  iniciarOcorrencia,
  LIMITE_FOTOS_OCORRENCIA,
  listarMinhasTarefas,
  listarTodasTarefas,
  pegarTarefa,
  resolverQrCodeParaOcorrencia,
  ROTULO_CATEGORIA_TAREFA,
  ROTULO_STATUS_TAREFA,
  TABELAS_OCORRENCIAS,
  type AlvoQrOcorrencia,
} from '@/services/ocorrenciaService';
import { useLeitorQrCode } from '@/services/qrcode';
import { listarTalhoesAtivos } from '@/services/talhaoService';
import {
  listarColaboradores,
  podeAtribuirTarefas,
  TABELAS_MEMBROS,
  usuarioAtual,
  type Usuario,
} from '@/services/usuario';
import { formatDiaMes } from '@/utils/date';
import { NotaVozField, PlayerNotaVozCompacto } from './NotaVozField';

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

export const ICONE_CATEGORIA_TAREFA: Record<CategoriaTarefa, AppIconName> = {
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

const OPCOES_BOTAO_FOTO: { label: string; origem: OrigemFoto; variant: 'outline' | 'secondary' }[] = [
  { label: 'Tirar foto', origem: 'camera', variant: 'outline' },
  { label: 'Da galeria', origem: 'galeria', variant: 'secondary' },
];

interface CardTarefaProps {
  tarefa: TarefaOcorrencia;
  nomeResponsavel: string;
  euId: string;
  ehAdmin: boolean;
  carregando: boolean;
  onPegar: (id: string) => void;
  onIniciar: (id: string) => void;
  onConcluir: (tarefa: TarefaOcorrencia) => void;
}

const CardTarefa = React.memo(function CardTarefa({
  tarefa,
  nomeResponsavel,
  euId,
  ehAdmin,
  carregando,
  onPegar,
  onIniciar,
  onConcluir,
}: CardTarefaProps) {
  const semDono = tarefa.responsavelId === null;
  const ehDonoOuAdmin = tarefa.responsavelId === euId || ehAdmin;
  const podePegar = tarefa.status === 'aberta' && semDono;
  const podeIniciar = tarefa.status === 'aberta' && ehDonoOuAdmin && !semDono;
  const podeConcluir =
    (tarefa.status === 'aberta' || tarefa.status === 'em_andamento') && ehDonoOuAdmin && !semDono;

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
    </Card>
  );
});

export default function TarefasScreen() {
  const eu = usuarioAtual();
  const lerQrCode = useLeitorQrCode();
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
  const [novoTitulo, setNovoTitulo] = useState('');
  const [tituloEditadoManualmente, setTituloEditadoManualmente] = useState(false);
  const [novaUrgente, setNovaUrgente] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novasFotos, setNovasFotos] = useState<string[]>([]);
  const [novoAudioUri, setNovoAudioUri] = useState<string | null>(null);
  const [novoAnimalId, setNovoAnimalId] = useState<string | null>(null);
  const [novaMaquinaId, setNovaMaquinaId] = useState<string | null>(null);
  const [novaMaquinaParada, setNovaMaquinaParada] = useState(false);
  const [pontoGps, setPontoGps] = useState<{ lat: number; lng: number } | null>(null);
  const [areaDetectada, setAreaDetectada] = useState<{ id: string; nome: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const modalAbertoRef = useRef(false);

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

  const rotuloVinculoAtual = useCallback(
    (cat: CategoriaTarefa, animId: string | null, maqId: string | null, nomeArea?: string | null) => {
      if (cat === 'animal' && animId) {
        const a = animaisAtivos.find((x) => x.id === animId);
        if (a) return a.nome ? `${a.nome} (#${a.brinco})` : `Brinco #${a.brinco}`;
      }
      if (cat === 'maquina' && maqId) {
        const m = listaMaquinas.find((x) => x.id === maqId);
        if (m) return `${m.nome} (${m.codigo})`;
      }
      return nomeArea ?? null;
    },
    [animaisAtivos, listaMaquinas]
  );

  const selecionarCategoriaModal = (cat: CategoriaTarefa) => {
    setNovaCategoria(cat);
    if (cat !== 'maquina') setNovaMaquinaParada(false);
    if (!tituloEditadoManualmente) {
      setNovoTitulo(
        gerarTituloOcorrencia(
          cat,
          rotuloVinculoAtual(cat, novoAnimalId, novaMaquinaId, areaDetectada?.nome)
        )
      );
    }
  };

  const opcoesAreaModal = useMemo<ChipOption<string>[]>(
    () => [
      { label: 'Sem área / GPS', value: 'nenhuma' },
      ...talhoes.map((t) => ({ label: t.nome, value: t.id })),
    ],
    [talhoes]
  );

  const opcoesAnimalModal = useMemo<ChipOption<string>[]>(
    () => [
      { label: 'Sem animal específico', value: 'nenhum' },
      ...animaisAtivos.map((a) => ({
        label: a.nome ? `${a.nome} (#${a.brinco})` : `Brinco #${a.brinco}`,
        value: a.id,
      })),
    ],
    [animaisAtivos]
  );

  const opcoesMaquinaModal = useMemo<ChipOption<string>[]>(
    () => [
      { label: 'Sem máquina específica', value: 'nenhuma' },
      ...listaMaquinas.map((m) => ({
        label: `${m.nome} (${m.codigo})`,
        value: m.id,
      })),
    ],
    [listaMaquinas]
  );

  const selecionarAreaModal = (valor: string) => {
    if (valor === 'nenhuma') {
      setAreaDetectada(null);
      if (!tituloEditadoManualmente) {
        setNovoTitulo(
          gerarTituloOcorrencia(
            novaCategoria,
            rotuloVinculoAtual(novaCategoria, novoAnimalId, novaMaquinaId, null)
          )
        );
      }
      return;
    }
    const escolhida = talhoes.find((t) => t.id === valor);
    if (!escolhida) return;
    setAreaDetectada({ id: escolhida.id, nome: escolhida.nome });
    setPontoGps({ lat: escolhida.centroLat, lng: escolhida.centroLng });
    if (!tituloEditadoManualmente) {
      setNovoTitulo(
        gerarTituloOcorrencia(
          novaCategoria,
          rotuloVinculoAtual(novaCategoria, novoAnimalId, novaMaquinaId, escolhida.nome)
        )
      );
    }
  };

  const selecionarAnimalModal = (valor: string) => {
    const id = valor === 'nenhum' ? null : valor;
    setNovoAnimalId(id);
    if (!tituloEditadoManualmente) {
      setNovoTitulo(
        gerarTituloOcorrencia(
          novaCategoria,
          rotuloVinculoAtual(novaCategoria, id, novaMaquinaId, areaDetectada?.nome)
        )
      );
    }
  };

  const selecionarMaquinaModal = (valor: string) => {
    const id = valor === 'nenhuma' ? null : valor;
    setNovaMaquinaId(id);
    if (!id) setNovaMaquinaParada(false);
    if (!tituloEditadoManualmente) {
      setNovoTitulo(
        gerarTituloOcorrencia(
          novaCategoria,
          rotuloVinculoAtual(novaCategoria, novoAnimalId, id, areaDetectada?.nome)
        )
      );
    }
  };

  const abrirModalRelato = useCallback(
    async (opcoes?: { area?: Talhao; alvoQr?: AlvoQrOcorrencia }) => {
      modalAbertoRef.current = true;
      const areaInicial = opcoes?.area;
      const alvoQr = opcoes?.alvoQr;
      const catInicial: CategoriaTarefa = alvoQr ? alvoQr.categoria : 'cerca';
      const animId = alvoQr?.tipo === 'animal' ? alvoQr.animalId : null;
      const maqId = alvoQr?.tipo === 'maquina' ? alvoQr.maquinaId : null;
      const complementoInicial = alvoQr?.identificacao ?? areaInicial?.nome ?? null;

      setNovaCategoria(catInicial);
      setNovoAnimalId(animId);
      setNovaMaquinaId(maqId);
      setNovaMaquinaParada(false);
      setNovoAudioUri(null);
      setNovoTitulo(gerarTituloOcorrencia(catInicial, complementoInicial));
      setTituloEditadoManualmente(false);
      setNovaUrgente(false);
      setNovaDescricao('');
      setNovasFotos([]);
      setPontoGps(areaInicial ? { lat: areaInicial.centroLat, lng: areaInicial.centroLng } : null);
      setAreaDetectada(areaInicial ? { id: areaInicial.id, nome: areaInicial.nome } : null);
      setModalVisivel(true);

      if (areaInicial) return;

      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted || !modalAbertoRef.current) return;
        const pos =
          (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!modalAbertoRef.current) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPontoGps({ lat, lng });

        const area = await identificarAreaNoPonto(lat, lng);
        if (area && modalAbertoRef.current) {
          setAreaDetectada(area);
          if (!alvoQr) {
            setNovoTitulo((atual) =>
              atual === gerarTituloOcorrencia(catInicial, null)
                ? gerarTituloOcorrencia(catInicial, area.nome)
                : atual
            );
          }
        }
      } catch {
        // Sem sinal de GPS: o relato segue normalmente sem coordenada
      }
    },
    []
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
    await abrirModalRelato({ alvoQr: alvo });
  }, [lerQrCode, abrirModalRelato]);

  useEffect(() => {
    if (relatarAreaId && talhoes.length > 0) {
      const alvo = talhoes.find((t) => t.id === relatarAreaId);
      if (alvo) {
        router.setParams({ relatarAreaId: undefined });
        void abrirModalRelato({ area: alvo });
      }
    }
  }, [relatarAreaId, talhoes, abrirModalRelato]);

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
        });
      }
    }
  }, [relatarAnimalId, animaisAtivos, abrirModalRelato]);

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
        });
      }
    }
  }, [relatarMaquinaId, listaMaquinas, abrirModalRelato]);

  const adicionarFoto = async (origem: OrigemFoto) => {
    if (novasFotos.length >= LIMITE_FOTOS_OCORRENCIA) return;
    try {
      const uri = await escolherFoto(origem);
      if (uri) {
        setNovasFotos((atuais) => [...atuais, uri].slice(0, LIMITE_FOTOS_OCORRENCIA));
      }
    } catch (erro) {
      Alert.alert('Foto', erro instanceof Error ? erro.message : 'Não foi possível obter a foto.');
    }
  };

  const removerFoto = (indice: number) => {
    setNovasFotos((atuais) => atuais.filter((_, idx) => idx !== indice));
  };

  const salvarRelato = async () => {
    setSalvando(true);
    try {
      const fotosGuardadas = (
        await Promise.all(novasFotos.map((uri) => guardarFoto(uri)))
      ).filter((u): u is string => Boolean(u));

      await criarOcorrencia({
        titulo: novoTitulo,
        categoria: novaCategoria,
        urgente: novaUrgente,
        descricao: novaDescricao,
        responsavelId: abaAtiva === 'minhas' ? eu.id : null,
        areaId: areaDetectada?.id ?? null,
        animalId: novaCategoria === 'animal' ? novoAnimalId : null,
        maquinaId: novaCategoria === 'maquina' ? novaMaquinaId : null,
        maquinaParada: novaCategoria === 'maquina' && Boolean(novaMaquinaId) && novaMaquinaParada,
        audioUri: novoAudioUri,
        pontoLat: pontoGps?.lat ?? null,
        pontoLng: pontoGps?.lng ?? null,
        fotos: fotosGuardadas,
        autorId: eu.id,
      });
      modalAbertoRef.current = false;
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
          onPress={() => void abrirModalRelato()}
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
            ehAdmin={podeAtribuirTarefas(eu)}
            carregando={processandoId === tarefa.id}
            onPegar={handlePegar}
            onIniciar={handleIniciar}
            onConcluir={handleConcluir}
          />
        ))}
      </View>

      <BottomSheet
        visible={modalVisivel}
        title="Relatar problema"
        subtitle={
          areaDetectada
            ? `Local identificado pelo GPS: ${areaDetectada.nome}`
            : pontoGps
              ? 'Localização GPS capturada'
              : 'Escolha a categoria do chamado no campo'
        }
        alturaMaxima={0.88}
        onClose={() => {
          modalAbertoRef.current = false;
          setModalVisivel(false);
        }}>
        <View style={styles.modalBody}>
          <Text style={styles.secaoLabel}>Categoria *</Text>
          <View style={styles.gridCategorias}>
            {CATEGORIAS_TAREFA.map((cat) => {
              const selecionada = novaCategoria === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => selecionarCategoriaModal(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selecionada }}
                  style={[
                    styles.itemCategoria,
                    selecionada && styles.itemCategoriaAtiva,
                  ]}>
                  <AppIcon
                    name={ICONE_CATEGORIA_TAREFA[cat]}
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

          {novaCategoria === 'animal' && animaisAtivos.length > 0 ? (
            <ChipSelector
              label="Animal do Rebanho"
              options={opcoesAnimalModal}
              value={novoAnimalId ?? 'nenhum'}
              onChange={selecionarAnimalModal}
            />
          ) : null}

          {novaCategoria === 'maquina' && listaMaquinas.length > 0 ? (
            <>
              <ChipSelector
                label="Máquina / Implemento"
                options={opcoesMaquinaModal}
                value={novaMaquinaId ?? 'nenhuma'}
                onChange={selecionarMaquinaModal}
              />
              {novaMaquinaId ? (
                <SwitchField
                  label="Máquina parada"
                  helperText="Atualiza o status da máquina para Em manutenção no banco local"
                  value={novaMaquinaParada}
                  onChange={setNovaMaquinaParada}
                />
              ) : null}
            </>
          ) : null}

          {talhoes.length > 0 ? (
            <ChipSelector
              label="Área / Talhão"
              options={opcoesAreaModal}
              value={areaDetectada?.id ?? 'nenhuma'}
              onChange={selecionarAreaModal}
            />
          ) : null}

          <CustomInput
            label="Título"
            placeholder="Ex.: Cerca — Pasto 2"
            value={novoTitulo}
            onChangeText={(txt) => {
              setTituloEditadoManualmente(true);
              setNovoTitulo(txt);
            }}
          />

          <SwitchField
            label="Urgente"
            helperText="Destaca no topo da lista e em vermelho no mapa"
            value={novaUrgente}
            onChange={setNovaUrgente}
          />

          <View style={styles.fotosBloco}>
            <Text style={styles.secaoLabel}>
              Fotos ({novasFotos.length}/{LIMITE_FOTOS_OCORRENCIA})
            </Text>
            {novasFotos.length > 0 ? (
              <View style={styles.fotosLinha}>
                {novasFotos.map((uri, idx) => (
                  <View key={`${uri}-${idx}`} style={styles.fotoItem}>
                    <Image source={{ uri }} style={styles.fotoMiniatura} contentFit="cover" />
                    <Pressable
                      onPress={() => removerFoto(idx)}
                      accessibilityRole="button"
                      accessibilityLabel="Remover foto"
                      style={styles.botaoRemoverFoto}>
                      <AppIcon name="x" size={14} color={AgroColors.textInverse} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {novasFotos.length < LIMITE_FOTOS_OCORRENCIA ? (
              <View style={styles.botoesFoto}>
                {OPCOES_BOTAO_FOTO.map((btn) => (
                  <Button
                    key={btn.origem}
                    label={btn.label}
                    variant={btn.variant}
                    size="sm"
                    onPress={() => adicionarFoto(btn.origem)}
                    style={styles.botaoAcao}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <NotaVozField audioUri={novoAudioUri} onChange={setNovoAudioUri} />

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
  fotosBloco: {
    gap: Spacing.xs,
  },
  fotosLinha: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fotoItem: {
    position: 'relative',
  },
  fotoMiniatura: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: AgroColors.subtleBg,
  },
  botaoRemoverFoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AgroColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botoesFoto: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
