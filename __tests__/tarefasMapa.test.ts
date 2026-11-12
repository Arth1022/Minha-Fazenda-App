import { eq } from 'drizzle-orm';

import { etapasDoInicio, linhaDoTempoPrevista, MODELOS_PRONTOS } from '@/features/mapa/services/plantio';
import {
  atribuirEtapa,
  cancelarCiclo,
  concluirTarefa,
  etapasDoCiclo,
  iniciarCiclo,
  tarefasDe,
} from '@/services/cicloService';
import { avisarPessoa, listarNotificacoesAgendadas } from '@/services/notificacoes';
import { criarTalhao } from '@/services/talhaoService';
import { listarColaboradores, podeAtribuirTarefas, usuarioAtual } from '@/services/usuario';
import type { Coordenada } from '@/utils/geoMath';
import {
  db,
  etapasCiclo,
  FAZENDA_TESTE,
  fazendaMembros,
  initTestDatabase,
  usuarios,
  fecharTestDatabase,
} from './support/database';

/** Membros da fazenda como descem pelo sync (no celular essas tabelas são só leitura). */
async function equipeDaFazenda() {
  const pessoas = [
    { id: 'usuario-beta', nome: 'Beta', papel: 'owner' as const },
    { id: 'colaborador-joao', nome: 'João', papel: 'collaborator' as const },
    { id: 'colaborador-maria', nome: 'Maria', papel: 'collaborator' as const },
  ];
  for (const p of pessoas) {
    await db.insert(usuarios).values({ id: p.id, nome: p.nome });
    await db.insert(fazendaMembros).values({ id: `m-${p.id}`, fazendaId: FAZENDA_TESTE, usuarioId: p.id, papel: p.papel });
  }
}

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

async function rejeita(acao: () => Promise<unknown>): Promise<string | null> {
  try {
    await acao();
    return null;
  } catch (erro) {
    return erro instanceof Error ? erro.message : String(erro);
  }
}

const quadrado = (x: number): Coordenada[] => {
  const L = 0.0008983;
  return [
    [-47 + x, 0],
    [-47 + x + L, 0],
    [-47 + x + L, L],
    [-47 + x, L],
  ];
};

const HOJE = new Date(2026, 10, 10, 12);
const MILHO = MODELOS_PRONTOS[0];

function plantarMilho(areaId: string, plantio: Date) {
  return iniciarCiclo({
    areaId,
    cultura: MILHO.nome,
    modeloId: MILHO.id,
    dataPlantio: plantio,
    areaHa: 12.6,
    taxaKgHa: 20,
    sacoKg: 20,
    sementesKg: 252,
    sacos: 13,
    etapas: etapasDoInicio(linhaDoTempoPrevista(MILHO.etapas, plantio), plantio, HOJE),
  });
}

async function runTarefasMapaTest() {
  console.log('👷 MINHA FAZENDA - TAREFAS DA EQUIPE (FASE 6, COM DADOS DE EXEMPLO)\n');

  await initTestDatabase();
  await equipeDaFazenda();

  // Equipe: os membros da fazenda (descem pelo sync)
  const eu = usuarioAtual();
  const equipe = await listarColaboradores();
  check(
    equipe[0].id === eu.id && equipe.some((p) => p.nome === 'João') && new Set(equipe.map((p) => p.id)).size === equipe.length,
    'equipe da fazenda: quem está com o celular primeiro, sem repetir'
  );
  check(
    podeAtribuirTarefas(eu) && !podeAtribuirTarefas({ id: 'x', nome: 'João', papel: 'collaborator' }),
    'só o dono atribui (RF-067)'
  );

  // Aviso para a pessoa (RF-070): sem API, só sai notificação no próprio celular
  check((await avisarPessoa('colaborador-joao', { titulo: 'Teste', mensagem: 'x' })) === 'semEnvio', 'aviso para outra pessoa fica sem envio até a API');
  check((await avisarPessoa(eu.id, { titulo: 'Para mim', mensagem: 'x', url: '/tarefas' })) === 'local', 'aviso para quem está com o celular sai como notificação local');

  const talhao = await criarTalhao({ nome: 'Talhão 3', tipo: 'lavoura', coordenadas: quadrado(0) });
  const cicloId = await plantarMilho(talhao.id, new Date(2026, 9, 20));
  const etapas = await etapasDoCiclo(cicloId);
  const plantio = etapas.find((e) => e.tipo === 'plantio')!;
  const adubacao = etapas.find((e) => e.nome === 'Adubação de cobertura')!;
  const pulverizacao = etapas.find((e) => e.nome === 'Pulverização')!;

  // Atribuir (RF-067)
  await atribuirEtapa(adubacao.id, { id: 'colaborador-joao', nome: 'João' }, HOJE);
  let [linha] = await db.select().from(etapasCiclo).where(eq(etapasCiclo.id, adubacao.id));
  check(
    linha.responsavelId === 'colaborador-joao' &&
      linha.responsavelNome === 'João' &&
      linha.atribuidaPor === eu.id &&
      linha.atribuidaEm?.getTime() === HOJE.getTime(),
    'etapa atribuída vira tarefa do João (tela 23: "J João")'
  );
  await atribuirEtapa(pulverizacao.id, { id: eu.id, nome: eu.nome });
  const avisos = await listarNotificacoesAgendadas();
  check(
    avisos.some((a) => a.titulo === 'Nova tarefa: Pulverização' && a.dados.url === '/tarefas'),
    'tarefa para quem está com o celular: aviso "Nova tarefa" que abre "Minhas tarefas"'
  );
  check(
    (await rejeita(() => atribuirEtapa(plantio.id, { id: 'colaborador-joao', nome: 'João' }))) === 'Etapa feita não vira tarefa.',
    'etapa já feita não é atribuída'
  );

  // Minhas tarefas (RF-068)
  const minhas = await tarefasDe(eu.id);
  const doJoao = await tarefasDe('colaborador-joao');
  check(
    minhas.length === 1 &&
      minhas[0].etapa.nome === 'Pulverização' &&
      minhas[0].areaNome === 'Talhão 3' &&
      minhas[0].cultura === 'Milho silagem' &&
      doJoao.length === 1 &&
      doJoao[0].etapa.nome === 'Adubação de cobertura',
    'cada pessoa vê as próprias tarefas, com a área e a cultura (tela 27)'
  );

  // Trocar e tirar o responsável
  await atribuirEtapa(adubacao.id, { id: 'colaborador-carlos', nome: 'Carlos' });
  [linha] = await db.select().from(etapasCiclo).where(eq(etapasCiclo.id, adubacao.id));
  check(linha.responsavelNome === 'Carlos' && (await tarefasDe('colaborador-joao')).length === 0, 'trocar o responsável passa a tarefa para o Carlos');
  await atribuirEtapa(adubacao.id, null);
  [linha] = await db.select().from(etapasCiclo).where(eq(etapasCiclo.id, adubacao.id));
  check(linha.responsavelId === null && linha.responsavelNome === null && linha.atribuidaPor === null, 'tirar o responsável volta a etapa para "+ Atribuir"');

  // Concluir a tarefa conclui a etapa (RF-069)
  await concluirTarefa(pulverizacao.id, new Date(2026, 10, 12));
  [linha] = await db.select().from(etapasCiclo).where(eq(etapasCiclo.id, pulverizacao.id));
  const depois = await tarefasDe(eu.id);
  check(
    linha.realizadaEm?.getTime() === new Date(2026, 10, 12).getTime() && depois[0].etapa.realizadaEm !== null,
    'concluir a tarefa marca a etapa como feita na linha do tempo; ela vai para "Feitas"'
  );

  // Atribuída por outra pessoa: concluir avisa quem atribuiu (sem API, fica sem envio, sem erro)
  await atribuirEtapa(adubacao.id, { id: eu.id, nome: eu.nome });
  await db.update(etapasCiclo).set({ atribuidaPor: 'colaborador-maria' }).where(eq(etapasCiclo.id, adubacao.id));
  await concluirTarefa(adubacao.id, new Date(2026, 10, 14));
  [linha] = await db.select().from(etapasCiclo).where(eq(etapasCiclo.id, adubacao.id));
  check(linha.realizadaEm !== null, 'concluir tarefa atribuída por outra pessoa funciona sem a API');

  // Ciclo cancelado: as tarefas dele saem da lista
  const colheita = (await etapasDoCiclo(cicloId)).find((e) => e.tipo === 'colheita')!;
  await atribuirEtapa(colheita.id, { id: eu.id, nome: eu.nome });
  await cancelarCiclo(cicloId);
  check(
    (await tarefasDe(eu.id)).every((t) => t.etapa.id !== colheita.id),
    'ciclo cancelado: a tarefa some de "Minhas tarefas"'
  );
  check(
    (await rejeita(() => atribuirEtapa(colheita.id, { id: eu.id, nome: eu.nome }))) === 'Este ciclo já foi encerrado.',
    'etapa de ciclo encerrado não é atribuída'
  );

  console.log('\n🎉 TAREFAS DA EQUIPE OK!');
}

runTarefasMapaTest().then(fecharTestDatabase).catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
