import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Header, ScreenContainer } from '@/components/ui';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, useLiveQuery } from '@/database';
import { concluirTarefa, TABELAS_TAREFAS, tarefasDe, type Tarefa } from '@/services/cicloService';
import { listarTalhoesAtivos } from '@/services/talhaoService';
import { usuarioAtual } from '@/services/usuario';
import { diasEntre, formatDiaMes } from '@/utils/date';
import { CamadaTalhoesSalvos } from '../components/CamadaTalhoesSalvos';
import { BotaoMapa, CoresTexto } from '../components/elementos';
import { MapaBase, type VistaMapa } from '../components/MapaBase';
import { useFazendaMapa } from '../data/fazendaMapa';
import { textoPrazo } from '../services/plantio';
import { vistaDaFazenda } from '../services/vista';

/** Feitas que aparecem embaixo (as mais recentes). */
const FEITAS_NA_TELA = 20;

/**
 * "Minhas tarefas" (tela 27, RF-068): as etapas atribuídas a quem está com o
 * celular, com a área da tarefa em destaque no mapa. "Concluir" marca a etapa
 * como feita na linha do tempo do ciclo (RF-069) e avisa quem atribuiu.
 */
export default function MinhasTarefasScreen() {
  const eu = usuarioAtual();
  const { dados: tarefas, carregado } = useConsultaAoVivo<Tarefa[]>(() => tarefasDe(eu.id), TABELAS_TAREFAS, eu.id, []);
  const { data: talhoes } = useLiveQuery(listarTalhoesAtivos());
  const fazenda = useFazendaMapa();
  const [focoId, setFocoId] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState<string | null>(null);

  const agora = new Date();
  const paraFazer = tarefas.filter((t) => t.etapa.realizadaEm === null && t.cicloStatus === 'ativo');
  const feitas = tarefas
    .filter((t) => t.etapa.realizadaEm !== null)
    .sort((a, b) => (b.etapa.realizadaEm?.getTime() ?? 0) - (a.etapa.realizadaEm?.getTime() ?? 0))
    .slice(0, FEITAS_NA_TELA);
  const foco = paraFazer.find((t) => t.etapa.id === focoId) ?? paraFazer[0] ?? null;
  const areaFoco = talhoes.find((a) => a.id === foco?.areaId) ?? null;
  const vista: VistaMapa = areaFoco
    ? { tipo: 'area', ne: [areaFoco.maxLng, areaFoco.maxLat], sw: [areaFoco.minLng, areaFoco.minLat] }
    : vistaDaFazenda(fazenda, talhoes);

  const concluir = async (tarefa: Tarefa) => {
    setConcluindo(tarefa.etapa.id);
    try {
      await concluirTarefa(tarefa.etapa.id);
    } catch (erro) {
      Alert.alert('Não deu certo', erro instanceof Error ? erro.message : 'Tente de novo.');
    } finally {
      setConcluindo(null);
    }
  };

  return (
    <ScreenContainer withTabInset={false} header={<Header title="Minhas tarefas" showBack />}>
      <View style={estilos.previa}>
        {talhoes.length > 0 ? (
          <MapaBase
            // A câmera só lê a vista ao montar: muda a tarefa em foco, monta de novo
            key={areaFoco?.id ?? 'fazenda'}
            vistaInicial={vista}
            interativo={false}
            style={StyleSheet.absoluteFill}>
            <CamadaTalhoesSalvos talhoes={talhoes} selecionadoId={areaFoco?.id ?? null} mostrarNomes />
          </MapaBase>
        ) : null}
      </View>

      <View style={estilos.secaoLinha}>
        <Text style={estilos.secao}>Para fazer</Text>
        <View style={estilos.contador}>
          <Text style={estilos.contadorTexto}>{paraFazer.length}</Text>
        </View>
      </View>
      {carregado && paraFazer.length === 0 ? (
        <Text style={estilos.vazio}>Nenhuma tarefa para fazer agora.</Text>
      ) : null}
      {paraFazer.map((tarefa) => {
        const dias = diasEntre(agora, tarefa.etapa.previstaEm);
        const emFoco = tarefa === foco;
        return (
          <View key={tarefa.etapa.id} style={[estilos.cartao, emFoco && estilos.cartaoFoco]}>
            <Pressable
              onPress={() => setFocoId(tarefa.etapa.id)}
              accessibilityRole="button"
              accessibilityLabel={`${tarefa.etapa.nome}, ${tarefa.areaNome}. Mostrar no mapa`}
              style={estilos.cartaoTopo}>
              <View style={[estilos.quadrado, { backgroundColor: COR_POR_TIPO_AREA[tarefa.areaTipo] }]} />
              <View style={estilos.cartaoTextos}>
                <Text style={estilos.cartaoTitulo}>{tarefa.etapa.nome}</Text>
                <Text style={estilos.cartaoDetalhe}>
                  {tarefa.areaNome} · {tarefa.cultura}
                </Text>
              </View>
              <View style={[estilos.prazo, dias < 0 && estilos.prazoAtrasado]}>
                <Text style={[estilos.prazoTexto, dias < 0 && estilos.prazoTextoAtrasado]}>{textoPrazo(dias)}</Text>
              </View>
            </Pressable>
            <BotaoMapa
              rotulo="Concluir"
              icone="check"
              onPress={() => concluir(tarefa)}
              carregando={concluindo === tarefa.etapa.id}
            />
          </View>
        );
      })}

      {feitas.length > 0 ? (
        <>
          <Text style={estilos.secao}>Feitas</Text>
          <View style={estilos.feitas}>
            {feitas.map((tarefa, indice) => (
              <View key={tarefa.etapa.id} style={[estilos.feita, indice > 0 && estilos.divisor]}>
                <AppIcon name="check" size={20} color={AgroColors.forest} />
                <Text style={estilos.feitaNome} numberOfLines={1}>
                  {tarefa.etapa.nome} · {tarefa.areaNome}
                </Text>
                <Text style={estilos.feitaData}>
                  {tarefa.etapa.realizadaEm ? formatDiaMes(tarefa.etapa.realizadaEm) : ''}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  previa: {
    height: 220,
    marginHorizontal: -Spacing.lg,
    backgroundColor: AgroColors.mapTerrainBg,
    overflow: 'hidden',
  },
  secaoLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.three },
  secao: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: '#3A403C', marginTop: Spacing.two },
  contador: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: AgroColors.forestTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  contadorTexto: { fontSize: 13, fontWeight: '800', color: AgroColors.forest },
  vazio: { fontSize: 15, lineHeight: 21, color: CoresTexto.suave },
  cartao: {
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: AgroColors.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cartaoFoco: { borderColor: AgroColors.forest, borderWidth: 1.5 },
  cartaoTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  quadrado: { width: 14, height: 14, borderRadius: 3, marginTop: 5 },
  cartaoTextos: { flex: 1, gap: 2 },
  cartaoTitulo: { fontSize: 17, lineHeight: 23, fontWeight: '700', color: CoresTexto.escuro },
  cartaoDetalhe: { fontSize: 14.5, lineHeight: 20, color: CoresTexto.suave },
  prazo: { backgroundColor: AgroColors.healthBg, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  prazoAtrasado: { backgroundColor: AgroColors.dangerBg },
  prazoTexto: { fontSize: 13.5, fontWeight: '700', color: AgroColors.health },
  prazoTextoAtrasado: { color: AgroColors.danger },
  feitas: {
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: AgroColors.border,
    paddingHorizontal: Spacing.three,
  },
  feita: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56 },
  divisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  feitaNome: { flex: 1, fontSize: 16, color: CoresTexto.escuro },
  feitaData: { fontSize: 14.5, color: CoresTexto.suave },
});
