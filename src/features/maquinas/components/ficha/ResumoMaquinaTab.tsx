import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconeRedondo, type AppIconName, type TomFicha } from '@/components/ui';
import { AgroColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import type { FichaMaquina } from '@/dtos';
import type { FluxoMaquina } from '../../hooks/useFluxosMaquina';
import type { SituacaoMaquina } from '../../hooks/useSituacaoMaquina';
import { ultimoUsoEncerrado } from '../../services/historico';
import { ehImplemento } from '../../services/padroes';
import { ProblemasSecao } from '../ProblemasSecao';
import { UsoSemanalCard } from '../UsoSemanalCard';
import { SituacaoMaquinaCard } from './SituacaoMaquinaCard';

type FluxoRegistro = Exclude<FluxoMaquina, 'ligar'>;

interface OpcaoRegistro {
  fluxo: FluxoRegistro;
  titulo: string;
  detalhe: string;
  icone: AppIconName;
  tom: TomFicha;
}

const ABASTECER: OpcaoRegistro = {
  fluxo: 'abastecer',
  titulo: 'Abastecer',
  detalhe: 'Combustível',
  icone: 'fuel',
  tom: 'verde',
};
const HORIMETRO: OpcaoRegistro = {
  fluxo: 'horimetro',
  titulo: 'Horímetro',
  detalhe: 'Leitura do painel',
  icone: 'gauge',
  tom: 'verde',
};
const PROBLEMA: OpcaoRegistro = {
  fluxo: 'problema',
  titulo: 'Problema',
  detalhe: 'Defeito ou revisão',
  icone: 'wrench',
  tom: 'saude',
};
const USO_ESQUECIDO: OpcaoRegistro = {
  fluxo: 'usoManual',
  titulo: 'Uso esquecido',
  detalhe: 'Lançar depois',
  icone: 'history',
  tom: 'verde',
};

export interface ResumoMaquinaTabProps {
  ficha: FichaMaquina;
  situacao: SituacaoMaquina;
  onRegistrar: (fluxo: FluxoRegistro) => void;
}

/** Aba Resumo da Ficha da máquina: situação, uso na semana e os registros rápidos. */
export function ResumoMaquinaTab({ ficha, situacao, onRegistrar }: ResumoMaquinaTabProps) {
  const { maquina } = ficha;
  const implemento = ehImplemento(maquina);
  // Implemento não tem motor: sem abastecer nem uso próprio para lançar
  const opcoes = [
    implemento ? null : ABASTECER,
    maquina.possuiHorimetro ? HORIMETRO : null,
    PROBLEMA,
    implemento ? null : USO_ESQUECIDO,
  ].filter((o): o is OpcaoRegistro => o !== null);

  return (
    <>
      <SituacaoMaquinaCard
        maquina={maquina}
        condicao={situacao.condicao}
        usoAberto={situacao.usoAberto}
        deOutraPessoa={situacao.deOutraPessoa}
        ultimoUso={ultimoUsoEncerrado(ficha.usosRecentes)}
        engatadoEm={situacao.engatadoEm?.nome ?? null}
      />

      <ProblemasSecao problemas={situacao.problemas} />

      <UsoSemanalCard
        dias={ficha.usoSemanal}
        totalMs={ficha.totalSemanaMs}
        km={ficha.kmSemana}
        ha={ficha.haSemana}
      />

      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Registrar</Text>
        <View style={styles.grade}>
          {opcoes.map((opcao) => (
            <Pressable
              key={opcao.fluxo}
              onPress={() => onRegistrar(opcao.fluxo)}
              style={({ pressed }) => [styles.opcao, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${opcao.titulo}: ${opcao.detalhe}`}>
              <IconeRedondo nome={opcao.icone} tom={opcao.tom} tamanho={44} />
              <View style={styles.opcaoTextos}>
                <Text style={styles.opcaoTitulo}>{opcao.titulo}</Text>
                <Text style={styles.opcaoDetalhe}>{opcao.detalhe}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.md,
  },
  secaoTitulo: {
    ...Typography.sectionTitle,
    fontSize: 16,
    color: AgroColors.textSecondary,
    paddingHorizontal: Spacing.half,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  opcao: {
    flexBasis: '46%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
    ...Shadows.sm,
  },
  pressed: {
    backgroundColor: AgroColors.mintSurface,
  },
  opcaoTextos: {
    flex: 1,
    gap: Spacing.half,
  },
  opcaoTitulo: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  opcaoDetalhe: {
    ...Typography.caption,
    fontSize: 13,
    lineHeight: 17,
    color: AgroColors.textSecondary,
  },
});
