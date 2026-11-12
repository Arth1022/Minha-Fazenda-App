import { Image } from 'expo-image';
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CheckboxField,
  ChipSelector,
  CustomInput,
  SelectField,
  SwitchField,
  type ChipOption,
} from '@/components/forms';
import { AppIcon, BottomSheet, Button } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import { CATEGORIAS_TAREFA, useConsultaAoVivo, useLiveQuery, type CategoriaTarefa } from '@/database';
import { listarMaquinas } from '@/features/maquinas/data/maquinas';
import { listarAnimais } from '@/features/rebanho/data/animais';
import { escolherFoto, guardarFoto, type OrigemFoto } from '@/services/fotos';
import {
  criarOcorrencia,
  gerarTituloOcorrencia,
  identificarAreaNoPonto,
  LIMITE_FOTOS_OCORRENCIA,
  ROTULO_CATEGORIA_TAREFA,
} from '@/services/ocorrenciaService';
import { listarTalhoesAtivos } from '@/services/talhaoService';
import {
  listarColaboradores,
  podeAtribuirTarefas,
  TABELAS_MEMBROS,
  useUsuarioAtual,
  type Usuario,
} from '@/services/usuario';
import { ICONE_CATEGORIA_TAREFA } from './categorias';
import { NotaVozField } from './NotaVozField';

/** O que já vem escolhido ao abrir o relato (ex.: pela ficha do animal ou pela área no mapa). */
export interface PedidoRelato {
  areaId?: string;
  animalId?: string;
  maquinaId?: string;
}

type AbrirRelato = (pedido?: PedidoRelato) => void;

const RelatarProblemaContext = createContext<AbrirRelato | null>(null);

/** Tempo da animação de saída da folha antes de desmontar o formulário */
const DURACAO_FECHAR_MS = 350;

const OPCOES_BOTAO_FOTO: { label: string; origem: OrigemFoto; variant: 'outline' | 'secondary' }[] = [
  { label: 'Tirar foto', origem: 'camera', variant: 'outline' },
  { label: 'Da galeria', origem: 'galeria', variant: 'secondary' },
];

/**
 * Formulário "Relatar problema" disponível em qualquer aba. O formulário (e as
 * consultas de áreas, animais, máquinas e equipe) só fica montado enquanto a
 * folha está aberta, para não manter consultas ao vivo no banco à toa.
 */
export function RelatarProblemaProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<(PedidoRelato & { chave: number }) | null>(null);
  const [visivel, setVisivel] = useState(false);
  const timerFechar = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abrir = useCallback<AbrirRelato>((novo) => {
    if (timerFechar.current) clearTimeout(timerFechar.current);
    setPedido({ ...novo, chave: Date.now() });
    setVisivel(true);
  }, []);

  const fechar = useCallback(() => {
    setVisivel(false);
    timerFechar.current = setTimeout(() => setPedido(null), DURACAO_FECHAR_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerFechar.current) clearTimeout(timerFechar.current);
    },
    []
  );

  return (
    <RelatarProblemaContext.Provider value={abrir}>
      {children}
      {pedido ? (
        <FormularioRelato key={pedido.chave} pedido={pedido} visivel={visivel} onFechar={fechar} />
      ) : null}
    </RelatarProblemaContext.Provider>
  );
}

/** Abre o formulário "Relatar problema", opcionalmente já com área, animal ou máquina. */
export function useRelatarProblema(): AbrirRelato {
  const abrir = useContext(RelatarProblemaContext);
  if (!abrir) throw new Error('useRelatarProblema precisa estar dentro de RelatarProblemaProvider');
  return abrir;
}

function rotuloAnimal(a: { nome: string | null; brinco: string }) {
  return a.nome ? `${a.nome} (#${a.brinco})` : `Brinco #${a.brinco}`;
}

interface FormularioRelatoProps {
  pedido: PedidoRelato;
  visivel: boolean;
  onFechar: () => void;
}

function FormularioRelato({ pedido, visivel, onFechar }: FormularioRelatoProps) {
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

  const [categoria, setCategoria] = useState<CategoriaTarefa>(
    pedido.animalId ? 'animal' : pedido.maquinaId ? 'maquina' : 'cerca'
  );
  const [animalId, setAnimalId] = useState<string | null>(pedido.animalId ?? null);
  const [maquinaId, setMaquinaId] = useState<string | null>(pedido.maquinaId ?? null);
  const [maquinaParada, setMaquinaParada] = useState(false);
  const [areaId, setAreaId] = useState<string | null>(pedido.areaId ?? null);
  const [pontoGps, setPontoGps] = useState<{ lat: number; lng: number } | null>(null);
  /** Título digitado pela pessoa; enquanto for null, vale o título sugerido */
  const [tituloManual, setTituloManual] = useState<string | null>(null);
  const [urgente, setUrgente] = useState(false);
  const [descricao, setDescricao] = useState('');
  // Nasce sem responsável: o admin escolhe alguém ou a própria pessoa assume
  const [responsavelId, setResponsavelId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const montado = useRef(true);

  const area = areaId ? talhoes.find((t) => t.id === areaId) : undefined;

  // Sem área escolhida de antemão, tenta o GPS para marcar o ponto e achar a área
  useEffect(() => {
    montado.current = true;
    if (pedido.areaId) {
      return () => {
        montado.current = false;
      };
    }
    void (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted || !montado.current) return;
        const pos =
          (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!montado.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        setPontoGps({ lat, lng });
        const achada = await identificarAreaNoPonto(lat, lng);
        if (achada && montado.current) setAreaId((atual) => atual ?? achada.id);
      } catch {
        // Sem sinal de GPS: o relato segue normalmente sem coordenada
      }
    })();
    return () => {
      montado.current = false;
    };
  }, [pedido.areaId]);

  const rotuloVinculo = useMemo(() => {
    if (categoria === 'animal' && animalId) {
      const a = animaisAtivos.find((x) => x.id === animalId);
      if (a) return rotuloAnimal(a);
    }
    if (categoria === 'maquina' && maquinaId) {
      const m = listaMaquinas.find((x) => x.id === maquinaId);
      if (m) return `${m.nome} (${m.codigo})`;
    }
    return area?.nome ?? null;
  }, [categoria, animalId, maquinaId, animaisAtivos, listaMaquinas, area?.nome]);

  const titulo = tituloManual ?? gerarTituloOcorrencia(categoria, rotuloVinculo);

  const opcoesArea = useMemo<ChipOption<string>[]>(
    () => [
      { label: 'Sem área / GPS', value: 'nenhuma' },
      ...talhoes.map((t) => ({ label: t.nome, value: t.id })),
    ],
    [talhoes]
  );

  const opcoesAnimal = useMemo<ChipOption<string>[]>(
    () => [
      { label: 'Sem animal específico', value: 'nenhum' },
      ...animaisAtivos.map((a) => ({ label: rotuloAnimal(a), value: a.id })),
    ],
    [animaisAtivos]
  );

  const opcoesMaquina = useMemo<ChipOption<string>[]>(
    () => [
      { label: 'Sem máquina específica', value: 'nenhuma' },
      ...listaMaquinas.map((m) => ({ label: `${m.nome} (${m.codigo})`, value: m.id })),
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

  const selecionarCategoria = (cat: CategoriaTarefa) => {
    setCategoria(cat);
    if (cat !== 'maquina') setMaquinaParada(false);
  };

  const selecionarArea = (valor: string) => {
    if (valor === 'nenhuma') {
      setAreaId(null);
      return;
    }
    const escolhida = talhoes.find((t) => t.id === valor);
    if (!escolhida) return;
    setAreaId(escolhida.id);
    setPontoGps({ lat: escolhida.centroLat, lng: escolhida.centroLng });
  };

  const selecionarMaquina = (valor: string) => {
    const id = valor === 'nenhuma' ? null : valor;
    setMaquinaId(id);
    if (!id) setMaquinaParada(false);
  };

  const adicionarFoto = async (origem: OrigemFoto) => {
    if (fotos.length >= LIMITE_FOTOS_OCORRENCIA) return;
    try {
      const uri = await escolherFoto(origem);
      if (uri) setFotos((atuais) => [...atuais, uri].slice(0, LIMITE_FOTOS_OCORRENCIA));
    } catch (erro) {
      Alert.alert('Foto', erro instanceof Error ? erro.message : 'Não foi possível obter a foto.');
    }
  };

  const removerFoto = (indice: number) => {
    setFotos((atuais) => atuais.filter((_, idx) => idx !== indice));
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const fotosGuardadas = (await Promise.all(fotos.map((uri) => guardarFoto(uri)))).filter(
        (u): u is string => Boolean(u)
      );
      await criarOcorrencia({
        titulo,
        categoria,
        urgente,
        descricao,
        responsavelId,
        areaId,
        animalId: categoria === 'animal' ? animalId : null,
        maquinaId: categoria === 'maquina' ? maquinaId : null,
        maquinaParada: categoria === 'maquina' && Boolean(maquinaId) && maquinaParada,
        audioUri,
        // Sem GPS, o serviço marca o centro da área escolhida
        pontoLat: pontoGps?.lat ?? null,
        pontoLng: pontoGps?.lng ?? null,
        fotos: fotosGuardadas,
        autor: eu,
      });
      onFechar();
    } catch (erro) {
      Alert.alert('Erro ao salvar', erro instanceof Error ? erro.message : 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BottomSheet
      visible={visivel}
      title="Relatar problema"
      subtitle={
        area
          ? `Local: ${area.nome}`
          : pontoGps
            ? 'Localização GPS capturada'
            : 'Escolha a categoria do chamado no campo'
      }
      alturaMaxima={1}
      onClose={onFechar}>
      <View style={styles.corpo}>
        <Text style={styles.secaoLabel}>Categoria *</Text>
        <View style={styles.gridCategorias}>
          {CATEGORIAS_TAREFA.map((cat) => {
            const selecionada = categoria === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => selecionarCategoria(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: selecionada }}
                style={[styles.itemCategoria, selecionada && styles.itemCategoriaAtiva]}>
                <AppIcon
                  name={ICONE_CATEGORIA_TAREFA[cat]}
                  size={26}
                  color={selecionada ? AgroColors.forest : AgroColors.textSecondary}
                />
                <Text style={[styles.textoCategoria, selecionada && styles.textoCategoriaAtiva]}>
                  {ROTULO_CATEGORIA_TAREFA[cat]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {categoria === 'animal' && animaisAtivos.length > 0 ? (
          <ChipSelector
            label="Animal do Rebanho"
            options={opcoesAnimal}
            value={animalId ?? 'nenhum'}
            onChange={(valor) => setAnimalId(valor === 'nenhum' ? null : valor)}
          />
        ) : null}

        {categoria === 'maquina' && listaMaquinas.length > 0 ? (
          <>
            <ChipSelector
              label="Máquina / Implemento"
              options={opcoesMaquina}
              value={maquinaId ?? 'nenhuma'}
              onChange={selecionarMaquina}
            />
            {maquinaId ? (
              <SwitchField
                label="Máquina parada"
                helperText="Atualiza o status da máquina para Em manutenção no banco local"
                value={maquinaParada}
                onChange={setMaquinaParada}
              />
            ) : null}
          </>
        ) : null}

        {talhoes.length > 0 ? (
          <SelectField
            label="Área / Talhão"
            options={opcoesArea}
            value={areaId ?? 'nenhuma'}
            onChange={selecionarArea}
          />
        ) : null}

        <CustomInput
          label="Título"
          placeholder="Ex.: Cerca — Pasto 2"
          value={titulo}
          onChangeText={setTituloManual}
        />

        <SwitchField
          label="Urgente"
          helperText="Destaca no topo da lista e em vermelho no mapa"
          value={urgente}
          onChange={setUrgente}
        />

        {ehAdmin && temEquipe ? (
          <ChipSelector
            label="Responsável (opcional)"
            options={opcoesResponsavel}
            value={responsavelId ?? 'nenhum'}
            onChange={(valor) => setResponsavelId(valor === 'nenhum' ? null : valor)}
          />
        ) : (
          <CheckboxField
            label="Atribuir a mim mesmo"
            helperText="Sem isso, a tarefa fica livre para alguém pegar"
            value={responsavelId === eu.id}
            onChange={(assumir) => setResponsavelId(assumir ? eu.id : null)}
          />
        )}

        <View style={styles.fotosBloco}>
          <Text style={styles.secaoLabel}>
            Fotos ({fotos.length}/{LIMITE_FOTOS_OCORRENCIA})
          </Text>
          {fotos.length > 0 ? (
            <View style={styles.fotosLinha}>
              {fotos.map((uri, idx) => (
                <View key={`${uri}-${idx}`}>
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

          {fotos.length < LIMITE_FOTOS_OCORRENCIA ? (
            <View style={styles.botoesFoto}>
              {OPCOES_BOTAO_FOTO.map((btn) => (
                <Button
                  key={btn.origem}
                  label={btn.label}
                  variant={btn.variant}
                  size="sm"
                  onPress={() => adicionarFoto(btn.origem)}
                  style={styles.botaoFoto}
                />
              ))}
            </View>
          ) : null}
        </View>

        <NotaVozField audioUri={audioUri} onChange={setAudioUri} />

        <CustomInput
          label="Observação (opcional)"
          placeholder="Ex.: Dois fios arrebentados perto da porteira..."
          value={descricao}
          onChangeText={setDescricao}
          multiline
        />

        <Button label="Registrar ocorrência" fullWidth size="lg" loading={salvando} onPress={salvar} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  corpo: {
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
  botaoFoto: {
    flex: 1,
  },
});
