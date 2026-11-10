import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { AgroColors } from '@/constants/theme';
import type { TipoMarcadorMapa } from '@/database';
import { BotaoMapa, CampoMapa, GradeOpcoes, RotuloCampo } from './elementos';

const OPCOES_TIPO_MARCADOR: { valor: TipoMarcadorMapa; rotulo: string }[] = [
  { valor: 'praga', rotulo: 'Praga' },
  { valor: 'daninha', rotulo: 'Daninha' },
  { valor: 'erosao', rotulo: 'Erosão' },
  { valor: 'outro', rotulo: 'Outro' },
];

export interface DadosSalvarMarcador {
  tipo: TipoMarcadorMapa;
  titulo: string;
  descricao?: string | null;
}

export interface SalvarMarcadorSheetProps {
  visible: boolean;
  salvando: boolean;
  erro?: string;
  onSalvar: (dados: DadosSalvarMarcador) => void;
  onClose: () => void;
}

/** Modal simples para registrar ponto de atenção georreferenciado no mapa. */
export function SalvarMarcadorSheet({
  visible,
  salvando,
  erro,
  onSalvar,
  onClose,
}: SalvarMarcadorSheetProps) {
  const [tipo, setTipo] = useState<TipoMarcadorMapa>('praga');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erroTitulo, setErroTitulo] = useState<string | undefined>();

  const [abertaAntes, setAbertaAntes] = useState(visible);
  if (visible !== abertaAntes) {
    setAbertaAntes(visible);
    if (visible) {
      setTipo('praga');
      setTitulo('');
      setDescricao('');
      setErroTitulo(undefined);
    }
  }

  const salvar = () => {
    if (!titulo.trim()) {
      setErroTitulo('Informe o nome da ocorrência (ex.: Foco de lagarta).');
      return;
    }
    onSalvar({
      tipo,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
    });
  };

  const mensagemErro = erroTitulo ?? erro;

  return (
    <BottomSheet
      visible={visible}
      title="Novo ponto de atenção"
      subtitle="Registre uma praga, planta daninha ou erosão no campo"
      alturaMaxima={0.68}
      onClose={() => {
        if (!salvando) onClose();
      }}>
      <View style={estilos.conteudo}>
        <View style={estilos.bloco}>
          <RotuloCampo titulo="Tipo de ocorrência" />
          <GradeOpcoes opcoes={OPCOES_TIPO_MARCADOR} selecionado={tipo} onChange={setTipo} />
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Identificação" />
          <CampoMapa
            valor={titulo}
            onChange={(texto) => {
              setTitulo(texto);
              if (erroTitulo) setErroTitulo(undefined);
            }}
            numerico={false}
            placeholder="Ex.: Foco de lagarta-do-cartucho"
            acessibilidade="Identificação do ponto de atenção"
          />
          {mensagemErro ? <Text style={estilos.erro}>{mensagemErro}</Text> : null}
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Observação (opcional)" />
          <CampoMapa
            valor={descricao}
            onChange={setDescricao}
            numerico={false}
            placeholder="Ex.: Próximo à porteira sul"
            acessibilidade="Observação opcional"
          />
        </View>

        <BotaoMapa rotulo="Salvar ponto" onPress={salvar} carregando={salvando} />
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 20, paddingTop: 4 },
  bloco: { gap: 10 },
  erro: { fontSize: 13, fontWeight: '600', color: AgroColors.danger },
});
