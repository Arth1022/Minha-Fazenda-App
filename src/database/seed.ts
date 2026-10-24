import { count } from 'drizzle-orm';

import { db } from './client';
import {
  animais,
  fazendaConfig,
  lotes,
  pesagens,
  reproducoes,
  tratamentos,
} from './schema';

/** Seed só roda em desenvolvimento e quando pedido (EXPO_PUBLIC_DEV_SEED=1 no .env). */
export const devSeedHabilitado =
  __DEV__ && process.env.EXPO_PUBLIC_DEV_SEED === '1';

function diasAtras(dias: number): Date {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  data.setDate(data.getDate() - dias);
  return data;
}

const mesesAtras = (meses: number) => diasAtras(Math.round(meses * 30.4));

/**
 * Popula um banco vazio com um rebanho de exemplo, com datas relativas a hoje
 * para que fases, carência e alertas apareçam. Não faz nada se já houver animais.
 */
export function runDevSeed(): void {
  const [{ total }] = db.select({ total: count() }).from(animais).all();
  if (total > 0) return;

  db.transaction((tx) => {
    if (tx.select().from(fazendaConfig).all().length === 0) {
      tx.insert(fazendaConfig).values({ tipoProducao: 'misto' }).run();
    }

    const maternidade = tx.insert(lotes).values({ nome: 'Maternidade' }).returning().get();
    const recria = tx.insert(lotes).values({ nome: 'Recria' }).returning().get();

    const mimosa = tx
      .insert(animais)
      .values({
        brinco: '#101',
        nome: 'Mimosa',
        raca: 'Girolando',
        sexo: 'F',
        dataNascimento: mesesAtras(60),
        nascimentoAproximado: true,
        origem: 'comprado',
        dataEntrada: mesesAtras(36),
        loteId: maternidade.id,
      })
      .returning()
      .get();

    // Bezerra na idade da vacina de brucelose (3 a 8 meses)
    const estrela = tx
      .insert(animais)
      .values({
        brinco: '#301',
        nome: 'Estrela',
        raca: 'Girolando',
        sexo: 'F',
        dataNascimento: mesesAtras(4),
        maeId: mimosa.id,
        origem: 'nascido',
        dataEntrada: mesesAtras(4),
        loteId: maternidade.id,
      })
      .returning()
      .get();

    tx.insert(animais)
      .values({
        brinco: '#302',
        raca: 'Girolando',
        sexo: 'M',
        dataNascimento: mesesAtras(14),
        maeId: mimosa.id,
        origem: 'nascido',
        dataEntrada: mesesAtras(14),
        loteId: recria.id,
      })
      .run();

    const novilha = tx
      .insert(animais)
      .values({
        brinco: '#102',
        raca: 'Holandesa',
        sexo: 'F',
        dataNascimento: mesesAtras(20),
        origem: 'nascido',
        loteId: recria.id,
      })
      .returning()
      .get();

    tx.insert(animais)
      .values({
        brinco: '#900',
        nome: 'Valente',
        raca: 'Nelore',
        sexo: 'M',
        dataNascimento: mesesAtras(48),
        nascimentoAproximado: true,
        origem: 'comprado',
        dataEntrada: mesesAtras(12),
      })
      .run();

    tx.insert(pesagens)
      .values([
        { animalId: estrela.id, data: diasAtras(30), pesoKg: 95 },
        { animalId: estrela.id, data: diasAtras(0), pesoKg: 112 },
      ])
      .run();

    // Previsão = cobertura + 283 dias (mesma regra de features/rebanho/services/indicadores)
    const inseminacao = diasAtras(60);
    const previsao = new Date(inseminacao);
    previsao.setDate(previsao.getDate() + 283);
    tx.insert(reproducoes)
      .values({ animalId: novilha.id, tipo: 'inseminacao', data: inseminacao, previsaoParto: previsao })
      .run();

    tx.insert(tratamentos)
      .values({
        animalId: mimosa.id,
        medicamento: 'Antibiótico',
        dose: '20 ml',
        dataInicio: diasAtras(2),
        dataFim: diasAtras(0),
        carenciaLeiteDias: 4,
        carenciaCarneDias: 21,
      })
      .run();
  });
}
