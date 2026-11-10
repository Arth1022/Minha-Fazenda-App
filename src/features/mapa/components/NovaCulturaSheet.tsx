import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, BottomSheet } from '@/components/ui';
import { AgroColors, Spacing } from '@/constants/theme';
import type { ModeloCultura } from '@/database';
import { criarModeloCultura } from '@/services/cicloService';
import { lerNumero } from '../services/calculos';
import { etapasDoRascunho, problemaDoModelo, type RascunhoModelo } from '../services/plantio';
import { BotaoMapa, CampoMapa, CoresTexto, LinkMapa, RotuloCampo } from './elementos';

interface TratoCampo {
  chave: number;
  nome: string;
  dias: string;
}

const TRATO_INICIAL: TratoCampo = { chave: 0, nome: 'Adubação de cobertura', dias: '30' };

export interface NovaCulturaSheetProps {
  visible: boolean;
  /** Nomes dos modelos que já existem (prontos e do admin) */
  nomesExistentes: readonly string[];
  onClose: () => void;
  /** Modelo gravado: o "Plantar" já escolhe ele */
  onSalva: (modelo: ModeloCultura) => void;
}

/**
 * "Outra" no Plantar (RF-042): o admin cria uma cultura com a linha do tempo
 * dela (preparo antes do plantio, as etapas e a colheita, em dias). Ela vira
 * modelo e aparece nos próximos plantios.
 */
export function NovaCulturaSheet({ visible, nomesExistentes, onClose, onSalva }: NovaCulturaSheetProps) {
  const [nome, setNome] = useState('');
  const [taxa, setTaxa] = useState('');
  const [saco, setSaco] = useState('20');
  const [diasPreparo, setDiasPreparo] = useState('10');
  const [tratos, setTratos] = useState<TratoCampo[]>([TRATO_INICIAL]);
  const [diasColheita, setDiasColheita] = useState('120');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Cada abertura começa do zero (ajuste no render, sem efeito)
  const [abertaAntes, setAbertaAntes] = useState(visible);
  if (visible !== abertaAntes) {
    setAbertaAntes(visible);
    if (visible) {
      setNome('');
      setTaxa('');
      setSaco('20');
      setDiasPreparo('10');
      setTratos([TRATO_INICIAL]);
      setDiasColheita('120');
      setErro(null);
    }
  }

  const mudarTrato = (chave: number, mudanca: Partial<TratoCampo>) =>
    setTratos((atuais) => atuais.map((t) => (t.chave === chave ? { ...t, ...mudanca } : t)));
  const adicionarTrato = () =>
    setTratos((atuais) => [...atuais, { chave: Math.max(0, ...atuais.map((t) => t.chave)) + 1, nome: '', dias: '' }]);
  const tirarTrato = (chave: number) => setTratos((atuais) => atuais.filter((t) => t.chave !== chave));

  const salvar = async () => {
    const rascunho: RascunhoModelo = {
      nome,
      diasPreparo: lerNumero(diasPreparo),
      tratos: tratos.map((t) => ({ nome: t.nome, dias: lerNumero(t.dias) })),
      diasColheita: lerNumero(diasColheita),
    };
    const problema = problemaDoModelo(rascunho, nomesExistentes);
    if (problema) {
      setErro(problema);
      return;
    }
    setSalvando(true);
    try {
      const modelo = await criarModeloCultura({
        nome,
        taxaKgHa: lerNumero(taxa) || null,
        sacoKg: lerNumero(saco) || 20,
        etapas: etapasDoRascunho(rascunho),
      });
      onSalva(modelo);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a cultura.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Nova cultura"
      subtitle="Vira modelo para os próximos plantios"
      alturaMaxima={0.85}
      onClose={onClose}>
      <View style={estilos.conteudo}>
        <View style={estilos.bloco}>
          <RotuloCampo titulo="Nome" />
          <CampoMapa valor={nome} onChange={setNome} numerico={false} placeholder="Ex.: Soja" acessibilidade="Nome da cultura" />
        </View>

        <View style={estilos.duplo}>
          <View style={estilos.metade}>
            <RotuloCampo titulo="Taxa sugerida" />
            <CampoMapa valor={taxa} onChange={setTaxa} unidade="kg/ha" placeholder="0" acessibilidade="Taxa sugerida em quilos por hectare" />
          </View>
          <View style={estilos.metade}>
            <RotuloCampo titulo="Saco" />
            <CampoMapa valor={saco} onChange={setSaco} unidade="kg" acessibilidade="Peso do saco de semente em quilos" />
          </View>
        </View>

        <View style={estilos.bloco}>
          <RotuloCampo titulo="Linha do tempo" />
          <LinhaFixa nome="Preparo do solo">
            <CampoDias valor={diasPreparo} onChange={setDiasPreparo} acessibilidade="Dias de preparo antes do plantio" />
            <Text style={estilos.unidade}>dias antes</Text>
          </LinhaFixa>
          <LinhaFixa nome="Plantio">
            <Text style={estilos.unidade}>no dia</Text>
          </LinhaFixa>
          {tratos.map((trato) => (
            <View key={trato.chave} style={estilos.trato}>
              <View style={estilos.tratoNome}>
                <CampoMapa
                  valor={trato.nome}
                  onChange={(texto) => mudarTrato(trato.chave, { nome: texto })}
                  numerico={false}
                  placeholder="Etapa (ex.: Pulverização)"
                  acessibilidade="Nome da etapa"
                />
              </View>
              <CampoDias
                valor={trato.dias}
                onChange={(texto) => mudarTrato(trato.chave, { dias: texto })}
                acessibilidade={`Dias depois do plantio para ${trato.nome || 'a etapa'}`}
              />
              <Pressable
                onPress={() => tirarTrato(trato.chave)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Tirar ${trato.nome || 'a etapa'}`}>
                <AppIcon name="x" size={20} color={CoresTexto.suave} />
              </Pressable>
            </View>
          ))}
          <View style={estilos.link}>
            <LinkMapa rotulo="+ Etapa" onPress={adicionarTrato} />
          </View>
          <LinhaFixa nome="Colheita">
            <CampoDias valor={diasColheita} onChange={setDiasColheita} acessibilidade="Dias do plantio até a colheita" />
            <Text style={estilos.unidade}>dias depois</Text>
          </LinhaFixa>
          <Text style={estilos.ajuda}>As etapas do meio contam em dias depois do plantio.</Text>
        </View>

        {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        <BotaoMapa rotulo="Salvar cultura" onPress={salvar} carregando={salvando} />
      </View>
    </BottomSheet>
  );
}

function LinhaFixa({ nome, children }: { nome: string; children: React.ReactNode }) {
  return (
    <View style={estilos.fixa}>
      <Text style={estilos.fixaNome}>{nome}</Text>
      {children}
    </View>
  );
}

function CampoDias({ valor, onChange, acessibilidade }: { valor: string; onChange: (t: string) => void; acessibilidade: string }) {
  return (
    <View style={estilos.dias}>
      <CampoMapa valor={valor} onChange={onChange} placeholder="0" acessibilidade={acessibilidade} />
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 20, paddingTop: 4 },
  bloco: { gap: 10 },
  duplo: { flexDirection: 'row', gap: Spacing.md },
  metade: { flex: 1, gap: 10 },
  fixa: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 50 },
  fixaNome: { flex: 1, fontSize: 15.5, fontWeight: '600', color: CoresTexto.escuro },
  trato: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tratoNome: { flex: 1 },
  dias: { width: 76 },
  unidade: { fontSize: 14, color: CoresTexto.suave },
  link: { alignItems: 'flex-start' },
  ajuda: { fontSize: 13.5, lineHeight: 19, color: CoresTexto.suave },
  erro: { fontSize: 14.5, lineHeight: 20, fontWeight: '600', color: AgroColors.danger },
});
