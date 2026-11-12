import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CustomInput } from '@/components/forms';
import {
  AppIcon,
  BottomSheet,
  Button,
  Header,
  ScreenContainer,
  type AppIconName,
} from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { AgroColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useConsultaAoVivo, type CategoriaTarefa } from '@/database';
import { useFazendaAtiva } from '@/features/fazenda';
import { CardUsoAtual } from '@/features/maquinas';
import { ICONE_CATEGORIA_TAREFA } from '@/features/tarefas/RelatarProblemaProvider';
import { useUsuarioAtual } from '@/services/usuario';
import {
  arquivarAvisoFazenda,
  carregarResumoHome,
  formatarTempoRelativoCurto,
  publicarAvisoFazenda,
  TABELAS_HOME,
  type ItemAtencaoHome,
  type ResumoHome,
} from './dadosHome';

const LIMITE_INICIAL_ATENCAO = 3;

const DIAS_SEMANA_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

function obterSaudacao(agora = new Date()): string {
  const h = agora.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatarDataCabecalho(agora = new Date()): string {
  const diaSemana = DIAS_SEMANA_CURTOS[agora.getDay()];
  const dia = agora.getDate();
  const mes = MESES_CURTOS[agora.getMonth()];
  return `${diaSemana}, ${dia} ${mes}`;
}

function iconeItemAtencao(item: ItemAtencaoHome): {
  icon: AppIconName;
  bgColor: string;
  iconColor: string;
} {
  if (item.tipo === 'dose') {
    return {
      icon: 'syringe',
      bgColor: '#DCFCE7',
      iconColor: '#15803D',
    };
  }
  const iconeCat = ICONE_CATEGORIA_TAREFA[item.categoria as CategoriaTarefa] ?? 'wrench';
  if (item.urgente) {
    return {
      icon: iconeCat,
      bgColor: '#C2410C',
      iconColor: '#FFFFFF',
    };
  }
  if (item.maquinaParada || item.categoria === 'maquina') {
    return {
      icon: 'tractor',
      bgColor: '#FFEDD5',
      iconColor: '#C2410C',
    };
  }
  return {
    icon: iconeCat,
    bgColor: AgroColors.forestTint,
    iconColor: AgroColors.forest,
  };
}

const RESUMO_INICIAL: ResumoHome = {
  ehAdmin: true,
  itensAtencao: [],
  numeros: {
    cabecas: 0,
    tarefasAbertas: 0,
    maquinasEmUso: 0,
    totalMaquinas: 0,
  },
  aviso: null,
  eventosDoDia: [],
};

export default function HomeScreen() {
  const router = useRouter();
  const eu = useUsuarioAtual();
  const { fazenda } = useFazendaAtiva();

  const [atencaoExpandida, setAtencaoExpandida] = useState(false);
  const [modalAvisoVisivel, setModalAvisoVisivel] = useState(false);
  const [textoAviso, setTextoAviso] = useState('');
  const [salvandoAviso, setSalvandoAviso] = useState(false);

  const chaveConsulta = `${fazenda?.id ?? 'sem-fazenda'}:${eu.id}:${eu.papel ?? 'sem-papel'}`;
  const { dados: resumo } = useConsultaAoVivo<ResumoHome>(
    () => carregarResumoHome(eu),
    TABELAS_HOME,
    chaveConsulta,
    RESUMO_INICIAL
  );

  const primeiroNome = useMemo(() => {
    const limpo = eu.nome?.trim();
    if (!limpo) return 'Produtor';
    return limpo.split(/\s+/)[0];
  }, [eu.nome]);

  const inicialUsuario = useMemo(
    () => primeiroNome.charAt(0).toUpperCase() || 'A',
    [primeiroNome]
  );

  const totalAtencao = resumo.itensAtencao.length;
  const temMaisDeTres = totalAtencao > LIMITE_INICIAL_ATENCAO;
  const itensAtencaoVisiveis = useMemo(
    () =>
      atencaoExpandida
        ? resumo.itensAtencao
        : resumo.itensAtencao.slice(0, LIMITE_INICIAL_ATENCAO),
    [atencaoExpandida, resumo.itensAtencao]
  );

  const abrirModalAviso = () => {
    if (!resumo.ehAdmin) return;
    setTextoAviso(resumo.aviso?.mensagem ?? '');
    setModalAvisoVisivel(true);
  };

  const handleSalvarAviso = async () => {
    if (!textoAviso.trim()) {
      Alert.alert('Aviso', 'Digite a mensagem do aviso para a fazenda.');
      return;
    }
    setSalvandoAviso(true);
    try {
      await publicarAvisoFazenda(textoAviso, eu);
      setModalAvisoVisivel(false);
    } catch (erro) {
      Alert.alert(
        'Erro ao publicar aviso',
        erro instanceof Error ? erro.message : 'Tente novamente.'
      );
    } finally {
      setSalvandoAviso(false);
    }
  };

  const handleArquivarAviso = async () => {
    if (!resumo.aviso) return;
    setSalvandoAviso(true);
    try {
      await arquivarAvisoFazenda(resumo.aviso.id);
      setModalAvisoVisivel(false);
    } finally {
      setSalvandoAviso(false);
    }
  };

  const cabecalhoHome = (
    <View style={styles.headerContainer}>
      <Header title={APP_NAME} />
      <View style={styles.saudacaoRow}>
        <View style={styles.saudacaoAvatar}>
          <Text style={styles.saudacaoAvatarLetra}>{inicialUsuario}</Text>
        </View>
        <View style={styles.saudacaoTextos}>
          <Text style={styles.saudacaoTitulo} numberOfLines={1}>
            {obterSaudacao()}, {primeiroNome}
          </Text>
          <Text style={styles.saudacaoSubtitulo} numberOfLines={1}>
            {fazenda?.nome ?? APP_NAME} · {formatarDataCabecalho()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer header={cabecalhoHome}>
      {/* Máquina em uso por quem está com o celular (some sem uso aberto) */}
      <CardUsoAtual />

      {/* 1. O que precisa de ação ("Precisa de atenção" p/ admin, "Minhas tarefas" p/ colaborador) */}
      <View style={styles.cardBloco}>
        <View style={styles.cardTopoRow}>
          <View style={styles.cardTopoEsquerda}>
            <Text style={styles.cardBlocoTitulo}>
              {resumo.ehAdmin ? 'Precisa de atenção' : 'Minhas tarefas'}
            </Text>
            {totalAtencao > 0 ? (
              <View style={styles.contadorPill}>
                <Text style={styles.contadorPillTexto}>{totalAtencao}</Text>
              </View>
            ) : null}
          </View>

          {temMaisDeTres ? (
            <Pressable
              onPress={() => setAtencaoExpandida((atual) => !atual)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                atencaoExpandida ? 'Mostrar menos itens' : 'Ver tudo que precisa de atenção'
              }>
              <Text style={styles.verTudoLink}>
                {atencaoExpandida ? 'Recolher' : 'Ver tudo'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {itensAtencaoVisiveis.length === 0 ? (
          <Text style={styles.textoVazio}>
            {resumo.ehAdmin
              ? 'Nenhuma pendência ou dose urgente no momento.'
              : 'Nenhuma tarefa pendente para você agora.'}
          </Text>
        ) : (
          <View style={styles.listaAtencao}>
            {itensAtencaoVisiveis.map((item, idx) => {
              const visual = iconeItemAtencao(item);
              return (
                <React.Fragment key={item.id}>
                  {idx > 0 ? <View style={styles.divisorItem} /> : null}
                  <Pressable
                    onPress={() => router.push(item.destinoHref)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.titulo}. ${item.subtitulo}`}
                    style={({ pressed }) => [
                      styles.itemAtencaoRow,
                      pressed && styles.itemPressed,
                    ]}>
                    <View
                      style={[
                        styles.iconeCirculoAtencao,
                        { backgroundColor: visual.bgColor },
                      ]}>
                      <AppIcon name={visual.icon} size={20} color={visual.iconColor} />
                    </View>

                    <View style={styles.itemAtencaoTextos}>
                      <Text style={styles.itemAtencaoTitulo} numberOfLines={1}>
                        {item.titulo}
                      </Text>
                      <Text style={styles.itemAtencaoSubtitulo} numberOfLines={1}>
                        {item.urgente ? (
                          <>
                            <Text style={styles.urgenteDestaque}>Urgente</Text>
                            {' · '}
                            {item.subtitulo}
                          </>
                        ) : (
                          item.subtitulo
                        )}
                      </Text>
                    </View>

                    <AppIcon
                      name="chevronRight"
                      size={18}
                      color={AgroColors.textPlaceholder}
                    />
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
        )}
      </View>

      {/* 2. Números do dia */}
      <View style={styles.kpiRow}>
        <Pressable
          onPress={() => router.navigate('/rebanho')}
          accessibilityRole="button"
          accessibilityLabel={`${resumo.numeros.cabecas} cabeças no rebanho`}
          style={({ pressed }) => [styles.kpiCard, pressed && styles.itemPressed]}>
          <AppIcon name="cow" size={20} color={AgroColors.forest} />
          <Text style={styles.kpiNumero}>{resumo.numeros.cabecas}</Text>
          <Text style={styles.kpiLegenda}>cabeças</Text>
        </Pressable>

        <Pressable
          onPress={() => router.navigate('/estoque')}
          accessibilityRole="button"
          accessibilityLabel={`${resumo.numeros.tarefasAbertas} tarefas abertas`}
          style={({ pressed }) => [styles.kpiCard, pressed && styles.itemPressed]}>
          <AppIcon name="check" size={20} color={AgroColors.forest} />
          <Text style={styles.kpiNumero}>{resumo.numeros.tarefasAbertas}</Text>
          <Text style={styles.kpiLegenda}>tarefas abertas</Text>
        </Pressable>

        <Pressable
          onPress={() => router.navigate('/maquinas')}
          accessibilityRole="button"
          accessibilityLabel={`${resumo.numeros.maquinasEmUso} de ${resumo.numeros.totalMaquinas} máquinas em uso`}
          style={({ pressed }) => [styles.kpiCard, pressed && styles.itemPressed]}>
          <AppIcon name="tractor" size={20} color={AgroColors.forest} />
          <Text style={styles.kpiNumero} numberOfLines={1} adjustsFontSizeToFit>
            {resumo.numeros.maquinasEmUso} de {resumo.numeros.totalMaquinas}
          </Text>
          <Text style={styles.kpiLegenda}>máquinas em uso</Text>
        </Pressable>
      </View>

      {/* 3. Aviso da fazenda */}
      {resumo.aviso ? (
        <Pressable
          onPress={resumo.ehAdmin ? abrirModalAviso : undefined}
          disabled={!resumo.ehAdmin}
          accessibilityRole={resumo.ehAdmin ? 'button' : 'text'}
          style={({ pressed }) => [
            styles.avisoCard,
            resumo.ehAdmin && pressed && styles.itemPressed,
          ]}>
          <View style={styles.avisoIconeCirculo}>
            <AppIcon name="megaphone" size={20} color="#2563EB" />
          </View>
          <View style={styles.avisoTextos}>
            <Text style={styles.avisoMensagem}>{resumo.aviso.mensagem}</Text>
            <Text style={styles.avisoMeta}>
              Aviso de {resumo.aviso.autorNome} ·{' '}
              {formatarTempoRelativoCurto(resumo.aviso.createdAt ?? new Date())}
            </Text>
          </View>
        </Pressable>
      ) : resumo.ehAdmin ? (
        <Pressable
          onPress={abrirModalAviso}
          accessibilityRole="button"
          accessibilityLabel="Publicar aviso na fazenda"
          style={({ pressed }) => [styles.avisoCard, pressed && styles.itemPressed]}>
          <View style={styles.avisoIconeCirculo}>
            <AppIcon name="megaphone" size={20} color="#2563EB" />
          </View>
          <View style={styles.avisoTextos}>
            <Text style={styles.avisoMensagem}>Publicar aviso para a equipe</Text>
            <Text style={styles.avisoMeta}>
              Toque para fixar um comunicado na tela inicial da fazenda
            </Text>
          </View>
        </Pressable>
      ) : null}

      {/* 4. O que aconteceu hoje ("Na fazenda") */}
      <View style={styles.secaoNaFazenda}>
        <Text style={styles.secaoForaTitulo}>Na fazenda</Text>

        <View style={styles.cardBloco}>
          {resumo.eventosDoDia.length === 0 ? (
            <Text style={styles.textoVazio}>
              Nenhuma atividade registrada hoje na fazenda.
            </Text>
          ) : (
            <ScrollView
              style={styles.eventosScroll}
              contentContainerStyle={styles.eventosScrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator>
              {resumo.eventosDoDia.map((ev, idx) => {
                const inicialAtor = ev.ator.trim().charAt(0).toUpperCase() || 'F';
                return (
                  <React.Fragment key={ev.id}>
                    {idx > 0 ? <View style={styles.divisorItem} /> : null}
                    <View style={styles.eventoRow}>
                      {ev.tipo === 'maquina' ? (
                        <View style={styles.eventoIconeMaquina}>
                          <AppIcon name="tractor" size={16} color={AgroColors.purpleMed} />
                        </View>
                      ) : (
                        <View style={styles.eventoAvatarInicial}>
                          <Text style={styles.eventoAvatarTexto}>{inicialAtor}</Text>
                        </View>
                      )}

                      <Text style={styles.eventoDescricao} numberOfLines={2}>
                        <Text style={styles.eventoAtorBold}>{ev.ator}</Text> {ev.acao}
                      </Text>

                      <Text style={styles.eventoTempo}>{ev.tempoRelativo}</Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Modal para criar/editar aviso da fazenda (Admin) */}
      <BottomSheet
        visible={modalAvisoVisivel}
        title="Aviso da fazenda"
        subtitle="Fica visível para toda a equipe no painel inicial"
        onClose={() => setModalAvisoVisivel(false)}>
        <View style={styles.modalAvisoBody}>
          <CustomInput
            label="Mensagem do aviso *"
            placeholder="Ex.: Vacinação contra aftosa na sexta, 7h, no curral"
            value={textoAviso}
            onChangeText={setTextoAviso}
            multiline
          />
          <View style={styles.modalAvisoBotoes}>
            {resumo.aviso ? (
              <Button
                label="Remover aviso"
                variant="outline"
                loading={salvandoAviso}
                onPress={() => void handleArquivarAviso()}
                style={styles.botaoMetade}
              />
            ) : null}
            <Button
              label="Publicar aviso"
              variant="primary"
              loading={salvandoAviso}
              onPress={() => void handleSalvarAviso()}
              style={styles.botaoMetade}
            />
          </View>
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: AgroColors.headerGreen,
  },
  saudacaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.four,
  },
  saudacaoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saudacaoAvatarLetra: {
    fontSize: 18,
    fontWeight: '700',
    color: AgroColors.textInverse,
  },
  saudacaoTextos: {
    flex: 1,
    gap: 2,
  },
  saudacaoTitulo: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    color: AgroColors.textInverse,
  },
  saudacaoSubtitulo: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.82)',
  },
  cardBloco: {
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    ...Shadows.sm,
  },
  cardTopoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  cardTopoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardBlocoTitulo: {
    ...Typography.sectionTitle,
    fontSize: 15.5,
  },
  contadorPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorPillTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  verTudoLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: AgroColors.forest,
  },
  listaAtencao: {
    marginTop: 2,
  },
  itemAtencaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
  },
  itemPressed: {
    opacity: 0.78,
  },
  iconeCirculoAtencao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAtencaoTextos: {
    flex: 1,
    gap: 2,
  },
  itemAtencaoTitulo: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  itemAtencaoSubtitulo: {
    fontSize: 12.5,
    lineHeight: 16,
    color: AgroColors.textMuted,
  },
  urgenteDestaque: {
    color: '#C2410C',
    fontWeight: '700',
  },
  divisorItem: {
    height: 1,
    backgroundColor: AgroColors.divider,
  },
  textoVazio: {
    ...Typography.caption,
    color: AgroColors.textMuted,
    paddingVertical: Spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 4,
    ...Shadows.sm,
  },
  kpiNumero: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: AgroColors.textPrimary,
    marginTop: 2,
  },
  kpiLegenda: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    color: AgroColors.textMuted,
  },
  avisoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    ...Shadows.sm,
  },
  avisoIconeCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoTextos: {
    flex: 1,
    gap: 3,
  },
  avisoMensagem: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  avisoMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: AgroColors.textMuted,
  },
  secaoNaFazenda: {
    gap: Spacing.two,
  },
  secaoForaTitulo: {
    ...Typography.sectionTitle,
    color: AgroColors.textSecondary,
    paddingHorizontal: 2,
  },
  eventosScroll: {
    maxHeight: 240,
  },
  eventosScrollContent: {
    paddingVertical: 2,
  },
  eventoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
  },
  eventoAvatarInicial: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventoAvatarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  eventoIconeMaquina: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AgroColors.purpleMedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventoDescricao: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
    color: AgroColors.textSecondary,
  },
  eventoAtorBold: {
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  eventoTempo: {
    fontSize: 12,
    color: AgroColors.textPlaceholder,
  },
  modalAvisoBody: {
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  modalAvisoBotoes: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  botaoMetade: {
    flex: 1,
  },
});
