import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, BottomSheet } from '@/components/ui';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { useConsultaAoVivo, type EtapaCiclo } from '@/database';
import { atribuirEtapa } from '@/services/cicloService';
import { listarColaboradores, TABELAS_MEMBROS, usuarioAtual, type Usuario } from '@/services/usuario';
import { Avatar } from '@/shared/Avatar';
import { CoresTexto, LinkMapa } from './elementos';
import { BolinhaEscolha } from './painel/elementosPainel';

export interface AtribuirEtapaSheetProps {
  visible: boolean;
  /** Etapa a atribuir; a folha guarda a última para sumir deslizando */
  etapa: EtapaCiclo | null;
  /** "Talhão 3 · Milho silagem" */
  contexto: string;
  onClose: () => void;
}

/**
 * "Atribuir" de uma etapa (RF-067): escolhe quem faz; a etapa vira tarefa da
 * pessoa e ela recebe o aviso. A equipe são os membros da fazenda (descem pelo sync).
 */
export function AtribuirEtapaSheet({ visible, etapa, contexto, onClose }: AtribuirEtapaSheetProps) {
  const euId = usuarioAtual().id;
  const { dados: pessoas } = useConsultaAoVivo<Usuario[]>(listarColaboradores, TABELAS_MEMBROS, euId, []);
  const [salvando, setSalvando] = useState(false);

  const escolher = async (pessoa: Usuario | null) => {
    if (!etapa) return;
    setSalvando(true);
    try {
      await atribuirEtapa(etapa.id, pessoa ? { id: pessoa.id, nome: pessoa.nome } : null);
      onClose();
    } catch (erro) {
      Alert.alert('Não deu certo', erro instanceof Error ? erro.message : 'Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BottomSheet visible={visible} title={etapa ? `Atribuir ${etapa.nome}` : 'Atribuir'} subtitle={contexto} onClose={onClose}>
      <View style={estilos.conteudo}>
        {pessoas.map((pessoa, indice) => (
          <Pressable
            key={pessoa.id}
            onPress={() => escolher(pessoa)}
            disabled={salvando}
            accessibilityRole="radio"
            accessibilityState={{ checked: etapa?.responsavelId === pessoa.id }}
            style={({ pressed }) => [estilos.pessoa, indice > 0 && estilos.divisor, pressed && estilos.pressionado]}>
            <Avatar nome={pessoa.nome} avatarUrl={pessoa.avatarUrl} usuarioId={pessoa.id} tamanho={36} />
            <Text style={estilos.nome}>
              {pessoa.nome}
              {pessoa.id === euId ? <Text style={estilos.voce}> (você)</Text> : null}
            </Text>
            <BolinhaEscolha escolhida={etapa?.responsavelId === pessoa.id} />
          </Pressable>
        ))}
        {etapa?.responsavelId ? (
          <View style={estilos.tirar}>
            <LinkMapa rotulo="Tirar o responsável" cor={AgroColors.danger} onPress={() => escolher(null)} />
          </View>
        ) : null}
        <View style={estilos.nota}>
          <AppIcon name="info" size={18} color={CoresTexto.suave} />
          <Text style={estilos.notaTexto}>
            Equipe de exemplo: as pessoas vêm do sistema online de colaboradores quando ele existir.
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({
  pressionado: { opacity: 0.7 },
  conteudo: { paddingTop: 4, gap: Spacing.sm },
  pessoa: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56 },
  divisor: { borderTopWidth: 1, borderTopColor: AgroColors.divider },
  nome: { flex: 1, fontSize: 16.5, fontWeight: '600', color: CoresTexto.escuro },
  voce: { fontWeight: '400', color: CoresTexto.suave },
  tirar: { alignItems: 'flex-start' },
  nota: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: AgroColors.surfaceMuted,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  notaTexto: { flex: 1, fontSize: 13.5, lineHeight: 19, color: CoresTexto.suave },
});
