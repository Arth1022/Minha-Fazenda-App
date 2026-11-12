import { Image } from 'expo-image';
import * as Location from 'expo-location';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipSelector, CustomInput, SwitchField, type ChipOption } from '@/components/forms';
import {
  AppIcon,
  BottomSheet,
  Button,
  type AppIconName,
} from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  CATEGORIAS_TAREFA,
  useConsultaAoVivo,
  useLiveQuery,
  type CategoriaTarefa,
  type Talhao,
} from '@/database';
import { listarMaquinas } from '@/features/maquinas/data/maquinas';
import { listarAnimais } from '@/features/rebanho/data/animais';
import { escolherFoto, guardarFoto, type OrigemFoto } from '@/services/fotos';
import {
  criarOcorrencia,
  gerarTituloOcorrencia,
  identificarAreaNoPonto,
  LIMITE_FOTOS_OCORRENCIA,
  ROTULO_CATEGORIA_TAREFA,
  type AlvoQrOcorrencia,
} from '@/services/ocorrenciaService';
import { listarTalhoesAtivos } from '@/services/talhaoService';
import {
  listarColaboradores,
  podeAtribuirTarefas,
  TABELAS_MEMBROS,
  useUsuarioAtual,
  type Usuario,
} from '@/services/usuario';
import { NotaVozField } from './NotaVozField';

export const ICONE_CATEGORIA_TAREFA: Record<CategoriaTarefa, AppIconName> = {
  cerca: 'fence',
  animal: 'cow',
  maquina: 'tractor',
  agua: 'milk',
  pasto: 'sprout',
  outro: 'wrench',
};

const OPCOES_BOTAO_FOTO: {
  label: string;
  origem: OrigemFoto;
  variant: 'outline' | 'secondary';
}[] = [
  { label: 'Tirar foto', origem: 'camera', variant: 'outline' },
  { label: 'Da galeria', origem: 'galeria', variant: 'secondary' },
];

export interface OpcoesAbrirRelato {
  area?: Talhao;
  alvoQr?: AlvoQrOcorrencia;
  responsavelPadraoId?: string | null;
}

type AbrirRelatoFn = (opcoes?: OpcoesAbrirRelato) => Promise<void>;

const RelatarProblemaContext = createContext<AbrirRelatoFn | null>(null);

export function useRelatarProblema(): AbrirRelatoFn {
  const ctx = useContext(RelatarProblemaContext);
  if (!ctx) {
    throw new Error('useRelatarProblema deve ser usado dentro de RelatarProblemaProvider');
  }
  return ctx;
}

export function RelatarProblemaProvider({ children }: { children: React.ReactNode }) {
  const eu = useUsuarioAtual();
  const ehAdmin = podeAtribuirTarefas(eu);
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

  const [modalVisivel, setModalVisivel] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState<CategoriaTarefa>('cerca');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [tituloEditadoManualmente, setTituloEditadoManualmente] = useState(false);
  const [novaUrgente, setNovaUrgente] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoResponsavelId, setNovoResponsavelId] = useState<string | null>(null);
  const [novasFotos, setNovasFotos] = useState<string[]>([]);
  const [novoAudioUri, setNovoAudioUri] = useState<string | null>(null);
  const [novoAnimalId, setNovoAnimalId] = useState<string | null>(null);
  const [novaMaquinaId, setNovaMaquinaId] = useState<string | null>(null);
  const [novaMaquinaParada, setNovaMaquinaParada] = useState(false);
  const [pontoGps, setPontoGps] = useState<{ lat: number; lng: number } | null>(null);
  const [areaDetectada, setAreaDetectada] = useState<{ id: string; nome: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const modalAbertoRef = useRef(false);

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
    async (opcoes?: OpcoesAbrirRelato) => {
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
      setNovoResponsavelId(opcoes?.responsavelPadraoId ?? null);
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
        responsavelId: ehAdmin && temEquipe ? novoResponsavelId : novoResponsavelId,
        areaId: areaDetectada?.id ?? null,
        animalId: novaCategoria === 'animal' ? novoAnimalId : null,
        maquinaId: novaCategoria === 'maquina' ? novaMaquinaId : null,
        maquinaParada: novaCategoria === 'maquina' && Boolean(novaMaquinaId) && novaMaquinaParada,
        audioUri: novoAudioUri,
        pontoLat: pontoGps?.lat ?? null,
        pontoLng: pontoGps?.lng ?? null,
        fotos: fotosGuardadas,
        autor: eu,
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
    <RelatarProblemaContext.Provider value={abrirModalRelato}>
      {children}

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

          {ehAdmin && temEquipe ? (
            <ChipSelector
              label="Responsável (opcional)"
              options={opcoesResponsavel}
              value={novoResponsavelId ?? 'nenhum'}
              onChange={(valor) => setNovoResponsavelId(valor === 'nenhum' ? null : valor)}
            />
          ) : null}

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
    </RelatarProblemaContext.Provider>
  );
}

const styles = StyleSheet.create({
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
  botaoAcao: {
    flex: 1,
  },
});
