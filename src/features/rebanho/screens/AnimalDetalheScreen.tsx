import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, Header, ScreenContainer } from '@/components/ui';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import type { DiaDaTrilha, Tratamento, TratamentoAtivo } from '@/dtos';
import { MoverParaPastoSheet } from '@/features/mapa';
import { definirLote } from '@/services/loteService';
import { moverAnimais } from '@/services/movimentacaoService';
import { CriasSheet } from '../components/ficha/CriasSheet';
import { EditarTratamentoModal } from '../components/ficha/EditarTratamentoModal';
import { PesagensSheet } from '../components/ficha/PesagensSheet';
import { QrCodeAnimalModal } from '../components/ficha/QrCodeAnimalModal';
import { FichaHeader, type AbaFicha } from '../components/ficha/FichaHeader';
import { InformarTouroModal } from '../components/ficha/InformarTouroModal';
import { RegistrarMenu, type TipoRegistro } from '../components/ficha/RegistrarMenu';
import { ReproducaoTab } from '../components/ficha/ReproducaoTab';
import { ResumoTab } from '../components/ficha/ResumoTab';
import { SaudeTab } from '../components/ficha/SaudeTab';
import { OndeEstaSheet } from '../components/local/OndeEstaSheet';
import { EscolherLoteSheet } from '../components/lotes/EscolherLoteSheet';
import { LoteFormSheet } from '../components/lotes/LoteFormSheet';
import { NovoAnimalForm } from '../components/NovoAnimalForm';
import { NovoTratamentoForm } from '../components/NovoTratamentoForm';
import { RegistroForm } from '../components/registros/RegistroForm';
import { confirmarDia, desfazerDia } from '../data/doses';
import { confirmarPrenhez } from '../data/reproducoes';
import { useFichaAnimal } from '../hooks/useFichaAnimal';
import { useLocalDoAnimal } from '../hooks/useLocalDoAnimal';
import { useRebanho } from '../hooks/useRebanho';
import { dosesParaHoje } from '../services/ficha';
import { historicoDePeso } from '../services/indicadores';
import { resumoDoLocal } from '../services/local';

/** Espaço no fim da rolagem para o botão "Registrar" não cobrir o último card. */
const ESPACO_DO_BOTAO = 96;

function avisarErro(titulo: string, error: unknown) {
  Alert.alert(titulo, error instanceof Error ? error.message : String(error));
}

/**
 * Ficha do animal: topo verde com a identificação e as abas Resumo, Saúde e
 * Reprodução (só novilha e vaca). O botão "Registrar" abre o menu de registros.
 */
export default function AnimalDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ficha = useFichaAnimal(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Rebanho para a edição (mãe e pai) e, dele, os touros para a cobertura
  const rebanho = useRebanho();
  const touros = useMemo(() => rebanho.filter((a) => a.sexo === 'M'), [rebanho]);

  const [aba, setAba] = useState<AbaFicha>('resumo');
  const [aplicando, setAplicando] = useState<string | null>(null);
  const [salvandoDiagnostico, setSalvandoDiagnostico] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [tratamentoVisible, setTratamentoVisible] = useState(false);
  const [registro, setRegistro] = useState<Exclude<TipoRegistro, 'tratamento'> | null>(null);
  const [editando, setEditando] = useState<Tratamento | null>(null);
  const [informarTouroDe, setInformarTouroDe] = useState<string | null>(null);
  const [pesagensVisible, setPesagensVisible] = useState(false);
  const [criasVisible, setCriasVisible] = useState(false);
  const [editarAnimal, setEditarAnimal] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  // "Onde está" (pasto e lote): folhas que abrem uma depois da outra
  const [localVisible, setLocalVisible] = useState(false);
  const [moverVisible, setMoverVisible] = useState(false);
  const [loteVisible, setLoteVisible] = useState(false);
  const [novoLoteVisible, setNovoLoteVisible] = useState(false);
  const local = useLocalDoAnimal(id ?? '', ficha?.animal.loteId ?? null);

  if (!ficha || !id) {
    return (
      <ScreenContainer withTabInset={false} header={<Header title="Ficha do animal" showBack />}>
        {null}
      </ScreenContainer>
    );
  }

  const { animal, tratamentosAtivos, podeReproduzir } = ficha;
  const brinco = `Brinco ${animal.brinco}`;
  const identificacao = animal.nome ? `${animal.nome} · ${brinco}` : brinco;
  const dosesHoje = dosesParaHoje(tratamentosAtivos);
  // Animal que deixou de ser novilha/vaca não tem a aba Reprodução
  const abaAtual: AbaFicha = aba === 'reproducao' && !podeReproduzir ? 'resumo' : aba;

  const gravarDose = async (ativo: TratamentoAtivo, dia: Date, desfazer: boolean) => {
    setAplicando(ativo.tratamento.id);
    try {
      if (desfazer) await desfazerDia(ativo.tratamento.id, dia);
      else await confirmarDia(ativo.tratamento.id, dia);
    } catch (error) {
      avisarErro('Não foi possível registrar a dose', error);
    } finally {
      setAplicando(null);
    }
  };

  const aplicar = (ativo: TratamentoAtivo) => gravarDose(ativo, new Date(), false);
  const alternarDia = (ativo: TratamentoAtivo, dia: DiaDaTrilha) =>
    gravarDose(ativo, dia.dia, dia.confirmado);

  const diagnosticar = async (coberturaId: string, prenhe: boolean) => {
    setSalvandoDiagnostico(true);
    try {
      await confirmarPrenhez(coberturaId, prenhe);
    } catch (error) {
      avisarErro('Não foi possível salvar o diagnóstico', error);
    } finally {
      setSalvandoDiagnostico(false);
    }
  };

  const escolherRegistro = (tipo: TipoRegistro) => {
    setMenuVisible(false);
    if (tipo === 'tratamento') setTratamentoVisible(true);
    else setRegistro(tipo);
  };

  return (
    <View style={styles.tela}>
      <ScreenContainer
        withTabInset={false}
        header={
          <FichaHeader
            ficha={ficha}
            aba={abaAtual}
            onAbaChange={setAba}
            pendentesHoje={dosesHoje.length}
            onEditar={() => setEditarAnimal(true)}
            onVerQrCode={() => setQrVisible(true)}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + ESPACO_DO_BOTAO }}>
        {abaAtual === 'resumo' ? (
          <ResumoTab
            ficha={ficha}
            dosesHoje={dosesHoje}
            aplicando={aplicando}
            onAplicar={aplicar}
            onRegistrarPeso={() => setRegistro('pesagem')}
            onVerPesagens={() => setPesagensVisible(true)}
            onVerCrias={() => setCriasVisible(true)}
            onVerReproducao={() => setAba('reproducao')}
            local={{
              ...resumoDoLocal(local.atual, local.lote?.nome ?? null),
              cor: local.atual ? COR_POR_TIPO_AREA[local.atual.areaTipo] : AgroColors.borderStrong,
            }}
            onVerLocal={() => setLocalVisible(true)}
          />
        ) : null}

        {abaAtual === 'saude' ? (
          <SaudeTab
            ativos={tratamentosAtivos}
            aplicando={aplicando}
            onAplicar={aplicar}
            onAlternarDia={alternarDia}
            onEditar={setEditando}
          />
        ) : null}

        {abaAtual === 'reproducao' ? (
          <ReproducaoTab
            ficha={ficha}
            touros={touros}
            salvando={salvandoDiagnostico}
            onDiagnostico={diagnosticar}
            onInformarTouro={setInformarTouroDe}
            onRegistrarCobertura={() => setRegistro('cobertura')}
          />
        ) : null}
      </ScreenContainer>

      <Pressable
        onPress={() => setMenuVisible(true)}
        style={({ pressed }) => [
          styles.registrar,
          { bottom: insets.bottom + Spacing.lg },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button">
        <AppIcon name="plus" size={26} color={AgroColors.textInverse} />
        <Text style={styles.registrarTexto}>Registrar</Text>
      </Pressable>

      <RegistrarMenu
        visible={menuVisible}
        identificacao={identificacao}
        reprodutiva={podeReproduzir}
        onClose={() => setMenuVisible(false)}
        onSelect={escolherRegistro}
      />

      <NovoTratamentoForm
        visible={tratamentoVisible}
        animalId={id}
        identificacao={identificacao}
        onClose={() => setTratamentoVisible(false)}
      />

      {registro ? (
        <RegistroForm
          tipo={registro}
          animalId={id}
          touros={touros}
          onClose={() => setRegistro(null)}
        />
      ) : null}

      {editando ? (
        <EditarTratamentoModal tratamento={editando} onClose={() => setEditando(null)} />
      ) : null}

      <PesagensSheet
        visible={pesagensVisible}
        historico={historicoDePeso(ficha.pesagens)}
        onClose={() => setPesagensVisible(false)}
        onRegistrar={() => {
          setPesagensVisible(false);
          setRegistro('pesagem');
        }}
      />

      <CriasSheet
        visible={criasVisible}
        crias={ficha.crias}
        criasAnteriores={animal.criasAnteriores}
        onClose={() => setCriasVisible(false)}
        onAbrir={(cria) => {
          setCriasVisible(false);
          router.push({ pathname: '/animal/[id]', params: { id: cria.id } });
        }}
      />

      <QrCodeAnimalModal visible={qrVisible} animal={animal} onClose={() => setQrVisible(false)} />

      <OndeEstaSheet
        visible={localVisible}
        identificacao={identificacao}
        historico={local.historico}
        atual={local.atual}
        loteNome={local.lote?.nome ?? null}
        onMover={() => {
          setLocalVisible(false);
          setMoverVisible(true);
        }}
        onTrocarLote={() => {
          setLocalVisible(false);
          setLoteVisible(true);
        }}
        onClose={() => setLocalVisible(false)}
      />

      {moverVisible ? (
        <MoverParaPastoSheet
          titulo={local.atual ? `Mover ${animal.nome || brinco}` : `Colocar ${animal.nome || brinco} num pasto`}
          subtitulo={local.atual ? `Hoje no ${local.atual.areaNome}` : 'Hoje sem local definido'}
          quantidade={1}
          origemId={local.atual?.areaId ?? null}
          permitirSemLocal
          onConfirmar={async (destinoId) => {
            await moverAnimais({ animalIds: [id], destinoId });
          }}
          onClose={() => setMoverVisible(false)}
        />
      ) : null}

      {loteVisible ? (
        <EscolherLoteSheet
          identificacao={identificacao}
          lotes={local.lotes}
          loteAtualId={animal.loteId}
          onEscolher={(loteId) => definirLote([id], loteId)}
          onNovoLote={() => {
            setLoteVisible(false);
            setNovoLoteVisible(true);
          }}
          onClose={() => setLoteVisible(false)}
        />
      ) : null}

      {novoLoteVisible ? (
        <LoteFormSheet
          onClose={() => setNovoLoteVisible(false)}
          onSalvo={async (lote) => {
            setNovoLoteVisible(false);
            await definirLote([id], lote.id);
          }}
        />
      ) : null}

      {/* Montado só aberto: cada abertura começa com os dados atuais do cadastro */}
      {editarAnimal ? (
        <NovoAnimalForm
          visible
          animal={animal}
          animais={rebanho}
          onClose={() => setEditarAnimal(false)}
          onSaved={() => setEditarAnimal(false)}
        />
      ) : null}

      {informarTouroDe ? (
        <InformarTouroModal
          coberturaId={informarTouroDe}
          touros={touros}
          onClose={() => setInformarTouroDe(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: AgroColors.screenBg,
  },
  registrar: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.primary,
    ...Shadows.fab,
  },
  registrarTexto: {
    ...Typography.button,
    fontSize: 18,
    lineHeight: 24,
    color: AgroColors.textInverse,
  },
  pressed: {
    opacity: 0.85,
  },
});
