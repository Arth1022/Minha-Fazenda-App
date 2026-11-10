import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppIcon, Header, ScreenContainer, type AppIconName } from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { useLiveQuery, type Talhao } from '@/database';
import { deletarTalhao, listarTalhoesAtivos } from '@/services/talhaoService';
import { CamadaDivisaFazenda } from '../components/CamadaDivisaFazenda';
import { CamadaTalhoesSalvos } from '../components/CamadaTalhoesSalvos';
import { BotaoMapa, CoresTexto } from '../components/elementos';
import { MapaBase } from '../components/MapaBase';
import { ModalCalculadoraCercas } from '../components/ModalCalculadoraCercas';
import { ModalCalculadoraSementes } from '../components/ModalCalculadoraSementes';
import { useFazendaMapa } from '../data/fazendaMapa';
import {
  formatarHectares,
  ROTULO_CULTURA_LAVOURA,
  ROTULO_FASE_LAVOURA,
} from '../services/calculos';
import { resumoFazenda, vistaDaFazenda } from '../services/vista';

const ROTA_MAPA = '/mapa-fazenda';

const ROTULO_TIPO: Record<Talhao['tipo'], string> = {
  pasto: 'Pasto',
  lavoura: 'Lavoura',
  reserva: 'Reserva',
  outro: 'Outro',
};

/** Abre o mapa cheio; pode focar um talhão ou já começar a desenhar. */
function abrirMapa(opcoes: { talhao?: string; desenhar?: 'divisa' | 'talhao' } = {}) {
  const busca = Object.entries(opcoes)
    .filter(([, valor]) => valor)
    .map(([chave, valor]) => `${chave}=${encodeURIComponent(valor as string)}`)
    .join('&');
  router.push((busca ? `${ROTA_MAPA}?${busca}` : ROTA_MAPA) as Href);
}

/**
 * Aba Mapa. Fluxo em etapas: 1) marcar a divisa da fazenda; 2) separar a
 * fazenda em talhões. Depois, a lista permite criar mais, editar e excluir.
 */
export default function MapeamentoScreen() {
  const { data: talhoes, updatedAt, error } = useLiveQuery(listarTalhoesAtivos());
  const fazenda = useFazendaMapa();
  const [calculadora, setCalculadora] = useState<'sementes' | 'cerca' | null>(null);

  // Com erro na consulta, a tela segue (sem talhões) em vez de ficar presa em "…"
  const carregado = updatedAt !== undefined || error !== undefined;
  useEffect(() => {
    if (error) console.warn('[Mapa] Falha ao listar talhões:', error);
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

      {!carregado ? null : !fazenda ? (
        <CartaoEtapa
          titulo="Comece pela divisa da fazenda"
          texto="Marque o contorno da fazenda inteira. Depois você separa ela em talhões: cada pasto, lavoura ou reserva."
          passos={['Ache sua terra no mapa', 'Toque nos cantos da divisa', 'Separe os talhões']}
          botao="Marcar a divisa"
          onPress={() => abrirMapa({ desenhar: 'divisa' })}
        />
      ) : talhoes.length === 0 ? (
        <CartaoEtapa
          titulo="Agora separe os talhões"
          texto="Talhão é cada divisão da terra: um pasto, uma lavoura, uma reserva. O app calcula a área sozinho."
          passos={['Abra o mapa da fazenda', 'Toque nos cantos do talhão', 'Dê um nome e salve']}
          botao="Desenhar talhão"
          onPress={() => abrirMapa({ desenhar: 'talhao' })}
        />
      ) : null}

      {carregado && talhoes.length > 0 ? (
        <ListaTalhoes talhoes={talhoes} podeDesenhar={fazenda !== null} />
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

/** Talhões já criados: tocar abre no mapa (lá dá para editar), lixeira exclui. */
function ListaTalhoes({ talhoes, podeDesenhar }: { talhoes: Talhao[]; podeDesenhar: boolean }) {
  const excluir = (talhao: Talhao) => {
    Alert.alert('Excluir talhão', `Excluir "${talhao.nome}" do mapa?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deletarTalhao(talhao.id) },
    ]);
  };

  return (
    <View style={estilos.cartao}>
      <View>
        <Text style={estilos.cartaoTitulo}>Seus talhões</Text>
        <Text style={estilos.cartaoDica}>Toque num talhão para ver no mapa e editar.</Text>
      </View>
      <View>
        {talhoes.map((talhao, indice) => (
          <Pressable
            key={talhao.id}
            onPress={() => abrirMapa({ talhao: talhao.id })}
            accessibilityRole="button"
            accessibilityLabel={`Ver e editar ${talhao.nome}`}
            style={({ pressed }) => [
              estilos.talhao,
              indice > 0 && estilos.talhaoDivisor,
              pressed && estilos.pressionado,
            ]}>
            <View style={[estilos.talhaoCor, { backgroundColor: talhao.cor }]} />
            <View style={estilos.talhaoTextos}>
              <Text style={estilos.talhaoNome} numberOfLines={1}>
                {talhao.nome}
              </Text>
              <Text style={estilos.talhaoTipo}>
                {talhao.tipo === 'lavoura' && talhao.cultura
                  ? `${ROTULO_CULTURA_LAVOURA[talhao.cultura] ?? talhao.cultura}${talhao.faseLavoura ? ` · ${ROTULO_FASE_LAVOURA[talhao.faseLavoura] ?? talhao.faseLavoura}` : ''}`
                  : ROTULO_TIPO[talhao.tipo]}
              </Text>
            </View>
            <Text style={estilos.talhaoArea}>{formatarHectares(talhao.areaHectares)}</Text>
            <Pressable
              onPress={() => excluir(talhao)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Excluir ${talhao.nome}`}
              style={({ pressed }) => [estilos.talhaoExcluir, pressed && estilos.pressionado]}>
              <AppIcon name="trash" size={18} color={CoresTexto.suave} />
            </Pressable>
          </Pressable>
        ))}
      </View>
      {podeDesenhar ? (
        <BotaoMapa
          rotulo="Desenhar outro talhão"
          icone="pentagon"
          onPress={() => abrirMapa({ desenhar: 'talhao' })}
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
  talhaoExcluir: { padding: 4 },

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
