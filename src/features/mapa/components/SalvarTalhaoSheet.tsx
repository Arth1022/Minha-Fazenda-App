import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { TipoTalhao } from '@/database';
import { formatarDistancia, formatarHectares } from '../services/calculos';
import { BotaoMapa, CampoMapa, CoresTexto, GradeOpcoes, LinkMapa, RotuloCampo } from './elementos';

const OPCOES_TIPO: { valor: TipoTalhao; rotulo: string }[] = [
  { valor: 'pasto', rotulo: 'Pasto' },
  { valor: 'lavoura', rotulo: 'Lavoura' },
  { valor: 'reserva', rotulo: 'Reserva' },
  { valor: 'outro', rotulo: 'Outro' },
];

export const COR_POR_TIPO: Record<TipoTalhao, string> = {
  pasto: '#22C55E',
  lavoura: '#EAB308',
  reserva: '#166534',
  outro: '#0EA5E9',
};

const PALETA_CORES = ['#22C55E', '#EAB308', '#166534', '#0EA5E9', '#F97316', '#A16207'];

export interface DadosSalvarTalhao {
  nome: string;
  tipo: TipoTalhao;
  cor: string;
}

const NOVO: DadosSalvarTalhao = { nome: '', tipo: 'pasto', cor: COR_POR_TIPO.pasto };

export interface SalvarTalhaoSheetProps {
  visible: boolean;
  /** Com `inicial`, a folha edita um talhão existente */
  inicial?: DadosSalvarTalhao;
  areaHa: number;
  perimetroKm: number;
  salvando: boolean;
  erro?: string;
  onSalvar: (dados: DadosSalvarTalhao) => void;
  onClose: () => void;
  /** Só na edição: desenhar o contorno de novo */
  onRedesenhar?: () => void;
  /** Só na edição */
  onExcluir?: () => void;
}

/** Criar (último passo do desenho) ou editar um talhão: nome, tipo e cor. */
export function SalvarTalhaoSheet({
  visible,
  inicial,
  areaHa,
  perimetroKm,
  salvando,
  erro,
  onSalvar,
  onClose,
  onRedesenhar,
  onExcluir,
}: SalvarTalhaoSheetProps) {
  const editando = inicial !== undefined;
  const base = inicial ?? NOVO;
  const [nome, setNome] = useState(base.nome);
  const [tipo, setTipo] = useState<TipoTalhao>(base.tipo);
  const [cor, setCor] = useState(base.cor);
  const [erroNome, setErroNome] = useState<string | undefined>();

  // Cada abertura começa com os dados do talhão (ou em branco), sem efeito
  const [abertaAntes, setAbertaAntes] = useState(visible);
  if (visible !== abertaAntes) {
    setAbertaAntes(visible);
    if (visible) {
      setNome(base.nome);
      setTipo(base.tipo);
      setCor(base.cor);
      setErroNome(undefined);
    }
  }

  const salvar = () => {
    if (!nome.trim()) {
      setErroNome('Dê um nome ao talhão (ex.: Pasto da frente).');
      return;
    }
    onSalvar({ nome: nome.trim(), tipo, cor });
  };

  const mensagemErro = erroNome ?? erro;

  return (
    <BottomSheet
      visible={visible}
      title={editando ? 'Editar talhão' : 'Salvar talhão'}
      subtitle={editando ? 'Mude o nome, o tipo, a cor ou o contorno' : 'Dê um nome e salve'}
      alturaMaxima={0.7}
      onClose={() => {
        if (!salvando) onClose();
      }}>
      <View style={estilos.conteudo}>
        <View style={estilos.medidas}>
          <View style={estilos.medida}>
            <Text style={estilos.medidaRotulo}>Área</Text>
            <Text style={estilos.medidaValor}>{formatarHectares(areaHa)}</Text>
          </View>
          <View style={estilos.medida}>
            <Text style={estilos.medidaRotulo}>Perímetro</Text>
            <Text style={estilos.medidaValor}>{formatarDistancia(perimetroKm)}</Text>
          </View>
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Nome do talhão" />
          <CampoMapa
            valor={nome}
            onChange={(texto) => {
              setNome(texto);
              if (erroNome) setErroNome(undefined);
            }}
            numerico={false}
            placeholder="Ex.: Pasto da frente"
            acessibilidade="Nome do talhão"
          />
          {mensagemErro ? <Text style={estilos.erro}>{mensagemErro}</Text> : null}
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Tipo de área" />
          <GradeOpcoes
            opcoes={OPCOES_TIPO}
            selecionado={tipo}
            onChange={(novo) => {
              setTipo(novo);
              setCor(COR_POR_TIPO[novo]);
            }}
          />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Cor no mapa" />
          <View style={estilos.cores}>
            {PALETA_CORES.map((hex) => (
              <Pressable
                key={hex}
                onPress={() => setCor(hex)}
                accessibilityRole="radio"
                accessibilityState={{ selected: cor === hex }}
                accessibilityLabel={`Cor ${hex}`}
                style={[estilos.cor, cor === hex && estilos.corAtiva]}>
                <View style={[estilos.corMiolo, { backgroundColor: hex }]} />
              </Pressable>
            ))}
          </View>
        </View>

        <BotaoMapa
          rotulo={editando ? 'Salvar alterações' : 'Salvar talhão'}
          onPress={salvar}
          carregando={salvando}
        />

        {editando ? (
          <View style={estilos.acoesEdicao}>
            {onRedesenhar ? (
              <LinkMapa rotulo="Redesenhar contorno" icone="pentagon" onPress={onRedesenhar} />
            ) : null}
            {onExcluir ? (
              <LinkMapa
                rotulo="Excluir talhão"
                icone="trash"
                cor={AgroColors.danger}
                onPress={onExcluir}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 22, paddingTop: 4 },
  bloco: { gap: 10 },
  medidas: {
    flexDirection: 'row',
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.xl,
    padding: Spacing.three,
  },
  medida: { flex: 1, gap: 2 },
  medidaRotulo: { fontSize: 14, fontWeight: '600', color: CoresTexto.suave },
  medidaValor: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: CoresTexto.escuro },
  erro: { fontSize: 13, fontWeight: '600', color: AgroColors.danger },
  cores: { flexDirection: 'row', gap: Spacing.sm },
  cor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corAtiva: { borderColor: CoresTexto.escuro },
  corMiolo: { width: 30, height: 30, borderRadius: 15 },
  acoesEdicao: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
});
