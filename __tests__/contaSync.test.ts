import { and, eq } from 'drizzle-orm';

// O cliente da API lê a URL ao carregar: define antes dos imports dinâmicos abaixo
process.env.EXPO_PUBLIC_API_URL = 'https://api.teste';

import { CORES_AVATAR, corDoAvatar, fnv1a, inicialDoNome } from '@/shared/inicialECor';
import {
  animais,
  apagar,
  atualizar,
  daFazenda,
  db,
  definirFazendaDoContexto,
  FAZENDA_TESTE,
  fazendas,
  fecharTestDatabase,
  initTestDatabase,
  novaFazendaLocal,
  novoRegistro,
  perfilLocal,
  powersync,
  SCHEMA_VERSION,
} from './support/database';

function check(condicao: boolean, mensagem: string) {
  if (!condicao) throw new Error(mensagem);
  console.log(`✅ ${mensagem}`);
}

/** Resposta falsa da API no formato do fetch. */
function resposta(status: number, corpo?: unknown): Response {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(texto || 'null'),
    text: async () => texto,
  } as Response;
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

function regrasDoAvatar() {
  check(inicialDoNome('ágata') === 'Á', '"ágata" mostra "Á"');
  check(inicialDoNome('Álvaro') === 'Á', 'Álvaro → Á (mantém o acento)');
  check(inicialDoNome('ágata') === 'Á', 'acento separado (NFD) também vira "Á"');
  check(inicialDoNome('  joão ') === 'J', 'ignora espaços das pontas');
  check(inicialDoNome('') === '?' && inicialDoNome('   ') === '?' && inicialDoNome(null) === '?', 'nome vazio mostra "?"');
  check(inicialDoNome('🐄') === '?', 'nome sem letra mostra "?"');
  // FNV-1a de 32 bits: vetores conhecidos
  check(fnv1a('') === 0x811c9dc5 && fnv1a('a') === 0xe40c292c && fnv1a('foobar') === 0xbf9cf968, 'FNV-1a confere com os vetores de teste');
  const id = '6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';
  check(corDoAvatar(id) === CORES_AVATAR[fnv1a(id) % 8], 'cor = FNV-1a do id módulo 8');
  check(corDoAvatar(id) === corDoAvatar(id), 'mesma pessoa, mesma cor (em qualquer celular)');
  const luminancia = (hex: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  check(
    CORES_AVATAR.length === 8 && CORES_AVATAR.every((cor) => 1.05 / (luminancia(cor) + 0.05) >= 4.5),
    'as 8 cores têm contraste de pelo menos 4,5:1 com branco'
  );
}

async function clienteDaApi() {
  const { api, configurarSessaoDaApi, ErroApi } = await import('@/shared/api');
  let token = 'vencido';
  let refreshes = 0;
  let encerrou = 0;
  configurarSessaoDaApi({
    accessToken: () => token,
    renovar: async () => {
      refreshes++;
      await pausa(30);
      token = 'novo';
    },
    aoEncerrarSessao: () => {
      encerrou++;
    },
  });

  const chamadas: { url: string; auth: string | null }[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? null;
    chamadas.push({ url, auth });
    await pausa(5);
    if (url.endsWith('/encerrada')) return resposta(401, { erro: 'SESSAO_ENCERRADA', mensagem: 'Entre de novo.' });
    if (auth !== 'Bearer novo') return resposta(401, { erro: 'TOKEN_INVALIDO', mensagem: 'Token vencido' });
    return resposta(200, { ok: url });
  }) as typeof fetch;

  const resultados = await Promise.all([api('/a'), api('/b'), api('/c')]);
  check(refreshes === 1, 'três requisições simultâneas com token vencido geram um refresh só');
  check(
    resultados.length === 3 && chamadas.filter((c) => c.auth === 'Bearer novo').length === 3,
    'cada uma é repetida uma vez com o token novo'
  );
  check(chamadas.every((c) => c.url.startsWith('https://api.teste/')), 'a URL base vem de EXPO_PUBLIC_API_URL');

  let erro: unknown;
  try {
    await api('/encerrada');
  } catch (e) {
    erro = e;
  }
  check(erro instanceof ErroApi && erro.codigo === 'SESSAO_ENCERRADA' && encerrou === 1, 'SESSAO_ENCERRADA avisa a conta e chega como erro');

  globalThis.fetch = (async () => resposta(400, { erro: 'VALIDACAO', mensagem: 'O nome da fazenda é obrigatório' })) as typeof fetch;
  try {
    await api('/auth/registro', { metodo: 'POST', corpo: {}, autenticado: false });
  } catch (e) {
    erro = e;
  }
  const { campoDoErro } = await import('@/features/conta/validacao');
  check(
    erro instanceof ErroApi && erro.message === 'O nome da fazenda é obrigatório' && campoDoErro(erro, ['nome', 'email', 'nomeFazenda']) === 'nomeFazenda',
    'erro de validação mostra a mensagem da API no campo certo'
  );

  globalThis.fetch = (async () => {
    throw new TypeError('Network request failed');
  }) as typeof fetch;
  try {
    await api('/qualquer');
  } catch (e) {
    erro = e;
  }
  check(erro instanceof ErroApi && erro.codigo === 'SEM_CONEXAO', 'sem internet vira SEM_CONEXAO');
  configurarSessaoDaApi(null);
}

async function escritaEFiltros() {
  await initTestDatabase();
  const [mimosa] = await db.insert(animais).values(novoRegistro({ brinco: '1', nome: 'Mimosa' })).returning();
  check(
    mimosa.fazendaId === FAZENDA_TESTE &&
      mimosa.createdBy === 'usuario-beta' &&
      mimosa.createdAt instanceof Date &&
      mimosa.updatedAt?.getTime() === mimosa.createdAt.getTime(),
    'novoRegistro preenche id, fazenda_id, created_by, created_at e updated_at'
  );

  // Outra fazenda no mesmo celular: os dados não se misturam
  definirFazendaDoContexto('outra-fazenda');
  await db.insert(animais).values(novoRegistro({ brinco: '2', nome: 'Estrela' }));
  const daOutra = await db.select().from(animais).where(daFazenda(animais));
  definirFazendaDoContexto(FAZENDA_TESTE);
  const daTeste = await db.select().from(animais).where(daFazenda(animais));
  check(
    daOutra.length === 1 && daOutra[0].nome === 'Estrela' && daTeste.length === 1 && daTeste[0].nome === 'Mimosa',
    'trocar de fazenda troca os dados mostrados, sem misturar'
  );
  definirFazendaDoContexto(null);
  check((await db.select().from(animais).where(daFazenda(animais))).length === 0, 'sem fazenda ativa, nenhuma consulta de domínio devolve dados');
  definirFazendaDoContexto(FAZENDA_TESTE);

  await pausa(5);
  await db.update(animais).set(atualizar({ nome: 'Mimosa II' })).where(eq(animais.id, mimosa.id));
  const [editada] = await db.select().from(animais).where(eq(animais.id, mimosa.id));
  check(editada.updatedAt!.getTime() > mimosa.updatedAt!.getTime(), 'atualizar renova updated_at');

  await apagar(db, animais, mimosa.id);
  const [apagada] = await db.select().from(animais).where(eq(animais.id, mimosa.id));
  check(apagada?.deletedAt instanceof Date, 'apagar preenche deleted_at e a linha continua no banco');
  check((await db.select().from(animais).where(daFazenda(animais))).length === 0, 'registro apagado some das consultas');
}

async function uploadEConnector() {
  await initTestDatabase();
  const { ConectorApi } = await import('@/features/sync/connector');
  const { estaDesatualizado } = await import('@/features/sync/estadoSync');
  const { montarUpload } = await import('@/features/sync/upload');
  const { configurarSessaoDaApi } = await import('@/shared/api');
  configurarSessaoDaApi({ accessToken: () => 'token', renovar: async () => undefined, aoEncerrarSessao: () => undefined });

  // Fila: um animal (PUT), uma edição (PATCH), a fazenda local (só leitura) e o perfil local (local-only)
  const [vaca] = await db.insert(animais).values(novoRegistro({ brinco: '7', nome: 'Pintada' })).returning();
  await db.update(animais).set(atualizar({ nascimentoAproximado: true })).where(eq(animais.id, vaca.id));
  await db.insert(fazendas).values(novaFazendaLocal('Sítio'));
  await db.insert(perfilLocal).values({ nome: 'Eu' });

  const tudo = await powersync.getCrudBatch(100);
  check(!tudo?.crud.some((c) => c.table === 'perfil_local'), 'tabela local-only (perfil_local) não entra na fila de upload');

  const { corpo, descartadas } = montarUpload(tudo!.crud);
  check(corpo.schemaVersion === SCHEMA_VERSION, 'o upload leva o SCHEMA_VERSION');
  check(descartadas === 1 && !corpo.ops.some((o) => o.table === 'fazendas'), 'escritas em fazendas/fazenda_membros/usuarios são descartadas');
  const put = corpo.ops.find((o) => o.op === 'PUT' && o.table === 'animais');
  const patch = corpo.ops.find((o) => o.op === 'PATCH' && o.table === 'animais');
  check(
    put?.id === vaca.id && put.data?.fazenda_id === FAZENDA_TESTE && put.data?.nome === 'Pintada' && put.data?.ja_pariu === false,
    'PUT vai com as colunas em snake_case e booleano como true/false'
  );
  check(patch?.data?.nascimento_aproximado === true && patch.data.updated_at !== undefined, 'PATCH vai só com o que mudou');

  // 200: completa a transação e registra as recusadas
  const enviados: unknown[] = [];
  let status = 200;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    enviados.push(JSON.parse(String(init?.body)));
    if (status === 426) return resposta(426, { erro: 'APP_DESATUALIZADO', mensagem: 'Atualize' });
    if (status === 500) return resposta(500, {});
    return resposta(200, { aplicadas: 1, rejeitadas: [{ table: 'animais', id: vaca.id, codigo: 'VALIDACAO', mensagem: 'x' }] });
  }) as typeof fetch;
  const avisos: unknown[] = [];
  const avisoOriginal = console.warn;
  console.warn = (...args: unknown[]) => avisos.push(args);

  const conector = new ConectorApi();
  const antes = (await powersync.getUploadQueueStats()).count;
  await conector.uploadData(powersync);
  const depois = (await powersync.getUploadQueueStats()).count;
  check(enviados.length === 1 && depois < antes, 'com 200, a transação é completada e sai da fila');
  check(avisos.length === 1, 'as rejeitadas vão para o log');

  // Só a fazenda local na transação: descarta sem enviar
  while ((await powersync.getUploadQueueStats()).count > 0) {
    const n = enviados.length;
    await conector.uploadData(powersync);
    if (enviados.length === n) break;
  }

  // 5xx: lança e a escrita fica na fila (o PowerSync tenta de novo)
  await db.insert(animais).values(novoRegistro({ brinco: '8' }));
  status = 500;
  let falhou = false;
  try {
    await conector.uploadData(powersync);
  } catch {
    falhou = true;
  }
  check(falhou && (await powersync.getUploadQueueStats()).count > 0, 'com 5xx, o upload lança erro e a escrita fica na fila');

  // 426: marca o app como desatualizado, lança, e o app segue gravando offline
  status = 426;
  let parou = 0;
  const conector426 = new ConectorApi(() => {
    parou++;
  });
  try {
    await conector426.uploadData(powersync);
  } catch {
    falhou = true;
  }
  check(estaDesatualizado() && parou === 1, 'com 426, o app fica marcado como desatualizado e o sync para');
  await db.insert(animais).values(novoRegistro({ brinco: '9' }));
  check(
    (await db.select().from(animais).where(and(daFazenda(animais), eq(animais.brinco, '9')))).length === 1,
    'depois do 426 o app continua funcionando offline'
  );

  // fetchCredentials: endpoint e token vêm da API
  globalThis.fetch = (async (url: string) =>
    url.endsWith('/auth/powersync-token')
      ? resposta(200, { endpoint: 'https://ps.teste', token: 'jwt', expiresAt: '2026-11-11T12:00:00Z' })
      : resposta(404, {})) as typeof fetch;
  const credenciais = await conector.fetchCredentials();
  check(credenciais?.endpoint === 'https://ps.teste' && credenciais.token === 'jwt', 'fetchCredentials devolve o endpoint e o token da API');
  globalThis.fetch = (async () => resposta(401, { erro: 'SESSAO_ENCERRADA', mensagem: 'x' })) as typeof fetch;
  check((await conector.fetchCredentials()) === null, 'sessão encerrada: sem credencial');

  console.warn = avisoOriginal;
  configurarSessaoDaApi(null);
}

async function runContaSyncTest() {
  console.log('🔄 MINHA FAZENDA - CONTA E SYNC\n');
  regrasDoAvatar();
  await clienteDaApi();
  await escritaEFiltros();
  await uploadEConnector();
  console.log('\n🎉 CONTA E SYNC OK!');
}

runContaSyncTest().then(fecharTestDatabase).catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
