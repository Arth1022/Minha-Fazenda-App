import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ConfirmacaoSheet, PassoLinhaDoTempo, type EstadoPasso } from '@/components/ui';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, Spacing } from '@/constants/theme';
import type { CicloPlantio, EtapaCiclo, Talhao } from '@/database';
import {
  cancelarCiclo,
  marcarEtapaFeita,
  mudarPrevisaoDaEtapa,
  salvarObservacaoDaEtapa,
} from '@/services/cicloService';
import { diasEntre, formatDataBR } from '@/utils/date';
import { formatarNumero } from '../../services/calculos';
import {
  dataDaEtapa,
  estadoDaEtapa,
  progressoDoCiclo,
  textoCicloEncerrado,
  textoDiaDoCiclo,
  textoPrazo,
  textoSementes,
  type EstadoEtapa,
} from '../../services/plantio';
import { BotaoMapa, CampoMapa, CoresTexto, LinkMapa } from '../elementos';
import { BarraProgresso, CabecalhoPainel } from './elementosPainel';

const PASSO: Record<EstadoEtapa, EstadoPasso> = {
  feita: 'feito',
  proxima: 'atual',
  atrasada: 'aFazer',
  pendente: 'aFazer',
};

const avisarErro = (erro: unknown) =>
  Alert.alert('Não deu certo', erro instanceof Error ? erro.message : 'Tente de novo.');

export interface LinhaDoTempoCicloProps {
  area: Talhao;
  ciclo: CicloPlantio;
  etapas: EtapaCiclo[];
  /** Ciclo anterior (colhido ou cancelado): só leitura */
  somenteLeitura?: boolean;
  /** Teclado aberto (observação): a rolagem encolhe */
  alturaTeclado: number;
  onFechar: () => void;
}

/**
 * Linha do tempo do ciclo (tela 23, RF-039): etapas feitas com check, a
 * próxima com o prazo e "Marcar feita". Tocar numa etapa abre a data prevista
 * (dá para mudar) e a observação. O visual dos passos é o da reprodução (RF-040).
 * "Atribuir" e o responsável são da M6 (tarefas de colaboradores).
 */
export function LinhaDoTempoCiclo({
  area,
  ciclo,
  etapas,
  somenteLeitura = false,
  alturaTeclado,
  onFechar,
}: LinhaDoTempoCicloProps) {
  const { height } = useWindowDimensions();
  const agora = new Date();
  const progresso = progressoDoCiclo(ciclo, etapas, agora);
  const proximaId = progresso.proxima?.etapa.id ?? null;
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [mudandoData, setMudandoData] = useState<EtapaCiclo | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const marcar = async (etapa: EtapaCiclo) => {
    setMarcando(etapa.id);
    try {
      await marcarEtapaFeita(etapa.id);
      if (etapa.tipo === 'colheita') {
        Alert.alert('Colheita registrada', `O ciclo de ${ciclo.cultura} foi para os ciclos anteriores do ${area.nome}.`);
        onFechar();
      }
    } catch (erro) {
      avisarErro(erro);
    } finally {
      setMarcando(null);
    }
  };

  const aoEscolherData = (evento: DateTimePickerEvent, data?: Date) => {
    const etapa = mudandoData;
    if (Platform.OS !== 'ios') setMudandoData(null);
    if (evento.type === 'set' && data && etapa) mudarPrevisaoDaEtapa(etapa.id, data).catch(avisarErro);
  };

  const subtitulo = somenteLeitura
    ? `${area.nome} · ${textoCicloEncerrado(ciclo)}`
    : `${area.nome} · ${textoDiaDoCiclo(progresso, ciclo, agora)}`;

  return (
    <>
      <CabecalhoPainel
        titulo={ciclo.cultura}
        subtitulo={subtitulo}
        cor={COR_POR_TIPO_AREA.lavoura}
        onFechar={onFechar}
      />
      {!somenteLeitura ? <BarraProgresso fracao={progresso.fracao} /> : null}

      <ScrollView
        style={{ maxHeight: Math.max(240, (height - alturaTeclado) * 0.55) }}
        contentContainerStyle={estilos.lista}
        keyboardShouldPersistTaps="handled">
        {etapas.map((etapa, indice) => {
          const estado = estadoDaEtapa(etapa, proximaId, agora);
          const aberta = abertaId === etapa.id;
          const dias = diasEntre(agora, etapa.previstaEm);
          const ehProxima = !somenteLeitura && etapa.id === proximaId;
          return (
            <PassoLinhaDoTempo
              key={etapa.id}
              estado={PASSO[estado]}
              ultimo={indice === etapas.length - 1}
              tamanho={24}
              comCheck>
              <Pressable
                onPress={() => setAbertaId(aberta ? null : etapa.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: aberta }}
                accessibilityLabel={`${etapa.nome}, ${estado === 'feita' ? 'feita em' : 'prevista para'} ${dataDaEtapa(etapa.realizadaEm ?? etapa.previstaEm, agora)}`}
                style={({ pressed }) => [estilos.linha, pressed && estilos.pressionado]}>
                <Text style={estilos.nome} numberOfLines={2}>
                  {etapa.nome}
                </Text>
                <Text style={estilos.data}>{dataDaEtapa(etapa.realizadaEm ?? etapa.previstaEm, agora)}</Text>
              </Pressable>

              {!somenteLeitura && estado !== 'feita' && (ehProxima || estado === 'atrasada') ? (
                <View style={estilos.acao}>
                  <Text style={[estilos.prazo, dias < 0 && estilos.prazoAtrasado]}>{textoPrazo(dias)}</Text>
                  {ehProxima ? (
                    <BotaoMapa
                      rotulo="Marcar feita"
                      onPress={() => marcar(etapa)}
                      carregando={marcando === etapa.id}
                      style={estilos.botaoMarcar}
                    />
                  ) : null}
                </View>
              ) : null}

              {etapa.observacao && !aberta ? (
                <Text style={estilos.observacao} numberOfLines={2}>
                  {etapa.observacao}
                </Text>
              ) : null}

              {aberta ? (
                <DetalheEtapa
                  etapa={etapa}
                  somenteLeitura={somenteLeitura}
                  podeMarcar={!somenteLeitura && estado !== 'feita' && !ehProxima}
                  marcando={marcando === etapa.id}
                  onMarcar={() => marcar(etapa)}
                  onMudarData={() => setMudandoData(etapa)}
                />
              ) : null}
            </PassoLinhaDoTempo>
          );
        })}

        <View style={estilos.rodape}>
          <Text style={estilos.sementes}>
            Sementes: {textoSementes({ totalKg: ciclo.sementesKg, sacos: ciclo.sacos })}
            {ciclo.taxaKgHa > 0 ? ` · ${formatarNumero(ciclo.taxaKgHa)} kg/ha em ${formatarNumero(ciclo.areaHa, 2)} ha` : ''}
          </Text>
          {ciclo.calculoDesatualizado ? (
            <Text style={estilos.desatualizado}>A área foi redesenhada depois desta conta.</Text>
          ) : null}
          {!somenteLeitura ? (
            <View style={estilos.cancelar}>
              <LinkMapa rotulo="Cancelar ciclo" cor={AgroColors.danger} onPress={() => setCancelando(true)} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {mudandoData ? (
        <DateTimePicker
          value={mudandoData.previstaEm}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={aoEscolherData}
        />
      ) : null}

      <ConfirmacaoSheet
        visible={cancelando}
        titulo={`Cancelar o ciclo de ${ciclo.cultura}?`}
        itens={[
          { icone: 'x', texto: 'Sai do painel da lavoura e os avisos das etapas param' },
          { icone: 'check', texto: 'Fica nos ciclos anteriores, como cancelado', tom: 'ok' },
        ]}
        confirmar="Cancelar ciclo"
        perigo
        onConfirmar={() => {
          setCancelando(false);
          cancelarCiclo(ciclo.id).then(onFechar, avisarErro);
        }}
        onClose={() => setCancelando(false)}
      />
    </>
  );
}

/** O que abre ao tocar numa etapa: datas, "Marcar feita" (fora da próxima) e a observação. */
function DetalheEtapa({
  etapa,
  somenteLeitura,
  podeMarcar,
  marcando,
  onMarcar,
  onMudarData,
}: {
  etapa: EtapaCiclo;
  somenteLeitura: boolean;
  podeMarcar: boolean;
  marcando: boolean;
  onMarcar: () => void;
  onMudarData: () => void;
}) {
  const [texto, setTexto] = useState(etapa.observacao ?? '');
  const mudou = texto.trim() !== (etapa.observacao ?? '');
  return (
    <View style={estilos.detalhe}>
      {etapa.realizadaEm ? (
        <Text style={estilos.detalheTexto}>
          Feita em {formatDataBR(etapa.realizadaEm)} (prevista para {formatDataBR(etapa.previstaEm)})
        </Text>
      ) : (
        <View style={estilos.detalheLinha}>
          <Text style={estilos.detalheTexto}>Prevista para {formatDataBR(etapa.previstaEm)}</Text>
          {!somenteLeitura ? <LinkMapa rotulo="Mudar data" icone="calendar" onPress={onMudarData} /> : null}
        </View>
      )}
      {podeMarcar ? <BotaoMapa rotulo="Marcar feita" variante="contorno" onPress={onMarcar} carregando={marcando} /> : null}
      {somenteLeitura ? (
        etapa.observacao ? <Text style={estilos.detalheTexto}>{etapa.observacao}</Text> : null
      ) : (
        <View style={estilos.detalheLinha}>
          <View style={estilos.campoObservacao}>
            <CampoMapa
              valor={texto}
              onChange={setTexto}
              numerico={false}
              placeholder="Observação (ex.: produto, dose)"
              acessibilidade={`Observação de ${etapa.nome}`}
            />
          </View>
          {mudou ? (
            <LinkMapa
              rotulo="Salvar"
              onPress={() => salvarObservacaoDaEtapa(etapa.id, texto).catch(avisarErro)}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.7 },
  lista: { paddingTop: Spacing.xs },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 28 },
  nome: { flex: 1, fontSize: 16.5, lineHeight: 22, fontWeight: '700', color: CoresTexto.escuro },
  data: { fontSize: 15, lineHeight: 20, color: CoresTexto.suave },
  acao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  prazo: { fontSize: 14.5, fontWeight: '700', color: AgroColors.health },
  prazoAtrasado: { color: AgroColors.danger },
  botaoMarcar: { minHeight: 44, paddingHorizontal: Spacing.lg },
  observacao: { marginTop: Spacing.xs, fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
  detalhe: { gap: Spacing.sm, marginTop: Spacing.sm },
  detalheLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  detalheTexto: { flexShrink: 1, fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
  campoObservacao: { flex: 1 },
  rodape: { gap: Spacing.xs, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: AgroColors.divider },
  sementes: { fontSize: 14, lineHeight: 19, color: CoresTexto.suave },
  desatualizado: { fontSize: 14, lineHeight: 19, fontWeight: '600', color: AgroColors.health },
  cancelar: { alignItems: 'flex-start' },
});
