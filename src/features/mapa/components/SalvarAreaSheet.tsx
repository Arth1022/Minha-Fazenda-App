import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, InfoBanner } from '@/components/ui';
import { ORDEM_TIPOS_AREA, ROTULO_TIPO_AREA } from '@/constants/areas';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import type { Talhao, TipoTalhao } from '@/database';
import { avisosTrocaDeTipo } from '../services/areas';
import { formatarDistancia, formatarHectares } from '../services/calculos';
import { BotaoMapa, CampoMapa, CoresTexto, GradeOpcoes, RotuloCampo } from './elementos';

const OPCOES_TIPO = ORDEM_TIPOS_AREA.map((valor) => ({ valor, rotulo: ROTULO_TIPO_AREA[valor] }));

export interface DadosSalvarArea {
  nome: string;
  tipo: TipoTalhao;
}

export interface SalvarAreaSheetProps {
  visible: boolean;
  /** Com `area`, a folha edita o nome e o tipo dela; sem, salva a área recém-desenhada */
  area?: Talhao | null;
  areaHa: number;
  perimetroM: number;
  salvando: boolean;
  erro?: string;
  onSalvar: (dados: DadosSalvarArea) => void;
  onClose: () => void;
}

/**
 * Último passo do desenho (ou "Nome e tipo" no painel da área): só nome e
 * tipo. A cor vem do tipo; trocar o tipo avisa antes o que deixa de valer.
 */
export function SalvarAreaSheet({
  visible,
  area = null,
  areaHa,
  perimetroM,
  salvando,
  erro,
  onSalvar,
  onClose,
}: SalvarAreaSheetProps) {
  const editando = area !== null;
  const [nome, setNome] = useState(area?.nome ?? '');
  const [tipo, setTipo] = useState<TipoTalhao>(area?.tipo ?? 'pasto');
  const [erroNome, setErroNome] = useState<string | undefined>();

  // Cada abertura começa com os dados da área (ou em branco), sem efeito
  const [abertaAntes, setAbertaAntes] = useState(visible);
  if (visible !== abertaAntes) {
    setAbertaAntes(visible);
    if (visible) {
      setNome(area?.nome ?? '');
      setTipo(area?.tipo ?? 'pasto');
      setErroNome(undefined);
    }
  }

  const avisos = area ? avisosTrocaDeTipo(area, tipo) : [];

  const salvar = () => {
    if (!nome.trim()) {
      setErroNome('Dê um nome à área (ex.: Pasto da frente).');
      return;
    }
    onSalvar({ nome: nome.trim(), tipo });
  };

  const mensagemErro = erroNome ?? erro;

  return (
    <BottomSheet
      visible={visible}
      title={editando ? 'Nome e tipo' : 'Salvar área'}
      subtitle={editando ? area.nome : 'Dê um nome e escolha o tipo'}
      alturaMaxima={0.82}
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
            <Text style={estilos.medidaValor}>{formatarDistancia(perimetroM / 1000)}</Text>
          </View>
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Nome da área" />
          <CampoMapa
            valor={nome}
            onChange={(texto) => {
              setNome(texto);
              if (erroNome) setErroNome(undefined);
            }}
            numerico={false}
            placeholder="Ex.: Pasto da frente"
            acessibilidade="Nome da área"
          />
          {mensagemErro ? <Text style={estilos.erro}>{mensagemErro}</Text> : null}
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Tipo de área" />
          <GradeOpcoes opcoes={OPCOES_TIPO} selecionado={tipo} onChange={setTipo} />
          <Text style={estilos.dica}>O tipo decide a cor no mapa e o que dá para fazer na área.</Text>
        </View>

        {avisos.length > 0 ? (
          <InfoBanner message={`Ao trocar para ${ROTULO_TIPO_AREA[tipo]}: ${avisos.join(' ')}`} />
        ) : null}

        <BotaoMapa
          rotulo={!editando ? 'Salvar área' : avisos.length > 0 ? 'Trocar tipo e salvar' : 'Salvar alterações'}
          onPress={salvar}
          carregando={salvando}
        />
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
  dica: { fontSize: 13, lineHeight: 18, color: CoresTexto.suave },
});
