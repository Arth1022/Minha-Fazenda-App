import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppIcon, InfoBanner } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { CalculoCerca, Talhao } from '@/database';
import { salvarCalculoCerca, ultimosPrecosCerca } from '@/services/cercaService';
import { contarCantos, type Coordenada } from '@/utils/geoMath';
import { perimetroDaAreaM } from '../../services/areas';
import {
  ESPACAMENTOS_MOUROES,
  formatarDistancia,
  formatarNumero,
  formatarReais,
  lerNumero,
  ORDEM_TIPOS_CERCA,
  paraCampo,
  TIPOS_CERCA,
  type TipoCerca,
} from '../../services/calculos';
import {
  calcularCercaDaArea,
  detalheDoArame,
  detalheDosEsticadores,
  type PrecosCerca,
} from '../../services/cerca';
import { BotaoMapa, CampoMapa, CoresTexto, GradeOpcoes, LinkMapa, RotuloCampo } from '../elementos';
import { CabecalhoPainel } from './elementosPainel';

const OPCOES_TIPO = ORDEM_TIPOS_CERCA.map((valor) => ({ valor, rotulo: TIPOS_CERCA[valor].rotulo }));
const OPCOES_ESPACAMENTO = ESPACAMENTOS_MOUROES.map((m) => ({ valor: String(m), rotulo: `${formatarNumero(m)} m` }));

/** Campo vazio ou zero: sem preço. */
const precoDoCampo = (texto: string) => {
  const valor = lerNumero(texto);
  return valor > 0 ? valor : null;
};
const campoDoPreco = (valor: number | null | undefined) => (valor ? paraCampo(valor, 2) : '');

export interface CercarAreaProps {
  area: Talhao;
  /** A cerca já salva na área (reabre com os mesmos parâmetros) */
  calculo: CalculoCerca | null;
  /** Teclado aberto (preços): a rolagem encolhe para o botão continuar à vista */
  alturaTeclado: number;
  onFechar: () => void;
}

/**
 * "Cercar Pasto 1" (protótipo, tela 21): o perímetro vem da área; só se
 * escolhe o tipo e o espaçamento. Salvar grava a conta na área (RF-031).
 */
export function CercarArea({ area, calculo, alturaTeclado, onFechar }: CercarAreaProps) {
  const { height } = useWindowDimensions();
  const [tipo, setTipo] = useState<TipoCerca>(calculo?.tipoCerca ?? 'arame5');
  const [espacamento, setEspacamento] = useState(String(calculo?.espacamentoM ?? 3));
  const temPrecoSalvo = Boolean(calculo?.precoRolo || calculo?.precoMourao || calculo?.precoEsticador);
  const [mostrarPrecos, setMostrarPrecos] = useState(temPrecoSalvo);
  const [precoRolo, setPrecoRolo] = useState(campoDoPreco(calculo?.precoRolo));
  const [precoMourao, setPrecoMourao] = useState(campoDoPreco(calculo?.precoMourao));
  const [precoEsticador, setPrecoEsticador] = useState(campoDoPreco(calculo?.precoEsticador));
  const [salvando, setSalvando] = useState(false);

  // Sem preço nesta área: começa com os da última cerca que teve preço
  useEffect(() => {
    if (temPrecoSalvo) return;
    let ativo = true;
    ultimosPrecosCerca()
      .then((ultimos) => {
        if (!ativo || !ultimos) return;
        setPrecoRolo((atual) => atual || campoDoPreco(ultimos.precoRolo));
        setPrecoMourao((atual) => atual || campoDoPreco(ultimos.precoMourao));
        setPrecoEsticador((atual) => atual || campoDoPreco(ultimos.precoEsticador));
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [temPrecoSalvo]);

  const perimetroM = perimetroDaAreaM(area);
  const cantos = contarCantos((area.geometriaJson.coordinates[0] ?? []) as Coordenada[]);
  const espacamentoM = Number(espacamento);
  const precos: PrecosCerca | null = mostrarPrecos
    ? { rolo: precoDoCampo(precoRolo), mourao: precoDoCampo(precoMourao), esticador: precoDoCampo(precoEsticador) }
    : null;
  const conta = calcularCercaDaArea(perimetroM, cantos, tipo, espacamentoM, precos);

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarCalculoCerca({
        areaId: area.id,
        tipoCerca: tipo,
        fios: conta.fios,
        espacamentoM,
        perimetroM,
        cantos,
        metrosArame: conta.metrosArame,
        rolos: conta.rolos,
        mouroes: conta.mouroes,
        esticadores: conta.esticadores,
        precoRolo: precos?.rolo ?? null,
        precoMourao: precos?.mourao ?? null,
        precoEsticador: precos?.esticador ?? null,
        custo: conta.custo,
      });
      onFechar();
    } catch (erro) {
      Alert.alert('Não foi possível salvar a cerca', erro instanceof Error ? erro.message : 'Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <CabecalhoPainel titulo={`Cercar ${area.nome}`} onFechar={onFechar} />
      <ScrollView
        style={{ maxHeight: Math.max(220, (height - alturaTeclado) * 0.55) }}
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled">
        {calculo?.desatualizado ? (
          <InfoBanner message="A área foi redesenhada. A conta abaixo já usa o contorno novo: salve para atualizar a cerca." />
        ) : null}

        <View style={estilos.perimetro}>
          <AppIcon name="ruler" size={22} color={AgroColors.forest} />
          <Text style={estilos.perimetroRotulo}>Perímetro da área</Text>
          <Text style={estilos.perimetroValor}>{formatarDistancia(perimetroM / 1000)}</Text>
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Tipo" />
          <GradeOpcoes opcoes={OPCOES_TIPO} selecionado={tipo} onChange={setTipo} />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Entre mourões" />
          <GradeOpcoes opcoes={OPCOES_ESPACAMENTO} selecionado={espacamento} onChange={setEspacamento} colunas={3} />
        </View>

        <View style={estilos.resultado}>
          <LinhaResultado titulo="Arame" detalhe={detalheDoArame(conta.metrosArame)} valor={`${conta.rolos} rolos`} />
          <LinhaResultado titulo="Mourões" valor={formatarNumero(conta.mouroes, 0)} divisor />
          <LinhaResultado
            titulo="Esticadores"
            detalhe={detalheDosEsticadores(conta.fios, cantos)}
            valor={formatarNumero(conta.esticadores, 0)}
            divisor
          />
          {conta.custo !== null ? (
            <LinhaResultado titulo="Custo estimado" valor={formatarReais(conta.custo)} divisor destaque />
          ) : null}
        </View>

        {mostrarPrecos ? (
          <View style={estilos.bloco}>
            <RotuloCampo titulo="Preços (R$ por unidade)" />
            <View style={estilos.precos}>
              <CampoPreco rotulo="Rolo" valor={precoRolo} onChange={setPrecoRolo} />
              <CampoPreco rotulo="Mourão" valor={precoMourao} onChange={setPrecoMourao} />
              <CampoPreco rotulo="Esticador" valor={precoEsticador} onChange={setPrecoEsticador} />
            </View>
          </View>
        ) : (
          <View style={estilos.link}>
            <LinkMapa rotulo="+ Preços para ver o custo" onPress={() => setMostrarPrecos(true)} />
          </View>
        )}
      </ScrollView>

      <BotaoMapa rotulo={`Salvar em ${area.nome}`} onPress={salvar} carregando={salvando} />
    </>
  );
}

function LinhaResultado({
  titulo,
  detalhe,
  valor,
  divisor = false,
  destaque = false,
}: {
  titulo: string;
  detalhe?: string;
  valor: string;
  divisor?: boolean;
  destaque?: boolean;
}) {
  return (
    <View style={[estilos.linha, divisor && estilos.divisor]}>
      <View style={estilos.linhaTextos}>
        <Text style={estilos.linhaTitulo}>{titulo}</Text>
        {detalhe ? <Text style={estilos.linhaDetalhe}>{detalhe}</Text> : null}
      </View>
      <Text style={[estilos.linhaValor, destaque && estilos.linhaValorDestaque]}>{valor}</Text>
    </View>
  );
}

function CampoPreco({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (t: string) => void }) {
  return (
    <View style={estilos.preco}>
      <Text style={estilos.precoRotulo}>{rotulo}</Text>
      <CampoMapa valor={valor} onChange={onChange} placeholder="0,00" acessibilidade={`Preço do ${rotulo.toLowerCase()} em reais`} />
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: Spacing.three },
  bloco: { gap: 10 },
  perimetro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: AgroColors.surfaceMuted,
  },
  perimetroRotulo: { flex: 1, fontSize: 15, color: CoresTexto.suave },
  perimetroValor: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: CoresTexto.escuro },
  resultado: {
    borderWidth: 1,
    borderColor: AgroColors.border,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  linhaTextos: { flex: 1, gap: 2 },
  linhaTitulo: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: CoresTexto.escuro },
  linhaDetalhe: { fontSize: 13.5, lineHeight: 18, color: CoresTexto.suave },
  linhaValor: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: CoresTexto.escuro },
  linhaValorDestaque: { color: AgroColors.forest },
  link: { alignItems: 'flex-start' },
  precos: { flexDirection: 'row', gap: Spacing.sm },
  preco: { flex: 1, gap: 4 },
  precoRotulo: { fontSize: 13.5, fontWeight: '600', color: CoresTexto.suave },
});
