import { desc, eq } from 'drizzle-orm';

import { abastecimentos, db, leiturasHorimetro } from '@/database';
import type { Abastecimento, OrigemAbastecimento } from '@/dtos';
import { usuarioAtual, type Usuario } from '@/services/usuario';
import type { Posicao } from './usos';

export interface DadosAbastecimento {
  maquinaId: string;
  /** Uso em andamento: abastece sem encerrar */
  usoId?: string | null;
  litros: number;
  tanqueCheio: boolean;
  origem: OrigemAbastecimento;
  /** Horímetro lido na hora (opcional) */
  horimetroH?: number | null;
  /** O que o app esperava do horímetro, para a conferência do dono */
  horimetroEstimadoH?: number | null;
  fotoUri?: string | null;
  posicao?: Posicao | null;
  operador?: Usuario;
}

/**
 * Registra o abastecimento. Com horímetro lido, a leitura também entra no
 * histórico do horímetro (origem "abastecimento"). Validação dos litros e do
 * horímetro fica na tela (pede confirmação); aqui só o que nunca pode passar.
 */
export async function registrarAbastecimento(
  dados: DadosAbastecimento,
  agora = new Date()
): Promise<Abastecimento> {
  if (!(dados.litros > 0)) throw new Error('Informe quantos litros foram abastecidos');
  const operador = dados.operador ?? usuarioAtual();
  return db.transaction((tx) => {
    const abastecimento = tx
      .insert(abastecimentos)
      .values({
        maquinaId: dados.maquinaId,
        usoId: dados.usoId ?? null,
        operador: operador.nome,
        operadorId: operador.id,
        litros: dados.litros,
        tanqueCheio: dados.tanqueCheio,
        origem: dados.origem,
        horimetroH: dados.horimetroH ?? null,
        lat: dados.posicao?.lat ?? null,
        lng: dados.posicao?.lng ?? null,
        fotoUri: dados.fotoUri ?? null,
        abastecidoEm: agora,
      })
      .returning()
      .get();
    if (dados.horimetroH !== null && dados.horimetroH !== undefined) {
      tx.insert(leiturasHorimetro)
        .values({
          maquinaId: dados.maquinaId,
          usoId: dados.usoId ?? null,
          operador: operador.nome,
          operadorId: operador.id,
          valorH: dados.horimetroH,
          estimadoH: dados.horimetroEstimadoH ?? null,
          origem: 'abastecimento',
          lidoEm: agora,
        })
        .run();
    }
    return abastecimento;
  });
}

/** Abastecimentos da máquina, do mais recente para o mais antigo. */
export function abastecimentosDaMaquina(maquinaId: string, limite = 10) {
  return db
    .select()
    .from(abastecimentos)
    .where(eq(abastecimentos.maquinaId, maquinaId))
    .orderBy(desc(abastecimentos.abastecidoEm))
    .limit(limite);
}
