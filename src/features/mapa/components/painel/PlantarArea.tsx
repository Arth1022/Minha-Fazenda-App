import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, type ModeloCultura, type Talhao } from '@/database';
import { iniciarCiclo, modelosDoAdmin, TABELAS_MODELOS } from '@/services/cicloService';
import { inicioDoDia } from '@/utils/date';
import { calcularSementes, formatarHectares, lerNumero, paraCampo } from '../../services/calculos';
import {
  dataDaEtapa,
  etapasDoInicio,
  linhaDoTempoPrevista,
  MODELOS_PRONTOS,
  modeloDoAdmin,
  textoSementes,
  type ModeloPlantio,
} from '../../services/plantio';
import { BotaoMapa, CampoDataMapa, CampoMapa, CoresTexto, GradeOpcoes, RotuloCampo } from '../elementos';
import { NovaCulturaSheet } from '../NovaCulturaSheet';
import { CabecalhoPainel } from './elementosPainel';

/** Opção da grade que abre "Nova cultura" (admin) */
const OUTRA = '__outra__';

const campoDaTaxa = (taxa: number | null) => (taxa ? paraCampo(taxa, 1) : '');

export interface PlantarAreaProps {
  area: Talhao;
  /** Só o admin cria cultura nova (RF-042) */
  podeCriarCultura: boolean;
  /** Teclado aberto: a rolagem encolhe para o botão continuar à vista */
  alturaTeclado: number;
  onFechar: () => void;
  /** Ciclo começado: o painel volta ao resumo, já com o card */
  onPlantado: () => void;
}

/**
 * "Plantar em Talhão 4" (tela 22, RF-034 a RF-038): a área vem preenchida; o
 * produtor escolhe a cultura, a taxa e a data do plantio, vê as sementes e a
 * linha do tempo do modelo (dá para mudar as datas antes de começar).
 */
export function PlantarArea({
  area,
  podeCriarCultura,
  alturaTeclado,
  onFechar,
  onPlantado,
}: PlantarAreaProps) {
  const { height } = useWindowDimensions();
  const { dados: doAdmin } = useConsultaAoVivo<ModeloCultura[]>(
    () => modelosDoAdmin(),
    TABELAS_MODELOS,
    'modelos-cultura',
    []
  );
  const modelosAdmin = useMemo(() => doAdmin.map(modeloDoAdmin), [doAdmin]);
  // Cultura recém-criada fica à mão até a lista do banco trazer ela
  const [criado, setCriado] = useState<ModeloPlantio | null>(null);
  const modelos = [
    ...MODELOS_PRONTOS,
    ...modelosAdmin,
    ...(criado && !modelosAdmin.some((m) => m.id === criado.id) ? [criado] : []),
  ];
  const [modeloId, setModeloId] = useState(MODELOS_PRONTOS[0].id);
  const modelo = modelos.find((m) => m.id === modeloId) ?? MODELOS_PRONTOS[0];
  const [taxa, setTaxa] = useState(campoDaTaxa(MODELOS_PRONTOS[0].taxaKgHa));
  const [dataPlantio, setDataPlantio] = useState(() => inicioDoDia(new Date()));
  // Datas mudadas à mão na prévia (posição da etapa → data); trocar cultura ou plantio recalcula
  const [ajustes, setAjustes] = useState<Record<number, Date>>({});
  const [editando, setEditando] = useState<number | null>(null);
  const [criandoCultura, setCriandoCultura] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const usarModelo = (novo: ModeloPlantio) => {
    setModeloId(novo.id);
    setTaxa(campoDaTaxa(novo.taxaKgHa));
    setAjustes({});
  };
  const escolher = (id: string) => {
    if (id === OUTRA) {
      setCriandoCultura(true);
      return;
    }
    const escolhido = modelos.find((m) => m.id === id);
    if (escolhido) usarModelo(escolhido);
  };
  const mudarPlantio = (data: Date) => {
    setDataPlantio(inicioDoDia(data));
    setAjustes({});
  };

  const linha = linhaDoTempoPrevista(modelo.etapas, dataPlantio).map((etapa, indice) =>
    ajustes[indice] ? { ...etapa, previstaEm: ajustes[indice] } : etapa
  );
  const taxaKgHa = lerNumero(taxa);
  const sementes = calcularSementes(area.areaHectares, taxaKgHa, modelo.sacoKg);

  const aoEscolherData = (evento: DateTimePickerEvent, data?: Date) => {
    const indice = editando;
    if (Platform.OS !== 'ios') setEditando(null);
    if (evento.type === 'set' && data && indice !== null) {
      setAjustes((atual) => ({ ...atual, [indice]: inicioDoDia(data) }));
    }
  };

  const comecar = async () => {
    setSalvando(true);
    try {
      await iniciarCiclo({
        areaId: area.id,
        cultura: modelo.nome,
        modeloId: modelo.id,
        dataPlantio,
        areaHa: area.areaHectares,
        taxaKgHa,
        sacoKg: modelo.sacoKg,
        sementesKg: sementes.totalKg,
        sacos: sementes.sacos,
        etapas: etapasDoInicio(linha, dataPlantio),
      });
      onPlantado();
    } catch (erro) {
      Alert.alert('Não foi possível começar o ciclo', erro instanceof Error ? erro.message : 'Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const opcoes = [
    ...modelos.map((m) => ({ valor: m.id, rotulo: m.nome })),
    ...(podeCriarCultura ? [{ valor: OUTRA, rotulo: 'Outra' }] : []),
  ];

  return (
    <>
      <CabecalhoPainel
        titulo={`Plantar em ${area.nome}`}
        subtitulo={`Lavoura · ${formatarHectares(area.areaHectares)}`}
        onFechar={onFechar}
      />
      <ScrollView
        style={{ maxHeight: Math.max(220, (height - alturaTeclado) * 0.55) }}
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled">
        <View style={estilos.bloco}>
          <RotuloCampo titulo="Cultura" />
          <GradeOpcoes opcoes={opcoes} selecionado={modelo.id} onChange={escolher} />
        </View>

        <View style={estilos.duplo}>
          <View style={estilos.metade}>
            <RotuloCampo titulo="Taxa" />
            <CampoMapa
              valor={taxa}
              onChange={setTaxa}
              unidade="kg/ha"
              placeholder="0"
              acessibilidade="Taxa de semeadura em quilos por hectare"
            />
          </View>
          <View style={estilos.metade}>
            <RotuloCampo titulo="Plantio" />
            <CampoDataMapa valor={dataPlantio} onChange={mudarPlantio} acessibilidade="Data do plantio" />
          </View>
        </View>

        <View style={estilos.sementes}>
          <Text style={estilos.sementesRotulo}>Sementes</Text>
          <Text style={estilos.sementesValor}>
            {sementes.totalKg > 0 ? textoSementes(sementes) : 'informe a taxa'}
          </Text>
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Linha do tempo" acao={<Text style={estilos.dica}>toque numa data para mudar</Text>} />
          {linha.map((etapa, indice) => {
            const plantio = etapa.tipo === 'plantio';
            return (
              <Pressable
                key={`${etapa.nome}-${indice}`}
                disabled={plantio}
                onPress={() => setEditando(indice)}
                accessibilityRole="button"
                accessibilityLabel={`${etapa.nome}, ${dataDaEtapa(etapa.previstaEm)}${plantio ? '' : '. Toque para mudar a data'}`}
                style={({ pressed }) => [estilos.etapa, pressed && estilos.pressionado]}>
                <View style={[estilos.ponto, plantio ? estilos.pontoPlantio : estilos.pontoAnel]} />
                <Text style={[estilos.etapaNome, plantio && estilos.negrito]} numberOfLines={1}>
                  {etapa.nome}
                </Text>
                <Text style={[estilos.etapaData, plantio && estilos.negrito]}>{dataDaEtapa(etapa.previstaEm)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <BotaoMapa rotulo="Começar ciclo" onPress={comecar} carregando={salvando} />

      {editando !== null && linha[editando] ? (
        <DateTimePicker
          value={linha[editando].previstaEm}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={aoEscolherData}
        />
      ) : null}

      <NovaCulturaSheet
        visible={criandoCultura}
        nomesExistentes={modelos.map((m) => m.nome)}
        onClose={() => setCriandoCultura(false)}
        onSalva={(novo: ModeloCultura) => {
          const plantio = modeloDoAdmin(novo);
          setCriado(plantio);
          usarModelo(plantio);
          setCriandoCultura(false);
        }}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.7 },
  conteudo: { gap: Spacing.three },
  bloco: { gap: 10 },
  duplo: { flexDirection: 'row', gap: Spacing.md },
  metade: { flex: 1, gap: 10 },
  sementes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.surfaceMuted,
  },
  sementesRotulo: { fontSize: 15, color: CoresTexto.suave },
  sementesValor: { fontSize: 17, lineHeight: 23, fontWeight: '800', color: CoresTexto.escuro },
  dica: { fontSize: 13, color: CoresTexto.suave },
  etapa: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 36 },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  pontoPlantio: { backgroundColor: AgroColors.forest },
  pontoAnel: { borderWidth: 2, borderColor: AgroColors.textMuted },
  etapaNome: { flex: 1, fontSize: 15.5, lineHeight: 21, color: CoresTexto.escuro },
  etapaData: { fontSize: 15, lineHeight: 20, color: CoresTexto.suave },
  negrito: { fontWeight: '800', color: CoresTexto.escuro },
});
