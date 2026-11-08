import { asc, eq } from 'drizzle-orm';

import { db, maquinas } from '@/database';
import type { Maquina, NovaMaquina } from '@/dtos';
import { gerarCodigo } from '../services/codigo';
import type { ReferenciaMaquina } from '../services/qrCode';
import { normalizarCodigo } from '../services/uso';

/** Frota em ordem alfabética pelo nome. */
export function listarMaquinas() {
  return db.select().from(maquinas).orderBy(asc(maquinas.nome));
}

export function maquinaPorId(id: string) {
  return db.query.maquinas.findFirst({ where: eq(maquinas.id, id) });
}

/** Máquina apontada por um QR Code (pelo id ou pelo ID curto); undefined se não existe. */
export async function buscarMaquinaPorReferencia(
  referencia: ReferenciaMaquina
): Promise<Maquina | undefined> {
  const filtro =
    referencia.tipo === 'id' ? eq(maquinas.id, referencia.id) : eq(maquinas.codigo, referencia.codigo);
  const [maquina] = await db.select().from(maquinas).where(filtro).limit(1);
  return maquina;
}

/** Entrada do cadastro: o ID interno é opcional (sem ele, é gerado pelo tipo). */
export type DadosNovaMaquina = Omit<NovaMaquina, 'codigo'> & { codigo?: string };

/**
 * Cadastra a máquina. O ID interno (não aparece na tela) é gerado pelo tipo
 * ("TR-01") ou, se informado, normalizado e conferido: é único na fazenda.
 */
export async function cadastrarMaquina(nova: DadosNovaMaquina): Promise<Maquina> {
  const informado = nova.codigo === undefined ? null : normalizarCodigo(nova.codigo);
  const nome = nova.nome.trim();
  if (informado === '') throw new Error('Informe a identificação da máquina');
  if (!nome) throw new Error('Informe o nome da máquina');

  // Transação síncrona do driver expo-sqlite: as escritas usam .run()/.get()
  return db.transaction((tx) => {
    const usados = tx
      .select({ codigo: maquinas.codigo })
      .from(maquinas)
      .all()
      .map((m) => m.codigo);
    if (informado && usados.includes(informado)) {
      throw new Error(`Já existe uma máquina com a identificação ${informado}`);
    }
    const codigo = informado ?? gerarCodigo(nova.tipo ?? 'outro', usados);
    return tx.insert(maquinas).values({ ...nova, codigo, nome }).returning().get();
  });
}
