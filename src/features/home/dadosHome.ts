import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import {
  animais,
  atualizar,
  avisosFazenda,
  daFazenda,
  db,
  dosesAplicadas,
  lotes,
  maquinas,
  movimentacoes,
  naoApagado,
  novoRegistro,
  talhoes,
  tarefaEventos,
  tarefas,
  tratamentos,
  usosMaquina,
  usuarios,
  type AvisoFazenda,
  type CategoriaTarefa,
  type TipoTarefaEvento,
} from '@/database';
import { diasComDose, proximaDosePendente } from '@/features/rebanho/services/doses';
import {
  listarColaboradores,
  podeAtribuirTarefas,
  usuarioAtual,
  type Usuario,
} from '@/services/usuario';
import { normalizarTexto } from '@/utils';
import { adicionarDias, diasEntre, inicioDoDia } from '@/utils/date';

export const TABELAS_HOME = [
  'tarefas',
  'tarefa_eventos',
  'tratamentos',
  'doses_aplicadas',
  'animais',
  'lotes',
  'maquinas',
  'usos_maquina',
  'movimentacoes',
  'talhoes',
  'avisos_fazenda',
  'usuarios',
  'fazenda_membros',
] as const;

/** Janela máxima (em dias a partir de hoje) para exibir doses futuras no bloco de atenção. */
export const DIAS_JANELA_DOSE_HOME = 7;

export interface ItemAtencaoHome {
  id: string;
  tipo: 'tarefa' | 'dose';
  titulo: string;
  subtitulo: string;
  urgente: boolean;
  maquinaParada: boolean;
  categoria: CategoriaTarefa | 'dose';
  prioridade: number;
  timestampOrdenacao: number;
  destinoHref: '/estoque' | `/animal/${string}` | `/lote/${string}`;
}

export interface NumerosDoDiaHome {
  cabecas: number;
  tarefasAbertas: number;
  maquinasEmUso: number;
  totalMaquinas: number;
}

export interface EventoFazendaHome {
  id: string;
  tipo: 'tarefa' | 'maquina' | 'movimentacao';
  ator: string;
  acao: string;
  ocorridoEm: Date;
  tempoRelativo: string;
}

export interface ResumoHome {
  ehAdmin: boolean;
  itensAtencao: ItemAtencaoHome[];
  numeros: NumerosDoDiaHome;
  aviso: AvisoFazenda | null;
  eventosDoDia: EventoFazendaHome[];
}

export function formatarTempoRelativoCurto(data: Date, agora = new Date()): string {
  const diffMs = Math.max(0, agora.getTime() - data.getTime());
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = diasEntre(inicioDoDia(data), inicioDoDia(agora));
  if (dias === 1) return 'ontem';
  return `há ${dias} d`;
}

function formatarQuandoDose(diaDose: Date, hoje: Date): string {
  const dias = diasEntre(inicioDoDia(hoje), inicioDoDia(diaDose));
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

function verboEventoTarefa(tipo: TipoTarefaEvento): string {
  switch (tipo) {
    case 'criada':
      return 'relatou';
    case 'assumida':
      return 'pegou';
    case 'iniciada':
      return 'iniciou';
    case 'concluida':
      return 'concluiu';
    case 'atribuida':
      return 'atribuiu';
    case 'liberada':
      return 'soltou';
    case 'cancelada':
      return 'cancelou';
    case 'reaberta':
      return 'reabriu';
    case 'observacao':
      return 'comentou em';
  }
}

function formatarAlvoLote(loteNome: string): string {
  return /^lote\b/i.test(loteNome.trim()) ? loteNome.trim() : `Lote ${loteNome.trim()}`;
}

function formatarAlvoAnimal(nome: string | null, brinco: string): string {
  const num = brinco.replace(/^#/, '');
  return nome ? `${nome} (#${num})` : `Brinco #${num}`;
}

/**
 * Busca as tarefas abertas/em andamento (todas no admin, só do usuário no colaborador)
 * e agrega as doses de tratamento pendentes nos próximos dias em consultas indexadas sem N+1.
 */
export async function listarItensAtencaoHome(
  usuario: Usuario = usuarioAtual(),
  agora = new Date()
): Promise<ItemAtencaoHome[]> {
  const ehAdmin = podeAtribuirTarefas(usuario);
  const inicioHoje = inicioDoDia(agora);

  const [linhasTarefas, linhasTratamentos] = await Promise.all([
    db
      .select({
        id: tarefas.id,
        titulo: tarefas.titulo,
        categoria: tarefas.categoria,
        descricao: tarefas.descricao,
        urgente: tarefas.urgente,
        status: tarefas.status,
        responsavelId: tarefas.responsavelId,
        responsavelNome: usuarios.nome,
        prazo: tarefas.prazo,
        maquinaParada: tarefas.maquinaParada,
        createdAt: tarefas.createdAt,
      })
      .from(tarefas)
      .leftJoin(usuarios, eq(usuarios.id, tarefas.responsavelId))
      .where(
        and(
          daFazenda(tarefas),
          inArray(tarefas.status, ['aberta', 'em_andamento']),
          ehAdmin ? undefined : eq(tarefas.responsavelId, usuario.id)
        )
      )
      .orderBy(
        desc(tarefas.urgente),
        desc(tarefas.maquinaParada),
        sql`${tarefas.prazo} is null`,
        asc(tarefas.prazo),
        desc(tarefas.createdAt)
      ),
    db
      .select({
        id: tratamentos.id,
        animalId: tratamentos.animalId,
        medicamento: tratamentos.medicamento,
        dataInicio: tratamentos.dataInicio,
        dataFim: tratamentos.dataFim,
        diasSemana: tratamentos.diasSemana,
        horario: tratamentos.horario,
        intervaloHoras: tratamentos.intervaloHoras,
        avisoMinutosAntes: tratamentos.avisoMinutosAntes,
        grupoAplicacaoId: tratamentos.grupoAplicacaoId,
        animalNome: animais.nome,
        animalBrinco: animais.brinco,
        loteId: animais.loteId,
        loteNome: lotes.nome,
      })
      .from(tratamentos)
      .innerJoin(
        animais,
        and(eq(animais.id, tratamentos.animalId), eq(animais.status, 'ativo'), naoApagado(animais))
      )
      .leftJoin(lotes, and(eq(lotes.id, animais.loteId), naoApagado(lotes)))
      .where(
        and(
          daFazenda(tratamentos),
          or(isNull(tratamentos.dataFim), gte(tratamentos.dataFim, inicioHoje))
        )
      ),
  ]);

  const itens: ItemAtencaoHome[] = linhasTarefas.map((t) => {
    const nomeResp =
      t.responsavelId === usuario.id
        ? usuario.nome || 'você'
        : t.responsavelNome || t.responsavelId;
    const quemTexto = t.responsavelId ? `com ${nomeResp}` : 'ninguém pegou ainda';
    const descCurta = t.descricao?.trim();
    const subtitulo =
      !t.urgente && descCurta ? `${descCurta} · ${quemTexto}` : quemTexto;

    const prioridade = t.urgente ? 1 : t.maquinaParada ? 2 : 4;
    const timestampOrdenacao = t.prazo ? t.prazo.getTime() : (t.createdAt?.getTime() ?? 0);

    return {
      id: `tarefa:${t.id}`,
      tipo: 'tarefa',
      titulo: t.titulo,
      subtitulo,
      urgente: t.urgente,
      maquinaParada: t.maquinaParada,
      categoria: t.categoria,
      prioridade,
      timestampOrdenacao,
      destinoHref: '/estoque',
    };
  });

  if (linhasTratamentos.length > 0) {
    const idsTratamentos = linhasTratamentos.map((t) => t.id);
    const dosesRows = await db
      .select({
        tratamentoId: dosesAplicadas.tratamentoId,
        dia: dosesAplicadas.dia,
      })
      .from(dosesAplicadas)
      .where(
        and(
          daFazenda(dosesAplicadas),
          inArray(dosesAplicadas.tratamentoId, idsTratamentos)
        )
      );

    const confirmadasPorTratamento = new Map<string, Date[]>();
    for (const row of dosesRows) {
      const lista = confirmadasPorTratamento.get(row.tratamentoId);
      if (lista) lista.push(row.dia);
      else confirmadasPorTratamento.set(row.tratamentoId, [row.dia]);
    }

    // Agrupa doses aplicadas em lote (mesmo grupoAplicacaoId ou mesmo lote + remédio + dia + índice)
    const gruposDose = new Map<
      string,
      {
        id: string;
        medicamento: string;
        indice: number;
        totalDias: number;
        dia: Date;
        loteId: string | null;
        loteNome: string | null;
        animalId: string;
        animalNome: string | null;
        animalBrinco: string;
        quantidadeAnimais: number;
      }
    >();

    for (const trat of linhasTratamentos) {
      const agenda = {
        dataInicio: trat.dataInicio,
        dataFim: trat.dataFim,
        diasSemana: trat.diasSemana,
        horario: trat.horario,
        intervaloHoras: trat.intervaloHoras,
        avisoMinutosAntes: trat.avisoMinutosAntes,
      };
      const confirmados = confirmadasPorTratamento.get(trat.id) ?? [];
      const pendente = proximaDosePendente(agenda, confirmados, agora);
      if (!pendente) continue;

      const diasAteDose = diasEntre(inicioHoje, inicioDoDia(pendente.dia));
      if (diasAteDose < 0 || diasAteDose > DIAS_JANELA_DOSE_HOME) continue;

      const todasDoses = diasComDose(agenda, agora);
      const ordemDose =
        todasDoses.findIndex((d) => d.dia.getTime() === pendente.dia.getTime()) + 1 || pendente.indice;

      const chaveGrupo =
        trat.grupoAplicacaoId ??
        (trat.loteId
          ? `lote:${trat.loteId}:${normalizarTexto(trat.medicamento)}:${pendente.dia.getTime()}:${ordemDose}`
          : `trat:${trat.id}`);

      const existente = gruposDose.get(chaveGrupo);
      if (existente) {
        existente.quantidadeAnimais += 1;
      } else {
        gruposDose.set(chaveGrupo, {
          id: trat.id,
          medicamento: trat.medicamento,
          indice: ordemDose,
          totalDias: todasDoses.length,
          dia: pendente.dia,
          loteId: trat.loteId,
          loteNome: trat.loteNome,
          animalId: trat.animalId,
          animalNome: trat.animalNome,
          animalBrinco: trat.animalBrinco,
          quantidadeAnimais: 1,
        });
      }
    }

    for (const grupo of gruposDose.values()) {
      const ehDoseUnica = grupo.totalDias === 1 && grupo.indice === 1;
      const titulo = ehDoseUnica
        ? `Dose de ${grupo.medicamento}`
        : `${grupo.indice}ª dose de ${grupo.medicamento}`;

      const alvoTexto = grupo.loteNome
        ? formatarAlvoLote(grupo.loteNome)
        : grupo.quantidadeAnimais > 1
          ? `${grupo.quantidadeAnimais} animais`
          : formatarAlvoAnimal(grupo.animalNome, grupo.animalBrinco);

      const quandoTexto = formatarQuandoDose(grupo.dia, agora);
      const diasAte = diasEntre(inicioHoje, inicioDoDia(grupo.dia));

      itens.push({
        id: `dose:${grupo.id}`,
        tipo: 'dose',
        titulo,
        subtitulo: `${alvoTexto} · ${quandoTexto}`,
        urgente: false,
        maquinaParada: false,
        categoria: 'dose',
        prioridade: diasAte <= 0 ? 2 : 3,
        timestampOrdenacao: grupo.dia.getTime(),
        destinoHref: grupo.loteId ? `/lote/${grupo.loteId}` : `/animal/${grupo.animalId}`,
      });
    }
  }

  itens.sort((a, b) => {
    if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
    return a.timestampOrdenacao - b.timestampOrdenacao;
  });

  return itens;
}

/**
 * Busca os 3 indicadores numéricos do dia em paralelo usando índices locais.
 */
export async function obterNumerosDoDiaHome(): Promise<NumerosDoDiaHome> {
  const [[resAnimais], [resTarefas], [resTotalMaq], [resMaqEmUso]] = await Promise.all([
    db
      .select({ total: count() })
      .from(animais)
      .where(and(daFazenda(animais), eq(animais.status, 'ativo'))),
    db
      .select({ total: count() })
      .from(tarefas)
      .where(and(daFazenda(tarefas), inArray(tarefas.status, ['aberta', 'em_andamento']))),
    db
      .select({ total: count() })
      .from(maquinas)
      .where(and(daFazenda(maquinas), ne(maquinas.status, 'inativa'))),
    db
      .select({
        total: sql<number>`count(distinct ${usosMaquina.maquinaId})`.mapWith(Number),
      })
      .from(usosMaquina)
      .where(and(daFazenda(usosMaquina), isNull(usosMaquina.fim))),
  ]);

  return {
    cabecas: resAnimais?.total ?? 0,
    tarefasAbertas: resTarefas?.total ?? 0,
    maquinasEmUso: resMaqEmUso?.total ?? 0,
    totalMaquinas: resTotalMaq?.total ?? 0,
  };
}

/**
 * Retorna o aviso ativo mais recente da fazenda.
 */
export async function obterAvisoAtivoHome(): Promise<AvisoFazenda | null> {
  const [aviso] = await db
    .select()
    .from(avisosFazenda)
    .where(and(daFazenda(avisosFazenda), eq(avisosFazenda.ativo, true)))
    .orderBy(desc(avisosFazenda.createdAt))
    .limit(1);
  return aviso ?? null;
}

/**
 * Publica um novo aviso na fazenda, desativando avisos anteriores na mesma transação.
 */
export async function publicarAvisoFazenda(
  mensagem: string,
  autor: Usuario = usuarioAtual(),
  agora = new Date()
): Promise<AvisoFazenda> {
  const texto = mensagem.trim();
  if (!texto) throw new Error('Informe a mensagem do aviso.');

  const autorNome = autor.nome?.trim() || 'Admin';

  return db.transaction(async (tx) => {
    await tx
      .update(avisosFazenda)
      .set(atualizar({ ativo: false }))
      .where(and(daFazenda(avisosFazenda), eq(avisosFazenda.ativo, true)));

    const [criado] = await tx
      .insert(avisosFazenda)
      .values({
        ...novoRegistro({
          mensagem: texto,
          autorNome,
          ativo: true,
        }),
        createdBy: autor.id,
        createdAt: agora,
        updatedAt: agora,
      })
      .returning();

    return criado;
  });
}

/**
 * Arquiva (oculta) um aviso ativo da fazenda.
 */
export async function arquivarAvisoFazenda(id: string): Promise<void> {
  await db
    .update(avisosFazenda)
    .set(atualizar({ ativo: false }))
    .where(and(daFazenda(avisosFazenda), eq(avisosFazenda.id, id)));
}

/**
 * Eventos ocorridos no dia de hoje na fazenda (tarefas/ocorrências, usos de máquinas
 * e movimentações de rebanho), ordenados do mais recente ao mais antigo.
 */
export async function listarEventosDoDiaHome(agora = new Date()): Promise<EventoFazendaHome[]> {
  const inicio = inicioDoDia(agora);
  const fim = adicionarDias(inicio, 1);
  const eu = usuarioAtual();

  const [evTarefas, evMaquinas, evMovimentacoes, membrosRows] = await Promise.all([
    db
      .select({
        id: tarefaEventos.id,
        tipo: tarefaEventos.tipo,
        autorId: tarefaEventos.autorId,
        autorNome: usuarios.nome,
        ocorridoEm: tarefaEventos.ocorridoEm,
        tarefaTitulo: tarefas.titulo,
      })
      .from(tarefaEventos)
      .innerJoin(tarefas, and(eq(tarefas.id, tarefaEventos.tarefaId), naoApagado(tarefas)))
      .leftJoin(usuarios, eq(usuarios.id, tarefaEventos.autorId))
      .where(
        and(
          daFazenda(tarefaEventos),
          gte(tarefaEventos.ocorridoEm, inicio),
          lt(tarefaEventos.ocorridoEm, fim)
        )
      )
      .orderBy(desc(tarefaEventos.ocorridoEm)),
    db
      .select({
        id: usosMaquina.id,
        inicio: usosMaquina.inicio,
        fim: usosMaquina.fim,
        operador: usosMaquina.operador,
        kmTotal: usosMaquina.kmTotal,
        maquinaNome: maquinas.nome,
      })
      .from(usosMaquina)
      .innerJoin(maquinas, and(eq(maquinas.id, usosMaquina.maquinaId), naoApagado(maquinas)))
      .where(
        and(
          daFazenda(usosMaquina),
          or(
            and(gte(usosMaquina.inicio, inicio), lt(usosMaquina.inicio, fim)),
            and(gte(usosMaquina.fim, inicio), lt(usosMaquina.fim, fim))
          )
        )
      )
      .orderBy(desc(sql`coalesce(${usosMaquina.fim}, ${usosMaquina.inicio})`)),
    db
      .select({
        id: sql<string>`min(${movimentacoes.id})`,
        entradaEm: movimentacoes.entradaEm,
        registradoPor: movimentacoes.registradoPor,
        areaNome: talhoes.nome,
        loteNome: lotes.nome,
        totalAnimais: count(movimentacoes.id),
      })
      .from(movimentacoes)
      .innerJoin(talhoes, and(eq(talhoes.id, movimentacoes.areaId), naoApagado(talhoes)))
      .leftJoin(lotes, and(eq(lotes.id, movimentacoes.loteId), naoApagado(lotes)))
      .where(
        and(
          daFazenda(movimentacoes),
          gte(movimentacoes.entradaEm, inicio),
          lt(movimentacoes.entradaEm, fim)
        )
      )
      .groupBy(
        movimentacoes.entradaEm,
        movimentacoes.areaId,
        movimentacoes.loteId,
        movimentacoes.registradoPorId
      )
      .orderBy(desc(movimentacoes.entradaEm)),
    listarColaboradores(),
  ]);

  const nomesPorId = new Map<string, string>();
  for (const m of membrosRows) nomesPorId.set(m.id, m.nome);
  if (eu.id && eu.nome) nomesPorId.set(eu.id, eu.nome);

  const eventos: EventoFazendaHome[] = [];

  for (const ev of evTarefas) {
    const nomeAutor =
      ev.autorNome ||
      (ev.autorId ? nomesPorId.get(ev.autorId) : undefined) ||
      (ev.autorId === eu.id ? eu.nome : undefined) ||
      (ev.autorId ? ev.autorId.replace(/^colaborador-/, '') : 'Equipe');
    const autorFormatado = nomeAutor.charAt(0).toUpperCase() + nomeAutor.slice(1);

    eventos.push({
      id: `tev:${ev.id}`,
      tipo: 'tarefa',
      ator: autorFormatado,
      acao: `${verboEventoTarefa(ev.tipo)} ${ev.tarefaTitulo}`,
      ocorridoEm: ev.ocorridoEm,
      tempoRelativo: formatarTempoRelativoCurto(ev.ocorridoEm, agora),
    });
  }

  for (const uso of evMaquinas) {
    const momento = uso.fim ?? uso.inicio;
    const temKm = typeof uso.kmTotal === 'number' && uso.kmTotal > 0;
    const ator = temKm ? uso.maquinaNome : uso.operador?.trim() || uso.maquinaNome;
    const acao = temKm
      ? `rodou ${uso.kmTotal!.toFixed(1).replace('.', ',')} km`
      : uso.fim
        ? uso.operador
          ? `encerrou uso de ${uso.maquinaNome}`
          : 'encerrou uso'
        : uso.operador
          ? `ligou ${uso.maquinaNome}`
          : 'entrou em uso';

    eventos.push({
      id: `uso:${uso.id}`,
      tipo: 'maquina',
      ator,
      acao,
      ocorridoEm: momento,
      tempoRelativo: formatarTempoRelativoCurto(momento, agora),
    });
  }

  for (const mov of evMovimentacoes) {
    const ator = mov.registradoPor?.trim() || eu.nome || 'Equipe';
    const quemMoveu = mov.loteNome
      ? formatarAlvoLote(mov.loteNome)
      : mov.totalAnimais === 1
        ? '1 animal'
        : `${mov.totalAnimais} cabeças`;

    eventos.push({
      id: `mov:${mov.id}`,
      tipo: 'movimentacao',
      ator,
      acao: `moveu ${quemMoveu} para ${mov.areaNome}`,
      ocorridoEm: mov.entradaEm,
      tempoRelativo: formatarTempoRelativoCurto(mov.entradaEm, agora),
    });
  }

  eventos.sort((a, b) => b.ocorridoEm.getTime() - a.ocorridoEm.getTime());
  return eventos;
}

/**
 * Carrega todos os dados necessários para o Painel Inicial (Home) em paralelo.
 */
export async function carregarResumoHome(
  usuario: Usuario = usuarioAtual(),
  agora = new Date()
): Promise<ResumoHome> {
  const [itensAtencao, numeros, aviso, eventosDoDia] = await Promise.all([
    listarItensAtencaoHome(usuario, agora),
    obterNumerosDoDiaHome(),
    obterAvisoAtivoHome(),
    listarEventosDoDiaHome(agora),
  ]);

  return {
    ehAdmin: podeAtribuirTarefas(usuario),
    itensAtencao,
    numeros,
    aviso,
    eventosDoDia,
  };
}
