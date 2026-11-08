import { eq } from 'drizzle-orm';

import { anotacoesDaMaquina, criarAnotacao } from '@/features/maquinas/data/anotacoes';
import {
  buscarMaquinaPorReferencia,
  cadastrarMaquina,
  listarMaquinas,
} from '@/features/maquinas/data/maquinas';
import {
  encerrarUso,
  iniciarUso,
  tempoTotalRegistrado,
  usosDaMaquinaDesde,
  usosEmAberto,
} from '@/features/maquinas/data/usos';
import { chaveDaMarca } from '@/features/maquinas/marcas/chave';
import { buscarMaquinas } from '@/features/maquinas/services/busca';
import { gerarCodigo } from '@/features/maquinas/services/codigo';
import { conteudoQrMaquina, lerQrMaquina } from '@/features/maquinas/services/qrCode';
import { LOGOS_VETORIAIS } from '@/features/maquinas/marcas/logosVetoriais';
import {
  formatarCronometro,
  formatarDuracao,
  somarDuracoes,
  usoPorDia,
} from '@/features/maquinas/services/uso';
import { db, initTestDatabase, maquinas, sqlite, usosMaquina } from './support/database';

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

const HORA = 60 * 60 * 1000;
const em = (d: number, h: number, min = 0) => new Date(2026, 10, d, h, min);

async function runMaquinasTest() {
  console.log('=========================================================');
  console.log('🚜 MINHA FAZENDA - MÁQUINAS E AUDITORIA DE USO');
  console.log('=========================================================\n');

  // Regras puras
  check(formatarDuracao(0) === '0min' && formatarDuracao(45 * 60000) === '45min', 'duração abaixo de 1h em minutos');
  check(formatarDuracao(2 * HORA + 5 * 60000) === '2h 05min', 'duração com horas e minutos (2h 05min)');
  check(formatarCronometro(26 * HORA + 61000) === '26:01:01', 'cronômetro passa de 24h sem zerar');

  const agora = em(6, 10);
  const dias = usoPorDia(
    [
      { inicio: em(5, 22), fim: em(6, 1) }, // atravessa a meia-noite
      { inicio: em(6, 8), fim: null }, // ainda ligada: conta até agora
      { inicio: em(20, 8), fim: em(20, 9) }, // fora da janela
    ],
    agora
  );
  check(dias.length === 7 && dias[6].dia.getTime() === em(6, 0).getTime(), '7 dias, hoje por último');
  check(dias[5].duracaoMs === 2 * HORA, 'uso que atravessa a meia-noite: 2h ontem');
  check(dias[6].duracaoMs === 1 * HORA + 2 * HORA, 'hoje: 1h do uso da madrugada + 2h do uso em aberto');
  check(somarDuracoes(dias) === 5 * HORA, 'total da semana soma os dias');

  // Marca digitada → logo
  const chaves = [...Object.keys(LOGOS_VETORIAIS), 'masseyferguson', 'newholland', 'valtra', 'caseih'].sort(
    (a, b) => b.length - a.length
  );
  check(chaveDaMarca(' John  Deere ', chaves) === 'johndeere', 'marca sem diferenciar espaços e maiúsculas');
  check(chaveDaMarca('Citroën', ['citroen']) === 'citroen', 'marca sem diferenciar acento');
  check(chaveDaMarca('MF', chaves) === 'masseyferguson' && chaveDaMarca('vw', chaves) === 'volkswagen', 'apelidos (MF, VW)');
  check(chaveDaMarca('Massey Ferguson 4275', chaves) === 'masseyferguson', 'marca com modelo junto');
  check(chaveDaMarca('Case IH', chaves) === 'caseih' && chaveDaMarca('Case', chaves) === 'caseih', 'Case e Case IH dão o mesmo logo');
  check(chaveDaMarca('Jacto', chaves) === null && chaveDaMarca('', chaves) === null && chaveDaMarca(null, chaves) === null, 'marca sem logo ou vazia: ícone genérico');
  check(
    Object.values(LOGOS_VETORIAIS).every((l) => l.paths.length > 0 && /^#[0-9A-F]{6}$/i.test(l.cor) && l.viewBox.split(' ').length === 4),
    'todos os logos vetoriais têm traço, cor e viewBox'
  );

  // QR Code
  const qr = conteudoQrMaquina('abc-123');
  check(qr === 'minhafazenda://maquina/abc-123', 'QR da máquina é o link do app para a ficha');
  check(JSON.stringify(lerQrMaquina(qr)) === JSON.stringify({ tipo: 'id', id: 'abc-123' }), 'lê o id do link');
  check(lerQrMaquina('MINHAFAZENDA://maquina/abc-123?x=1')?.tipo === 'id', 'link com maiúsculas e parâmetros');
  check(JSON.stringify(lerQrMaquina(' tr-01 ')) === JSON.stringify({ tipo: 'codigo', codigo: 'TR-01' }), 'etiqueta só com o ID curto');
  check(
    lerQrMaquina('https://site.com/x') === null && lerQrMaquina('texto com espaço') === null && lerQrMaquina('minhafazenda://maquina/') === null,
    'QR que não é de máquina é ignorado'
  );

  // Busca
  const frota = [
    { codigo: 'TR-02', nome: 'Trator novo', tipo: 'trator' as const, marca: 'Valtra', modelo: 'A134' },
    { codigo: 'CM-01', nome: 'Caminhão do leite', tipo: 'caminhao' as const, marca: 'Ford', modelo: 'Cargo' },
    { codigo: 'TR-01', nome: 'Trator velho', tipo: 'trator' as const, marca: 'Massey Ferguson', modelo: null },
  ];
  check(buscarMaquinas(frota, '').length === 3, 'sem termo, toda a frota');
  check(buscarMaquinas(frota, 'tr-01')[0].codigo === 'TR-01', 'ID exato vem primeiro');
  check(buscarMaquinas(frota, 'caminhao').map((m) => m.codigo).join() === 'CM-01', 'nome sem acento');
  check(buscarMaquinas(frota, 'valtra').map((m) => m.codigo).join() === 'TR-02', 'busca pela marca');
  check(buscarMaquinas(frota, 'trator').map((m) => m.codigo).join() === 'TR-02,TR-01', 'nome antes do tipo, na ordem da lista');
  check(buscarMaquinas(frota, 'xyz').length === 0, 'termo sem resultado');

  // ID interno gerado pelo tipo
  check(gerarCodigo('trator', []) === 'TR-01', 'primeiro trator vira TR-01');
  check(gerarCodigo('trator', ['TR-01', 'TR-03', 'CA-02']) === 'TR-02', 'preenche o primeiro número livre');
  check(gerarCodigo('caminhao', ['TR-01']) === 'CA-01', 'cada tipo tem seu prefixo');

  // Banco
  await initTestDatabase();

  const trator = await cadastrarMaquina({ codigo: ' tr-01 ', nome: ' Trator do curral ', tipo: 'trator', marca: 'Valtra' });
  check(trator.codigo === 'TR-01' && trator.nome === 'Trator do curral', 'cadastro normaliza ID (maiúsculas) e nome');
  check(trator.status === 'ativa', 'máquina nasce ativa');
  check(
    (await rejeita(() => cadastrarMaquina({ codigo: 'Tr-01', nome: 'Outro' })))?.includes('TR-01') ?? false,
    'ID repetido é recusado sem diferenciar maiúsculas'
  );
  check((await rejeita(() => cadastrarMaquina({ codigo: '  ', nome: 'X' }))) !== null, 'ID vazio é recusado');

  const uso = await iniciarUso(trator.id, em(6, 7));
  check(uso.fim === null && uso.inicio.getTime() === em(6, 7).getTime(), 'ligar abre um uso sem fim');
  check((await usosEmAberto()).length === 1, 'máquina ligada aparece entre as em uso');
  check((await rejeita(() => iniciarUso(trator.id))) === 'A máquina já está em uso', 'não liga duas vezes');

  let indiceBarrou = false;
  try {
    sqlite.run(`insert into usos_maquina (id, maquina_id, inicio, created_at, updated_at) values ('x', '${trator.id}', 0, 0, 0)`);
  } catch {
    indiceBarrou = true;
  }
  check(indiceBarrou, 'índice único parcial impede dois usos abertos direto no banco');

  check((await buscarMaquinaPorReferencia({ tipo: 'id', id: trator.id }))?.codigo === 'TR-01', 'QR com id acha a máquina');
  check((await buscarMaquinaPorReferencia({ tipo: 'codigo', codigo: 'TR-01' }))?.id === trator.id, 'QR com ID curto acha a máquina');
  check((await buscarMaquinaPorReferencia({ tipo: 'id', id: 'nao-existe' })) === undefined, 'QR de máquina apagada não acha nada');

  const encerrado = await encerrarUso(trator.id, em(6, 9, 30));
  check(encerrado.fim?.getTime() === em(6, 9, 30).getTime(), 'desligar fecha o uso no horário informado');
  check((await usosEmAberto()).length === 0, 'depois de desligar não há uso aberto');
  check((await rejeita(() => encerrarUso(trator.id))) === 'A máquina não está em uso', 'não desliga máquina parada');

  await iniciarUso(trator.id, em(6, 10));
  await encerrarUso(trator.id, em(6, 11));
  const [{ totalMs }] = await tempoTotalRegistrado(trator.id);
  check(totalMs === 3.5 * HORA, 'tempo total registrado soma os usos encerrados (3h30)');

  await iniciarUso(trator.id, em(6, 12));
  const janela = await usosDaMaquinaDesde(trator.id, em(6, 9));
  check(janela.length === 3, 'consulta da semana traz usos que terminam na janela e o aberto');
  await encerrarUso(trator.id, em(6, 13));

  const inativa = await cadastrarMaquina({ codigo: 'CM-01', nome: 'Caminhão velho', status: 'inativa' });
  check((await rejeita(() => iniciarUso(inativa.id))) === 'Máquina inativa não pode ser ligada', 'máquina inativa não liga');

  check((await listarMaquinas()).map((m) => m.nome).join() === 'Caminhão velho,Trator do curral', 'lista em ordem alfabética pelo nome');

  const semId = await cadastrarMaquina({ nome: 'Trator novo', tipo: 'trator' });
  const outroSemId = await cadastrarMaquina({ nome: 'Carreta', tipo: 'implemento' });
  check(semId.codigo === 'TR-02' && outroSemId.codigo === 'IM-01', 'sem ID informado, o cadastro gera pelo tipo'); 

  await criarAnotacao(trator.id, '  Troca de óleo  ');
  const [anotacao] = await anotacoesDaMaquina(trator.id);
  check(anotacao?.texto === 'Troca de óleo', 'anotação gravada sem espaços nas pontas');
  check((await rejeita(() => criarAnotacao(trator.id, '   '))) !== null, 'anotação vazia é recusada');

  await db.delete(maquinas).where(eq(maquinas.id, trator.id));
  check((await db.select().from(usosMaquina)).length === 0, 'apagar a máquina apaga os usos (cascade)');

  console.log('\n🎉 Máquinas: tudo certo!');
}

runMaquinasTest().catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
