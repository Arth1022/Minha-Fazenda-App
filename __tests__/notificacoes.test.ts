// As features importam `expo-notifications`, `react-native` e `@/database`; o
// tsconfig.test.json aponta esses caminhos para ./support (fakes em memória e PowerSync em Node).
import { eq } from 'drizzle-orm';

import type { Lembrete } from '@/dtos';
import { createAnimal } from '@/features/rebanho/data/animais';
import {
  agendarNotificacao,
  alarmeExatoPermitido,
  aoTocarNotificacao,
  cancelarLembretesDoAnimal,
  configurarNotificacoes,
  notificacoesDe,
  parseHorario,
  pedirAlarmeExato,
  pedirPermissaoNotificacoes,
  reagendarLembreteOrdenha,
  reagendarLembretesDoAnimal,
  sincronizarVinculos,
  statusPermissaoNotificacoes,
} from '@/services/notificacoes';
import { gatilhoDoAgendado, montarGatilho } from '@/services/notificacoes/gatilhos';
import { horarioDoAviso } from '@/services/notificacoes/lembretes';
import { fake, IosAuthorizationStatus } from './support/expo-notifications';
import { animais, db, initTestDatabase, notificacoesAgendadas, fecharTestDatabase } from './support/database';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

const AGORA = new Date(2026, 9, 24, 10, 0); // 24/10/2026 10:00
const dia = (d: number, m: number, a = 2026) => new Date(a, m - 1, d);

function lembrete(parcial: Partial<Lembrete> & Pick<Lembrete, 'animalId'>): Lembrete {
  return { id: 'l', tipo: 'dose', data: dia(30, 10), titulo: 'Dose', ...parcial };
}

async function rejeita(acao: () => Promise<unknown>): Promise<boolean> {
  try {
    await acao();
    return false;
  } catch {
    return true;
  }
}

async function runNotificacoesTest() {
  console.log('=========================================================');
  console.log('🔔 MINHA FAZENDA - NOTIFICAÇÕES');
  console.log('=========================================================\n');

  // 1. Horário "HH:mm"
  check(parseHorario('05:30')?.hora === 5 && parseHorario('5:30')?.minuto === 30, 'horário "HH:mm" convertido');
  check(parseHorario('24:00') === null && parseHorario('7h') === null, 'horário inválido rejeitado');

  // 2. Gatilhos
  const daqui1h = new Date(AGORA.getTime() + 3600_000);
  const porData = montarGatilho({ tipo: 'data', data: daqui1h }, 'saude', AGORA);
  check(porData?.type === 'date' && (porData as { channelId?: string }).channelId === 'saude', 'data futura vira gatilho de data no canal');
  check(montarGatilho({ tipo: 'data', data: dia(1, 10) }, 'saude', AGORA) === null, 'data no passado não agenda');
  const diario = montarGatilho({ tipo: 'diario', horario: '05:15' }, 'ordenha', AGORA) as Record<string, unknown>;
  check(diario.type === 'daily' && diario.hour === 5 && diario.minute === 15, 'gatilho diário com hora e minuto');
  const semanal = montarGatilho({ tipo: 'semanal', diaSemana: 2, horario: '08:00' }, 'saude', AGORA) as Record<string, unknown>;
  check(semanal.type === 'weekly' && semanal.weekday === 2, 'gatilho semanal com o dia da semana');
  check(
    (() => {
      try {
        montarGatilho({ tipo: 'diario', horario: '25:00' }, 'ordenha');
        return false;
      } catch {
        return true;
      }
    })(),
    'horário inválido no recorrente gera erro'
  );
  const devolvido = gatilhoDoAgendado({ type: 'weekly', weekday: 3, hour: 6, minute: 10, channelId: 'saude', delivery: 'bestEffort' }) as Record<string, unknown>;
  check(devolvido.type === 'weekly' && devolvido.weekday === 3 && devolvido.hour === 6 && devolvido.channelId === 'saude', 'gatilho devolvido pelo Android volta ao formato de agendamento');
  check(gatilhoDoAgendado({ type: 'timeInterval', seconds: 60 }) === null && gatilhoDoAgendado(null) === null, 'gatilho que o módulo não agenda é ignorado');

  // 3. Configuração: handler e canais
  await configurarNotificacoes();
  check(fake.handler !== null, 'handler registrado (mostra notificação com o app aberto)');
  check(['ordenha', 'saude', 'reproducao'].every((c) => fake.canais.has(c)), 'canais do Android registrados');

  // 4. Permissão
  fake.reset();
  check((await statusPermissaoNotificacoes()) === 'pendente', 'permissão ainda não pedida fica pendente');
  check((await pedirPermissaoNotificacoes()) && fake.pedidosDePermissao === 1, 'pedido de permissão concedido');
  check(fake.canais.size > 0, 'canais criados antes do pedido (exigência do Android 13+)');
  check((await pedirPermissaoNotificacoes()) && fake.pedidosDePermissao === 1, 'já concedida: não pede de novo');
  fake.permissao = { granted: false, canAskAgain: false };
  check(!(await pedirPermissaoNotificacoes()) && fake.pedidosDePermissao === 1, 'negada de vez: não pede, retorna false');
  check((await statusPermissaoNotificacoes()) === 'negada', 'status negada (só pelas configurações do aparelho)');
  fake.permissao = { granted: false, canAskAgain: true, ios: { status: IosAuthorizationStatus.PROVISIONAL } };
  check((await statusPermissaoNotificacoes()) === 'concedida', 'iOS provisória conta como concedida');

  // 5. Agendamento simples
  fake.reset();
  const id = await agendarNotificacao(
    { id: 'teste', titulo: 'Oi', quando: { tipo: 'data', data: daqui1h }, canal: 'saude', url: '/animal/1', dados: { x: 1 } },
    AGORA
  );
  const agendada = fake.agendadas.get('teste');
  check(id === 'teste' && agendada?.content.title === 'Oi', 'notificação agendada com o id informado');
  check(agendada?.content.data.url === '/animal/1' && agendada.content.data.x === 1, 'url e dados vão no conteúdo');
  check((await agendarNotificacao({ titulo: 'Velha', quando: { tipo: 'data', data: dia(1, 1) }, canal: 'saude' }, AGORA)) === null, 'data passada retorna null');

  // 6. Alarme exato (SCHEDULE_EXACT_ALARM)
  check(!(await alarmeExatoPermitido()), 'sem "Alarmes e lembretes" liberado o alarme não é exato');
  check(fake.agendadas.has('teste'), 'sem alarme exato o agendamento normal continua valendo');
  await agendarNotificacao({ id: 'diaria', titulo: 'Ordenha', quando: { tipo: 'diario', horario: '05:00' }, canal: 'ordenha' }, AGORA);
  const vencida = AGORA.getTime() - 60_000; // inexata, atrasada, ainda não entregue
  fake.agendadas.set('atrasada', {
    identifier: 'atrasada',
    content: { title: 'Atrasada', body: null, data: {} },
    trigger: { type: 'date', value: vencida, channelId: 'saude' },
  });
  fake.agendamentos = 0;
  fake.alarmeExatoAoPedir = false;
  check(!(await pedirAlarmeExato(AGORA)) && fake.agendamentos === 0, 'pedido negado: retorna false e não reagenda');
  fake.alarmeExatoAoPedir = true;
  check((await pedirAlarmeExato(AGORA)) && (await alarmeExatoPermitido()), 'pedido concedido: retorna true');
  check(fake.agendamentos === 2, 'concedido: reagenda as pendentes para virarem exatas');
  const reaplicada = fake.agendadas.get('teste');
  check(
    reaplicada?.trigger.value === daqui1h.getTime() &&
      reaplicada.trigger.channelId === 'saude' &&
      reaplicada.content.title === 'Oi' &&
      reaplicada.content.data.url === '/animal/1',
    'reagendada com a mesma data, canal e conteúdo'
  );
  const diaria = fake.agendadas.get('diaria')?.trigger;
  check(diaria?.type === 'daily' && diaria.hour === 5 && diaria.minute === 0 && diaria.channelId === 'ordenha', 'recorrente reagendada no mesmo horário');
  check(fake.agendadas.get('atrasada')?.trigger.value === vencida, 'data vencida não é reagendada (o Android a descartaria)');
  fake.agendamentos = 0;
  check((await pedirAlarmeExato(AGORA)) && fake.agendamentos === 0, 'já liberado: não pede nem reagenda de novo');
  await configurarNotificacoes(AGORA);
  check(fake.agendamentos === 2, 'abertura do app reaplica os agendamentos (permissão mudada fora do app)');

  // 7. Lembretes do animal: vínculo no banco
  await initTestDatabase();
  fake.reset();
  const mimosa = await createAnimal({ brinco: '#201', nome: 'Mimosa' });
  const estrela = await createAnimal({ brinco: '#202', nome: 'Estrela' });
  check(horarioDoAviso(dia(30, 10)).getHours() === 7, 'data sem hora avisa às 07:00');
  check(horarioDoAviso(new Date(2026, 9, 30, 14, 30)).getHours() === 14, 'data com hora avisa na própria hora');

  const ids = await reagendarLembretesDoAnimal(
    mimosa.id,
    [
      lembrete({ id: 'dose-1', animalId: mimosa.id, tipo: 'dose', titulo: 'Dose de Ivermectina' }),
      lembrete({ id: 'parto-1', animalId: mimosa.id, tipo: 'parto', data: dia(5, 12), titulo: 'Parto previsto' }),
      lembrete({ id: 'velho', animalId: mimosa.id, data: dia(1, 10) }),
      lembrete({ id: 'outro', animalId: estrela.id }),
    ],
    AGORA
  );
  check(ids.length === 2 && fake.agendadas.size === 2, 'só os lembretes futuros do próprio animal são agendados');
  const vinculos = await notificacoesDe({ entidade: 'animal', entidadeId: mimosa.id });
  check(vinculos.length === 2 && vinculos.every((v) => ids.includes(v.id)), 'vínculo guardado com o mesmo id do agendamento');
  const parto = [...fake.agendadas.values()].find((n) => n.content.data.tipo === 'parto');
  check(parto?.trigger.channelId === 'reproducao' && parto.content.data.url === `/animal/${mimosa.id}`, 'parto vai no canal de reprodução e abre a ficha');
  check(fake.agendadas.get(ids[0])?.trigger.channelId === 'saude', 'dose vai no canal de saúde');

  await reagendarLembretesDoAnimal(mimosa.id, [lembrete({ id: 'dose-2', animalId: mimosa.id })], AGORA);
  const depois = await notificacoesDe({ entidade: 'animal', entidadeId: mimosa.id });
  check(depois.length === 1 && fake.agendadas.size === 1 && ids.every((i) => !fake.agendadas.has(i)), 'reagendar cancela os antigos no aparelho e no banco');

  await reagendarLembretesDoAnimal(estrela.id, [lembrete({ animalId: estrela.id })], AGORA);
  await cancelarLembretesDoAnimal(mimosa.id);
  check((await notificacoesDe({ entidade: 'animal', entidadeId: mimosa.id })).length === 0, 'saída do animal cancela todos os lembretes dele');
  check(fake.agendadas.size === 1 && (await notificacoesDe({ entidade: 'animal', entidadeId: estrela.id })).length === 1, 'lembretes de outro animal continuam');

  // 8. Ordenha: lembrete diário por turno
  await reagendarLembreteOrdenha('manha', '05:15');
  await reagendarLembreteOrdenha('manha', '05:45');
  const ordenha = await notificacoesDe({ entidade: 'ordenha', entidadeId: 'manha' });
  const gatilhoOrdenha = fake.agendadas.get(ordenha[0]?.id)?.trigger;
  check(ordenha.length === 1 && ordenha[0].disparaEm === null, 'ordenha: um lembrete recorrente por turno');
  check(gatilhoOrdenha?.type === 'daily' && gatilhoOrdenha.minute === 45 && gatilhoOrdenha.channelId === 'ordenha', 'ordenha: diário no horário novo, canal ordenha');
  await reagendarLembreteOrdenha('manha', null);
  check((await notificacoesDe({ entidade: 'ordenha', entidadeId: 'manha' })).length === 0, 'ordenha: horário null desliga o lembrete');
  await reagendarLembreteOrdenha('tarde', '15:00');
  check(await rejeita(() => reagendarLembreteOrdenha('tarde', '99:99')), 'ordenha: horário inválido gera erro');
  const tarde = await notificacoesDe({ entidade: 'ordenha', entidadeId: 'tarde' });
  check(tarde.length === 1 && fake.agendadas.has(tarde[0].id), 'ordenha: horário inválido não apaga o lembrete anterior');
  await reagendarLembreteOrdenha('tarde', null);

  // 9. Sincronização: vínculos de notificações que já dispararam são removidos
  const [daEstrela] = await notificacoesDe({ entidade: 'animal', entidadeId: estrela.id });
  fake.agendadas.delete(daEstrela.id); // o aparelho disparou e descartou
  await sincronizarVinculos();
  check((await db.select().from(notificacoesAgendadas)).length === 0, 'sincronizar remove vínculos sem agendamento no aparelho');

  // 10. Animal apagado do banco: vínculo não depende de chave estrangeira
  await reagendarLembretesDoAnimal(estrela.id, [lembrete({ animalId: estrela.id })], AGORA);
  await db.delete(animais).where(eq(animais.id, estrela.id));
  await cancelarLembretesDoAnimal(estrela.id);
  check(fake.agendadas.size === 0, 'lembretes cancelados mesmo depois de o animal sair do banco');

  // 11. Toque na notificação
  const tocadas: unknown[] = [];
  fake.ultimaResposta = {
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: { request: { content: { data: { url: '/animal/abriu' } } } },
  };
  const remover = aoTocarNotificacao((dados) => tocadas.push(dados.url));
  check(tocadas[0] === '/animal/abriu' && fake.ultimaResposta === null, 'toque que abriu o app é entregue uma vez');
  fake.tocar({ url: '/animal/2' });
  fake.tocar({ url: '/ignorar' }, 'botao-de-acao');
  check(tocadas.length === 2 && tocadas[1] === '/animal/2', 'toque com o app aberto é entregue (ações extras ignoradas)');
  remover();
  fake.tocar({ url: '/animal/3' });
  check(tocadas.length === 2, 'listener removido no cleanup');

  console.log('\n🎉 Notificações OK.');
}

runNotificacoesTest().then(fecharTestDatabase).catch((error) => {
  console.error('\n❌ Falha no teste de notificações:', error);
  process.exit(1);
});
