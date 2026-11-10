import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppIcon, Header, ScreenContainer, type AppIconName } from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { COR_POR_TIPO_AREA } from '@/constants/areas';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, useLiveQuery, type Talhao } from '@/database';
import { ocupacaoDasAreas, TABELAS_OCUPACAO } from '@/services/movimentacaoService';
import { listarTalhoesAtivos } from '@/services/talhaoService';
import { podeEditarGeometria } from '@/services/usuario';
import { CamadaDivisaFazenda } from '../components/CamadaDivisaFazenda';
import { CamadaTalhoesSalvos } from '../components/CamadaTalhoesSalvos';
import { BotaoMapa, CoresTexto } from '../components/elementos';
import { MapaBase } from '../components/MapaBase';
import { ModalCalculadoraCercas } from '../components/ModalCalculadoraCercas';
import { ModalCalculadoraSementes } from '../components/ModalCalculadoraSementes';
import { useFazendaMapa } from '../data/fazendaMapa';
import { detalheDaArea } from '../services/areas';
import { formatarHectares } from '../services/calculos';
import { mapaDeOcupacao, type LinhaOcupacao, type OcupacaoArea } from '../services/ocupacao';
import { resumoFazenda, vistaDaFazenda } from '../services/vista';

const ROTA_MAPA = '/mapa-fazenda';

/** Abre o mapa cheio; pode abrir no painel de uma área ou já começar a desenhar. */
function abrirMapa(opcoes: { talhao?: string; desenhar?: 'divisa' | 'area' } = {}) {
  const busca = Object.entries(opcoes)
    .filter(([, valor]) => valor)
    .map(([chave, valor]) => `${chave}=${encodeURIComponent(valor as string)}`)
    .join('&');
  router.push((busca ? `${ROTA_MAPA}?${busca}` : ROTA_MAPA) as Href);
}

/**
 * Aba Mapa. Fluxo em etapas: 1) marcar a divisa da fazenda; 2) separar a
 * fazenda em áreas (pasto, lavoura, reserva...). Depois, a lista abre cada
 * área no mapa, com o painel das ações dela.
 */
export default function MapeamentoScreen() {
  const { data: talhoes, updatedAt, error } = useLiveQuery(listarTalhoesAtivos());
  const fazenda = useFazendaMapa();
  const admin = podeEditarGeometria();
  const { dados: linhasOcupacao } = useConsultaAoVivo<LinhaOcupacao[]>(
    () => ocupacaoDasAreas(),
    TABELAS_OCUPACAO,
    'ocupacao',
    []
  );
  const ocupacoes = useMemo(() => mapaDeOcupacao(linhasOcupacao), [linhasOcupacao]);
  const [calculadora, setCalculadora] = useState<'sementes' | 'cerca' | null>(null);

  // Com erro na consulta, a tela segue (sem talhões) em vez de ficar presa em "…"
  const carregado = updatedAt !== undefined || error !== undefined;
  useEffect(() => {
    if (error) console.warn('[Mapa] Falha ao listar as áreas:', error);
  }, [error]);
  const vista = vistaDaFazenda(fazenda, talhoes);
  // Remonta a prévia quando muda o que ela deve enquadrar (a câmera só lê a vista ao montar)
  const chavePrevia = JSON.stringify(vista);

  return (
    <ScreenContainer header={<Header title={APP_NAME} showMenu showNotification />}>
      <View style={estilos.titulos}>
        <Text style={estilos.titulo}>Mapa da fazenda</Text>
        <Text style={estilos.subtitulo}>{carregado ? resumoFazenda(fazenda, talhoes) : '…'}</Text>
      </View>

      <Pressable
        onPress={() => abrirMapa()}
        accessibilityRole="button"
        accessibilityLabel="Abrir mapa"
        style={estilos.previa}>
        {carregado ? (
          <MapaBase
            key={chavePrevia}
            vistaInicial={vista}
            interativo={false}
            centralizarNoGpsAoAbrir={!fazenda && talhoes.length === 0}
            style={StyleSheet.absoluteFill}>
            {fazenda ? <CamadaDivisaFazenda divisa={fazenda.divisa} /> : null}
            <CamadaTalhoesSalvos talhoes={talhoes} mostrarNomes={false} />
          </MapaBase>
        ) : null}
        <View style={estilos.abrirMapa} pointerEvents="none">
          <AppIcon name="maximize" size={20} color={CoresTexto.escuro} />
          <Text style={estilos.abrirMapaTexto}>Abrir mapa</Text>
        </View>
      </Pressable>

      {!carregado || !admin ? null : !fazenda ? (
        <CartaoEtapa
          titulo="Comece pela divisa da fazenda"
          texto="Marque o contorno da fazenda inteira. Depois você separa ela em áreas: cada pasto, lavoura ou reserva."
          passos={['Ache sua terra no mapa', 'Toque nos cantos da divisa', 'Separe as áreas']}
          botao="Marcar a divisa"
          onPress={() => abrirMapa({ desenhar: 'divisa' })}
        />
      ) : talhoes.length === 0 ? (
        <CartaoEtapa
          titulo="Agora separe as áreas"
          texto="Cada área é uma divisão da terra: um pasto, uma lavoura, uma reserva. O app calcula a área e o perímetro sozinho."
          passos={['Abra o mapa da fazenda', 'Toque nos cantos da área', 'Dê um nome e escolha o tipo']}
          botao="Desenhar área"
          onPress={() => abrirMapa({ desenhar: 'area' })}
        />
      ) : null}

      {carregado && talhoes.length > 0 ? (
        <ListaAreas talhoes={talhoes} ocupacoes={ocupacoes} podeDesenhar={admin && fazenda !== null} />
      ) : null}

      <Text style={estilos.secao}>Calculadoras</Text>
      <View style={estilos.calculadoras}>
        <CartaoCalculadora
          icone="sprout"
          titulo="Insumos"
          subtitulo="Sementes e adubo"
          onPress={() => setCalculadora('sementes')}
        />
        <CartaoCalculadora
          icone="fence"
          titulo="Cerca"
          subtitulo="Arame e mourões"
          onPress={() => setCalculadora('cerca')}
        />
      </View>

      <ModalCalculadoraSementes
        visible={calculadora === 'sementes'}
        talhoes={talhoes}
        onClose={() => setCalculadora(null)}
      />
      <ModalCalculadoraCercas
        visible={calculadora === 'cerca'}
        talhoes={talhoes}
        onClose={() => setCalculadora(null)}
      />
    </ScreenContainer>
  );
}

function CartaoEtapa({
  titulo,
  texto,
  passos,
  botao,
  onPress,
}: {
  titulo: string;
  texto: string;
  passos: string[];
  botao: string;
  onPress: () => void;
}) {
  return (
    <View style={estilos.cartao}>
      <Text style={estilos.cartaoTitulo}>{titulo}</Text>
      <Text style={estilos.cartaoTexto}>{texto}</Text>
      <View style={estilos.passos}>
        {passos.map((passo, indice) => (
          <View key={passo} style={estilos.passo}>
            <View style={estilos.passoNumero}>
              <Text style={estilos.passoNumeroTexto}>{indice + 1}</Text>
            </View>
            <Text style={estilos.passoTexto}>{passo}</Text>
          </View>
        ))}
      </View>
      <BotaoMapa rotulo={botao} icone="pentagon" onPress={onPress} />
    </View>
  );
}

/** Áreas já criadas: tocar abre o mapa no painel dela (lá estão as ações e o "⋮"). */
function ListaAreas({
  talhoes,
  ocupacoes,
  podeDesenhar,
}: {
  talhoes: Talhao[];
  ocupacoes: ReadonlyMap<string, OcupacaoArea>;
  podeDesenhar: boolean;
}) {
  return (
    <View style={estilos.cartao}>
      <View>
        <Text style={estilos.cartaoTitulo}>Áreas da fazenda</Text>
        <Text style={estilos.cartaoDica}>
          Toque numa área para abrir no mapa e ver o que dá para fazer nela.
        </Text>
      </View>
      <View>
        {talhoes.map((talhao, indice) => (
          <Pressable
            key={talhao.id}
            onPress={() => abrirMapa({ talhao: talhao.id })}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${talhao.nome} no mapa`}
            style={({ pressed }) => [
              estilos.talhao,
              indice > 0 && estilos.talhaoDivisor,
              pressed && estilos.pressionado,
            ]}>
            <View style={[estilos.talhaoCor, { backgroundColor: COR_POR_TIPO_AREA[talhao.tipo] }]} />
            <View style={estilos.talhaoTextos}>
              <Text style={estilos.talhaoNome} numberOfLines={1}>
                {talhao.nome}
              </Text>
              <Text style={estilos.talhaoTipo} numberOfLines={1}>
                {detalheDaArea(talhao, ocupacoes.get(talhao.id))}
              </Text>
            </View>
            <Text style={estilos.talhaoArea}>{formatarHectares(talhao.areaHectares)}</Text>
            <AppIcon name="chevronRight" size={18} color={CoresTexto.suave} />
          </Pressable>
        ))}
      </View>
      {podeDesenhar ? (
        <BotaoMapa
          rotulo="Desenhar outra área"
          icone="pentagon"
          onPress={() => abrirMapa({ desenhar: 'area' })}
        />
      ) : null}
    </View>
  );
}

function CartaoCalculadora({
  icone,
  titulo,
  subtitulo,
  onPress,
}: {
  icone: AppIconName;
  titulo: string;
  subtitulo: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Calculadora de ${titulo.toLowerCase()}`}
      style={({ pressed }) => [estilos.calculadora, pressed && estilos.pressionado]}>
      <View style={estilos.calculadoraIcone}>
        <AppIcon name={icone} size={22} color={AgroColors.forest} />
      </View>
      <View style={estilos.calculadoraTextos}>
        <Text style={estilos.calculadoraTitulo} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={estilos.calculadoraSub} numberOfLines={1}>
          {subtitulo}
        </Text>
      </View>
    </Pressable>
  );
}

const BORDA_CARTAO = '#E3E7E4';

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.8 },
  titulos: { gap: 2, marginTop: Spacing.two },
  titulo: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: CoresTexto.escuro,
  },
  subtitulo: { fontSize: 15, lineHeight: 20, color: CoresTexto.suave },

  previa: {
    height: 168,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: AgroColors.mapTerrainBg,
    borderWidth: 1,
    borderColor: BORDA_CARTAO,
  },
  abrirMapa: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    height: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    backgroundColor: AgroColors.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  abrirMapaTexto: { fontSize: 16, fontWeight: '600', color: CoresTexto.escuro },

  cartao: {
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: BORDA_CARTAO,
    padding: Spacing.three,
    gap: Spacing.md,
  },
  cartaoTitulo: { fontSize: 19, lineHeight: 25, fontWeight: '700', color: CoresTexto.escuro },
  cartaoTexto: { fontSize: 15, lineHeight: 21, color: CoresTexto.suave, marginTop: -6 },
  cartaoDica: { fontSize: 13.5, lineHeight: 18, color: CoresTexto.suave },
  passos: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.xs },
  passo: { flex: 1, gap: Spacing.sm },
  passoNumero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AgroColors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoNumeroTexto: { fontSize: 13, fontWeight: '700', color: AgroColors.textInverse },
  passoTexto: { fontSize: 14.5, lineHeight: 19, color: '#3A403C' },

  talhao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  talhaoDivisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  talhaoCor: { width: 14, height: 14, borderRadius: 7 },
  talhaoTextos: { flex: 1, gap: 1 },
  talhaoNome: { fontSize: 16, fontWeight: '600', color: CoresTexto.escuro },
  talhaoTipo: { fontSize: 13.5, color: CoresTexto.suave },
  talhaoArea: { fontSize: 15, fontWeight: '700', color: CoresTexto.escuro },

  secao: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#3A403C',
    marginTop: Spacing.two,
  },
  calculadoras: { flexDirection: 'row', gap: Spacing.md },
  calculadora: {
    flex: 1,
    minHeight: 62,
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: BORDA_CARTAO,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  calculadoraIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AgroColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculadoraTextos: { flex: 1 },
  calculadoraTitulo: { fontSize: 16.5, lineHeight: 22, fontWeight: '600', color: CoresTexto.escuro },
  calculadoraSub: { fontSize: 13.5, lineHeight: 18, color: CoresTexto.suave },
});
