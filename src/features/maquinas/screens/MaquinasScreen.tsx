import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import {
  EmptyState,
  Header,
  ScreenContainer,
  ScrollHintList,
  SegmentedTabs,
  type SegmentedTabItem,
} from '@/components/ui';
import { AgroColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useLiveQuery } from '@/database';
import type { MaquinaComUso } from '@/dtos';
import { usuarioAtual } from '@/services/usuario';
import { BuscarMaquinaModal } from '../components/BuscarMaquinaModal';
import { MaquinaCard } from '../components/MaquinaCard';
import { NovaMaquinaForm } from '../components/NovaMaquinaForm';
import { ResumoFrotaCard } from '../components/ResumoFrotaCard';
import { problemasAbertosDaFrota } from '../data/ocorrencias';
import { useFluxosMaquina } from '../hooks/useFluxosMaquina';
import { useMaquinas } from '../hooks/useMaquinas';
import { condicaoDaMaquina, type CondicaoMaquina } from '../services/registros';
import { duracaoDoUso, formatarDuracao } from '../services/uso';

type Filtro = 'todas' | 'emUso' | 'paradas';

const NO_FILTRO: Record<Filtro, (maquina: MaquinaComUso) => boolean> = {
  todas: () => true,
  emUso: (maquina) => maquina.usoAtual !== null,
  paradas: (maquina) => maquina.usoAtual === null,
};

const MENSAGEM_VAZIA: Record<Filtro, string> = {
  todas: 'Nenhuma máquina cadastrada.',
  emUso: 'Nenhuma máquina em uso agora.',
  paradas: 'Todas as máquinas estão em uso.',
};

/** Uso aberto por outra pessoa (sem operador: uso antigo, feito neste celular). */
function deOutraPessoa(maquina: MaquinaComUso): boolean {
  return maquina.usoAtual?.operadorId != null && maquina.usoAtual.operadorId !== usuarioAtual().id;
}

// Quantidade de cards visíveis na lista antes de precisar rolar
const MAQUINAS_VISIVEIS = 3;

/**
 * Máquinas e Frota: lista com o botão de liga/desliga de cada máquina
 * (auditoria de uso), filtro por situação, busca e cadastro. Toque no card abre a ficha.
 */
export default function MaquinasScreen() {
  const router = useRouter();
  const maquinas = useMaquinas();
  const fluxos = useFluxosMaquina();
  const { data: problemas } = useLiveQuery(problemasAbertosDaFrota());
  const [ocupadaId, setOcupadaId] = useState<string | null>(null);

  const condicaoPor = useMemo(() => {
    const mapa = new Map<string, CondicaoMaquina>();
    for (const maquina of maquinas) {
      mapa.set(maquina.id, condicaoDaMaquina(maquina, problemas.filter((p) => p.maquinaId === maquina.id)));
    }
    return mapa;
  }, [maquinas, problemas]);

  const { abrir, desligar } = fluxos;
  /** Botão de liga/desliga do card: ligar abre a escolha de implemento e atividade. */
  const alternar = useCallback(
    (maquina: MaquinaComUso) => {
      const outra = deOutraPessoa(maquina);
      if (maquina.usoAtual && !outra) {
        const tempo = formatarDuracao(duracaoDoUso(maquina.usoAtual, new Date()));
        Alert.alert(`Desligar ${maquina.nome}?`, `Tempo de uso: ${tempo}.`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desligar',
            style: 'destructive',
            onPress: () => {
              setOcupadaId(maquina.id);
              desligar(maquina).finally(() => setOcupadaId(null));
            },
          },
        ]);
        return;
      }
      abrir('ligar', maquina, {
        usoAberto: maquina.usoAtual,
        condicao: condicaoPor.get(maquina.id),
        deOutraPessoa: outra,
      });
    },
    [abrir, desligar, condicaoPor]
  );

  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [cadastroVisivel, setCadastroVisivel] = useState(false);
  const [buscaVisivel, setBuscaVisivel] = useState(false);

  const abrirCadastro = useCallback(() => setCadastroVisivel(true), []);

  const abrirFicha = useCallback(
    (maquina: MaquinaComUso) =>
      router.push({ pathname: '/maquina/[id]', params: { id: maquina.id } }),
    [router]
  );

  const emUso = useMemo(() => maquinas.filter(NO_FILTRO.emUso).length, [maquinas]);

  const tabs: SegmentedTabItem<Filtro>[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'emUso', label: emUso > 0 ? `Em uso (${emUso})` : 'Em uso' },
    { key: 'paradas', label: 'Paradas' },
  ];

  const filtradas = useMemo(() => maquinas.filter(NO_FILTRO[filtro]), [maquinas, filtro]);

  const handleBuscaSelect = (maquina: MaquinaComUso) => {
    setBuscaVisivel(false);
    abrirFicha(maquina);
  };

  const handleCreated = () => {
    setFiltro('todas');
    setCadastroVisivel(false);
  };

  return (
    <ScreenContainer
      header={
        <Header title="Máquinas e Frota" />
      }>
      <SegmentedTabs
        tabs={tabs}
        activeTab={filtro}
        onTabChange={setFiltro}
        showSearch
        onSearchPress={() => setBuscaVisivel(true)}
      />

      <Pressable
        onPress={abrirCadastro}
        style={({ pressed }) => [styles.novaBtn, pressed && styles.pressed]}
        accessibilityRole="button">
        <Text style={styles.novaText}>NOVA MÁQUINA</Text>
      </Pressable>

      {filtradas.length === 0 ? (
        <EmptyState message={MENSAGEM_VAZIA[filtro]} />
      ) : (
        <ScrollHintList
          key={filtro}
          data={filtradas}
          keyExtractor={(maquina) => maquina.id}
          visibleCount={MAQUINAS_VISIVEIS}
          renderItem={(maquina) => (
            <MaquinaCard
              maquina={maquina}
              onAbrir={abrirFicha}
              onCodigoPress={alternar}
              ocupada={ocupadaId === maquina.id}
              condicao={condicaoPor.get(maquina.id)}
              deOutraPessoa={deOutraPessoa(maquina)}
            />
          )}
        />
      )}

      {maquinas.length > 0 ? <ResumoFrotaCard maquinas={maquinas} /> : null}

      <NovaMaquinaForm
        visible={cadastroVisivel}
        onClose={() => setCadastroVisivel(false)}
        onCreated={handleCreated}
      />

      {fluxos.modais}

      <BuscarMaquinaModal
        visible={buscaVisivel}
        maquinas={maquinas}
        onClose={() => setBuscaVisivel(false)}
        onSelect={handleBuscaSelect}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  novaBtn: {
    backgroundColor: AgroColors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  novaText: {
    ...Typography.button,
    color: AgroColors.textInverse,
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
