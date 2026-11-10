import { and, asc, eq, ne } from 'drizzle-orm';

import { db, maquinas } from '@/database';
import type { Maquina, NovaMaquina } from '@/dtos';
import { gerarCodigo } from '../services/codigo';
import { categoriaDoTipo } from '../services/padroes';
import type { ReferenciaMaquina } from '../services/qrCode';
import { normalizarCodigo } from '../services/uso';

/** Frota em ordem alfabética pelo nome. */
export function listarMaquinas() {
  return db.select().from(maquinas).orderBy(asc(maquinas.nome));
}

/** Implementos ativos (plantadeira, grade, carreta) para engatar ao ligar. */
export function listarImplementos() {
  return db
    .select()
    .from(maquinas)
    .where(and(eq(maquinas.categoria, 'implemento'), ne(maquinas.status, 'inativa')))
    .orderBy(asc(maquinas.nome));
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
    const categoria = categoriaDoTipo(nova.tipo ?? 'outro');
    return tx
      .insert(maquinas)
      .values({ ...nova, ...camposDaCategoria(categoria), categoria, codigo, nome })
      .returning()
      .get();
  });
}

/** Implemento não tem motor: sem combustível, horímetro, tanque nem potência. */
function camposDaCategoria(categoria: ReturnType<typeof categoriaDoTipo>) {
  return categoria === 'implemento'
    ? { combustivel: null, possuiHorimetro: false, horimetroInicial: null, tanqueLitros: null, potenciaCv: null }
    : { larguraTrabalhoM: null };
}

/** Edição do cadastro (lápis da ficha). O ID interno não muda: está no QR impresso. */
export async function atualizarMaquina(id: string, dados: Omit<DadosNovaMaquina, 'codigo'>): Promise<Maquina> {
  const nome = dados.nome.trim();
  if (!nome) throw new Error('Informe o nome da máquina');
  const categoria = categoriaDoTipo(dados.tipo ?? 'outro');
  const [atualizada] = await db
    .update(maquinas)
    .set({ ...dados, ...camposDaCategoria(categoria), categoria, nome })
    .where(eq(maquinas.id, id))
    .returning();
  if (!atualizada) throw new Error('Máquina não encontrada');
  return atualizada;
}
