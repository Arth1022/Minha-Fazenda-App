import { File } from 'expo-file-system';

import { powersync } from '@/features/sync/db';
import { ehErroApi } from '@/shared/api';
import { enviarMidia } from './api';
import { guardarEnviada } from './cache';
import { newId } from '@/entities/id';
import { ehArquivoLocal, tipoPeloArquivo, trocarNaLista, valorDaMidia } from './valor';

/**
 * Envio das mídias em segundo plano. Telas continuam gravando o arquivo local (`file://`) na
 * coluna, como sempre (funciona offline). Com o sync conectado, este módulo procura essas
 * colunas, sobe cada arquivo para o Storage e troca o valor por `midia:<caminho>`: a troca é
 * um UPDATE comum, que vai para os outros celulares pelo sync.
 */

/** Colunas que guardam uma mídia (nome real das tabelas e colunas no SQLite). */
export const COLUNAS_DE_MIDIA = [
  { tabela: 'animais', coluna: 'foto_uri' },
  { tabela: 'exames', coluna: 'comprovante_uri' },
  { tabela: 'tratamentos', coluna: 'comprovante_uri' },
  { tabela: 'ocorrencias_maquina', coluna: 'foto_uri' },
  { tabela: 'abastecimentos', coluna: 'foto_uri' },
  { tabela: 'leituras_horimetro', coluna: 'foto_uri' },
  { tabela: 'tarefas', coluna: 'audio_uri' },
] as const;

/** Fotos da ocorrência e da conclusão ficam numa lista dentro do JSON do evento. */
const TABELA_EVENTOS = 'tarefa_eventos';

export const TABELAS_COM_MIDIA = [...new Set([...COLUNAS_DE_MIDIA.map((c) => c.tabela), TABELA_EVENTOS])];

const POR_RODADA = 20;

/** Arquivos que não dá para enviar daqui (de outro celular, ou recusados pela API). */
const ignorados = new Set<string>();

class SemRede extends Error {}

function existeNoCelular(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

function apagarOriginal(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // Já não estava lá
  }
}

/**
 * Sobe um arquivo. Devolve o valor `midia:` ou null quando ele não pode ser enviado deste
 * celular. Sem internet (ou servidor fora) lança `SemRede` e a rodada para.
 */
async function subir(fazendaId: string, uri: string, id: string): Promise<string | null> {
  if (ignorados.has(uri)) return null;
  if (!existeNoCelular(uri)) {
    // Caminho gravado por outro celular antes do envio existir: não há o que subir daqui
    ignorados.add(uri);
    return null;
  }
  try {
    const { caminho } = await enviarMidia(fazendaId, tipoPeloArquivo(uri), uri, id);
    await guardarEnviada(caminho, uri);
    return valorDaMidia(caminho);
  } catch (erro) {
    if (ehErroApi(erro) && erro.status >= 400 && erro.status < 500 && erro.status !== 401 && erro.status !== 429) {
      // Formato, tamanho ou permissão: tentar de novo não muda nada
      console.warn('[Mídia] Arquivo recusado pela API:', erro.codigo, erro.message);
      ignorados.add(uri);
      return null;
    }
    throw new SemRede();
  }
}

async function enviarColunas(): Promise<number> {
  let enviados = 0;
  for (const { tabela, coluna } of COLUNAS_DE_MIDIA) {
    const linhas = await powersync.getAll<{ id: string; fazenda_id: string; valor: string }>(
      `SELECT id, fazenda_id, ${coluna} AS valor FROM ${tabela}
       WHERE ${coluna} LIKE 'file:%' AND deleted_at IS NULL LIMIT ?`,
      [POR_RODADA]
    );
    for (const linha of linhas) {
      // id do registro como id do arquivo: reenviar cai no mesmo caminho
      const remoto = await subir(linha.fazenda_id, linha.valor, linha.id);
      if (!remoto) continue;
      // Só troca se ninguém mudou a foto enquanto ela subia
      const resultado = await powersync.execute(
        `UPDATE ${tabela} SET ${coluna} = ?, updated_at = ? WHERE id = ? AND ${coluna} = ?`,
        [remoto, new Date().toISOString(), linha.id, linha.valor]
      );
      if ((resultado.rowsAffected ?? 0) > 0) apagarOriginal(linha.valor);
      enviados++;
    }
  }
  return enviados;
}

async function enviarFotosDeEventos(): Promise<number> {
  let enviados = 0;
  const linhas = await powersync.getAll<{ id: string; fazenda_id: string; dados: string }>(
    `SELECT id, fazenda_id, dados FROM ${TABELA_EVENTOS}
     WHERE dados LIKE '%"file:%' AND deleted_at IS NULL LIMIT ?`,
    [POR_RODADA]
  );
  for (const linha of linhas) {
    let dados: Record<string, unknown>;
    try {
      dados = JSON.parse(linha.dados);
    } catch {
      continue;
    }
    const fotos = Array.isArray(dados.fotos) ? (dados.fotos as unknown[]) : [];
    let atual = linha.dados;
    for (const foto of fotos) {
      if (!ehArquivoLocal(foto as string)) continue;
      const remoto = await subir(linha.fazenda_id, foto as string, newId());
      if (!remoto) continue;
      const trocadas = trocarNaLista((JSON.parse(atual) as Record<string, unknown>).fotos, foto as string, remoto);
      if (!trocadas) continue;
      const novo = JSON.stringify({ ...(JSON.parse(atual) as Record<string, unknown>), fotos: trocadas });
      const resultado = await powersync.execute(
        `UPDATE ${TABELA_EVENTOS} SET dados = ?, updated_at = ? WHERE id = ? AND dados = ?`,
        [novo, new Date().toISOString(), linha.id, atual]
      );
      if ((resultado.rowsAffected ?? 0) === 0) break;
      apagarOriginal(foto as string);
      atual = novo;
      enviados++;
    }
  }
  return enviados;
}

let rodando: Promise<void> | null = null;
let deNovo = false;

/** Uma rodada por vez; um pedido no meio de outra faz mais uma no fim. */
export function enviarMidiasPendentes(): Promise<void> {
  if (rodando) {
    deNovo = true;
    return rodando;
  }
  rodando = (async () => {
    try {
      do {
        deNovo = false;
        const enviados = (await enviarColunas()) + (await enviarFotosDeEventos());
        // Rodada cheia: pode ter mais na fila
        if (enviados >= POR_RODADA) deNovo = true;
      } while (deNovo);
    } catch (erro) {
      if (!(erro instanceof SemRede)) console.warn('[Mídia] Falha no envio:', erro);
    } finally {
      rodando = null;
    }
  })();
  return rodando;
}

let parar: (() => void) | null = null;

/**
 * Liga o envio automático: ao conectar o sync e quando uma tabela com mídia muda. Chamado
 * junto com `conectarSync` (só no modo com conta).
 */
export function iniciarEnvioDeMidias(): void {
  if (parar) return;
  const tentar = () => {
    if (powersync.currentStatus.connected) enviarMidiasPendentes().catch(() => undefined);
  };
  const pararStatus = powersync.registerListener({
    statusChanged: (status) => {
      if (status.connected) tentar();
    },
  });
  const pararMudancas = powersync.onChangeWithCallback(
    { onChange: tentar },
    { tables: TABELAS_COM_MIDIA, throttleMs: 3000 }
  );
  tentar();
  parar = () => {
    pararStatus();
    pararMudancas();
  };
}

export function pararEnvioDeMidias(): void {
  parar?.();
  parar = null;
  ignorados.clear();
}
