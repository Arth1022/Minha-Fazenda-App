import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, FichaCard, IconeRedondo, type AppIconName, type TomFicha } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { UsoMaquina } from '@/dtos';
import { formatNumero } from '@/utils/formatters';
import { ATIVIDADE_LABEL, CATEGORIA_PROBLEMA_LABEL, ORIGEM_ABASTECIMENTO_LABEL } from '../../constants';
import { useHistoricoMaquina } from '../../hooks/useHistoricoMaquina';
import { formatarDiaHistorico, type ItemHistorico } from '../../services/historico';
import { marcasDoUso } from '../../services/marcas';
import { duracaoDoUso, formatarDuracao, horaCurta } from '../../services/uso';

const SEM_GPS = 'Sem GPS';

interface Etiqueta {
  texto: string;
  icone?: AppIconName;
  atencao?: boolean;
}

interface LinhaHistorico {
  icone: AppIconName;
  tom: TomFicha;
  titulo: string;
  /** Horário e, quando houver, um detalhe curto */
  detalhe: string;
  /** Operador, atividade, talhão...: linha extra em cinza */
  extra?: string;
  valor?: string;
  valorDestaque?: boolean;
  etiquetas: Etiqueta[];
}

const juntar = (partes: (string | null | undefined | false)[]) => partes.filter(Boolean).join(' · ');

function linhaDoUso(uso: UsoMaquina): LinhaHistorico {
  return {
    icone: 'power',
    tom: 'verde',
    titulo: 'Uso',
    detalhe: `${horaCurta(uso.inicio)} → ${uso.fim ? horaCurta(uso.fim) : 'agora'}`,
    extra: juntar([
      uso.operador,
      uso.atividade ? ATIVIDADE_LABEL[uso.atividade] : null,
      uso.kmTotal !== null ? `${formatNumero(uso.kmTotal, 1)} km` : null,
      uso.areaEstimadaHa !== null ? `${formatNumero(uso.areaEstimadaHa, 1)} ha` : null,
      uso.talhoes?.[0]?.nome,
    ]),
    valor: uso.fim ? formatarDuracao(duracaoDoUso(uso, uso.fim)) : 'Em uso',
    valorDestaque: !uso.fim,
    etiquetas: marcasDoUso(uso).map((m) => ({
      texto: m.texto,
      icone: m.texto === SEM_GPS ? 'mapPinOff' : undefined,
      atencao: m.tom === 'atencao',
    })),
  };
}

function linhaDoItem(item: ItemHistorico): LinhaHistorico {
  switch (item.tipo) {
    case 'uso':
      return linhaDoUso(item.uso);
    case 'abastecimento': {
      const a = item.abastecimento;
      return {
        icone: 'fuel',
        tom: 'verde',
        titulo: 'Abastecimento',
        detalhe: juntar([horaCurta(a.abastecidoEm), ORIGEM_ABASTECIMENTO_LABEL[a.origem]]),
        extra: juntar([
          a.horimetroH !== null ? `horímetro ${formatNumero(a.horimetroH)} h` : null,
          a.operador,
        ]),
        valor: `${formatNumero(a.litros)} L`,
        etiquetas: [
          ...(a.tanqueCheio ? [{ texto: 'Tanque cheio' }] : []),
          ...(a.fotoUri ? [{ texto: 'Com foto' }] : []),
        ],
      };
    }
    case 'horimetro': {
      const l = item.leitura;
      return {
        icone: 'gauge',
        tom: 'verde',
        titulo: 'Horímetro',
        detalhe: juntar([
          horaCurta(l.lidoEm),
          l.estimadoH !== null ? `esperado ${formatNumero(l.estimadoH, 0)} h` : null,
        ]),
        extra: l.operador ?? undefined,
        valor: `${formatNumero(l.valorH)} h`,
        etiquetas: l.fotoUri ? [{ texto: 'Com foto' }] : [],
      };
    }
    case 'problema': {
      const p = item.problema;
      return {
        icone: 'wrench',
        tom: 'saude',
        titulo: `Problema · ${CATEGORIA_PROBLEMA_LABEL[p.categoria]}`,
        detalhe: juntar([horaCurta(p.registradoEm), p.descricao]),
        extra: p.operador ?? undefined,
        etiquetas: [
          p.resolvidaEm
            ? { texto: 'Resolvido' }
            : { texto: p.podeUsar ? 'Em aberto' : 'Não dá para usar', atencao: true },
          ...(p.fotoUri ? [{ texto: 'Com foto' }] : []),
        ],
      };
    }
  }
}

function EtiquetaHistorico({ texto, icone, atencao = false }: Etiqueta) {
  const cor = atencao ? AgroColors.health : AgroColors.textSecondary;
  return (
    <View style={[styles.etiqueta, atencao && styles.etiquetaAtencao]}>
      {icone ? <AppIcon name={icone} size={14} color={cor} /> : null}
      <Text style={[styles.etiquetaTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

function ItemCard({ item }: { item: ItemHistorico }) {
  const linha = linhaDoItem(item);
  return (
    <FichaCard style={styles.card}>
      <View style={styles.linha}>
        <IconeRedondo nome={linha.icone} tom={linha.tom} tamanho={44} />
        <View style={styles.textos}>
          <Text style={styles.titulo}>{linha.titulo}</Text>
          <Text style={styles.detalhe}>{linha.detalhe}</Text>
          {linha.extra ? <Text style={styles.extra}>{linha.extra}</Text> : null}
          {linha.etiquetas.length > 0 ? (
            <View style={styles.etiquetas}>
              {linha.etiquetas.map((e) => (
                <EtiquetaHistorico key={e.texto} {...e} />
              ))}
            </View>
          ) : null}
        </View>
        {linha.valor ? (
          <Text style={[styles.valor, linha.valorDestaque && styles.valorDestaque]}>{linha.valor}</Text>
        ) : null}
      </View>
    </FichaCard>
  );
}

export interface HistoricoMaquinaTabProps {
  maquinaId: string;
  /** Usos já carregados pela ficha (do implemento: os em que esteve engatado) */
  usos: UsoMaquina[];
  implemento: boolean;
}

/**
 * Aba Histórico da Ficha da máquina: tudo o que aconteceu, por dia e do mais
 * recente — usos, abastecimentos, leituras do horímetro e problemas.
 */
export function HistoricoMaquinaTab({ maquinaId, usos, implemento }: HistoricoMaquinaTabProps) {
  const dias = useHistoricoMaquina(maquinaId, usos);
  const temSemGps = dias.some((d) =>
    d.itens.some((i) => i.tipo === 'uso' && marcasDoUso(i.uso).some((m) => m.texto === SEM_GPS))
  );

  return (
    <>
      {dias.length === 0 ? (
        <Text style={styles.vazio}>
          {implemento
            ? 'Nenhum uso ainda. Escolha este implemento ao ligar o trator que vai puxá-lo.'
            : 'Nenhum uso registrado ainda. Toque em Ligar para começar.'}
        </Text>
      ) : null}

      {dias.map((d) => (
        <View key={d.dia.getTime()} style={styles.dia}>
          <Text style={styles.diaTitulo}>{formatarDiaHistorico(d.dia)}</Text>
          {d.itens.map((item) => (
            <ItemCard key={`${item.tipo}-${item.id}`} item={item} />
          ))}
        </View>
      ))}

      {temSemGps ? (
        <View style={styles.nota}>
          <AppIcon name="info" size={18} color={AgroColors.textSecondary} />
          <Text style={styles.notaTexto}>
            <Text style={styles.notaDestaque}>Sem GPS</Text> quer dizer que o celular estava sem
            localização nesse uso, então os km não foram contados.
          </Text>
        </View>
      ) : null}

      <Text style={styles.rodape}>
        Abastecimentos, leituras do horímetro e problemas também aparecem aqui, na ordem em que
        aconteceram.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  dia: {
    gap: Spacing.md,
  },
  diaTitulo: {
    ...Typography.sectionTitle,
    fontSize: 16,
    color: AgroColors.textSecondary,
    paddingHorizontal: Spacing.half,
  },
  card: {
    paddingVertical: Spacing.three,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  titulo: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  detalhe: {
    ...Typography.bodyMedium,
  },
  extra: {
    ...Typography.caption,
  },
  etiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.half,
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.xs,
    backgroundColor: AgroColors.surfaceMuted,
  },
  etiquetaAtencao: {
    backgroundColor: AgroColors.healthBg,
  },
  etiquetaTexto: {
    ...Typography.captionBold,
  },
  valor: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: AgroColors.textPrimary,
  },
  valorDestaque: {
    color: AgroColors.primary,
  },
  nota: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.half,
  },
  notaTexto: {
    ...Typography.body,
    flex: 1,
    color: AgroColors.textSecondary,
  },
  notaDestaque: {
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  rodape: {
    ...Typography.body,
    color: AgroColors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.sm,
  },
  vazio: {
    ...Typography.body,
    color: AgroColors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
