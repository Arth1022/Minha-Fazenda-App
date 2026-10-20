import {
  animalRepository,
  estoqueRepository,
  maquinaRepository,
  ordenhaRepository,
  talhaoRepository,
  tratamentoRepository,
} from '../database/repositories';

export interface PersistenceTestResult {
  success: boolean;
  timestamp: Date;
  durationMs: number;
  logs: string[];
  recordsCreated: {
    talhaoId?: string;
    animalId?: string;
    estoqueId?: string;
    maquinaId?: string;
    ordenhaId?: string;
    tratamentoId?: string;
  };
  stats: {
    talhoes: number;
    animais: number;
    estoqueItens: number;
    maquinas: number;
    ordenhas: number;
    tratamentos: number;
  };
  error?: string;
}

/**
 * Executa um ciclo completo de teste de persistência:
 * 1. Escrita (Create)
 * 2. Leitura (Read / Query)
 * 3. Atualização (Update)
 * 4. Validação de integridade dos dados
 * 
 * @param cleanup Se true, deleta os registros criados após o teste. Se false, mantém no banco para validar persistência entre reaberturas do app.
 */
export async function runPersistenceTest(cleanup: boolean = false): Promise<PersistenceTestResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  const testTag = `TEST-${Date.now().toString().slice(-4)}`;

  logs.push(`[${new Date().toLocaleTimeString()}] 🚀 Iniciando teste de persistência (Identificador: ${testTag})...`);

  try {
    // 1. ESCRITA: Criar Talhão de Teste
    logs.push(`[1/5] 📝 Criando Talhão de teste...`);
    const talhao = await talhaoRepository.createTalhao({
      nome: `Pasto Principal ${testTag}`,
      tipo: 'Pastagem Rotacionada',
      areaHa: 12.5,
      possuiCerca: true,
    });
    logs.push(`  ✅ Talhão criado com ID: ${talhao.id} (Nome: "${talhao.nome}")`);

    // 2. ESCRITA: Criar Animal associado ao Talhão
    logs.push(`[2/5] 📝 Criando Animal de teste com vínculo no Talhão...`);
    const brincoAnimal = `BR-${testTag}`;
    const animal = await animalRepository.createAnimal({
      brinco: brincoAnimal,
      nome: `Mimosa ${testTag}`,
      raca: 'Holandesa',
      pesoKg: 520,
      producaoLeiteL: 28.5,
      talhaoId: talhao.id,
    });
    logs.push(`  ✅ Animal criado com ID: ${animal.id} (Brinco: ${animal.brinco}, Raça: ${animal.raca})`);

    // 3. ESCRITA: Criar Item de Estoque, Máquina, Ordenha e Tratamento
    logs.push(`[3/5] 📝 Criando registros complementares (Estoque, Máquina, Ordenha, Tratamento)...`);
    
    const estoque = await estoqueRepository.createItem({
      categoria: 'insumo',
      nome: `Ração Lactação ${testTag}`,
      quantidade: 500,
      unidade: 'kg',
      estoqueMinimo: 100,
    });

    const maquina = await maquinaRepository.createMaquina({
      nome: `Trator John Deere ${testTag}`,
      statusPercentual: 95,
      manutencaoDevida: false,
    });

    const ordenha = await ordenhaRepository.createOrdenha({
      periodo: 'manha',
      volumeLitros: 28.5,
      dataRegistro: new Date(),
    });

    const tratamento = await tratamentoRepository.createTratamento({
      animalId: animal.id,
      medicamento: 'Complexo Vitamínico ADE',
      dataInicio: new Date(),
      notificacaoAtiva: true,
    });

    logs.push(`  ✅ Registros complementares criados com sucesso.`);

    // 4. LEITURA & VALIDAÇÃO
    logs.push(`[4/5] 🔍 Validando leitura e consultas no banco de dados...`);
    
    const animalLido = await animalRepository.findByBrinco(brincoAnimal);
    if (!animalLido || animalLido.id !== animal.id) {
      throw new Error(`Falha na leitura do Animal por brinco: esperado ID ${animal.id}, obtido ${animalLido?.id}`);
    }

    const estoqueLido = await estoqueRepository.getById(estoque.id);
    if (!estoqueLido || estoqueLido.quantidade !== 500) {
      throw new Error(`Falha na validação de quantidade do Estoque`);
    }

    // Testar atualização (Update)
    await estoqueRepository.adjustQuantity(estoque.id, -50);
    const estoqueAtualizado = await estoqueRepository.getById(estoque.id);
    if (estoqueAtualizado.quantidade !== 450) {
      throw new Error(`Falha no ajuste de quantidade: esperado 450, obtido ${estoqueAtualizado.quantidade}`);
    }

    const animaisNoTalhao = await animalRepository.getByTalhao(talhao.id);
    if (animaisNoTalhao.length === 0) {
      throw new Error(`Falha na consulta relacional de animais por talhão`);
    }

    logs.push(`  ✅ Leitura, busca por índice, atualização e relacionamento validados com 100% de sucesso.`);

    // Obter estatísticas gerais atuais do banco
    const stats = {
      talhoes: await talhaoRepository.count(),
      animais: await animalRepository.count(),
      estoqueItens: await estoqueRepository.count(),
      maquinas: await maquinaRepository.count(),
      ordenhas: await ordenhaRepository.count(),
      tratamentos: await tratamentoRepository.count(),
    };

    // 5. LIMPEZA (OPCIONAL)
    if (cleanup) {
      logs.push(`[5/5] 🧹 Limpando registros criados no teste...`);
      await tratamentoRepository.destroyPermanently(tratamento.id);
      await ordenhaRepository.destroyPermanently(ordenha.id);
      await maquinaRepository.destroyPermanently(maquina.id);
      await estoqueRepository.destroyPermanently(estoque.id);
      await animalRepository.destroyPermanently(animal.id);
      await talhaoRepository.destroyPermanently(talhao.id);
      logs.push(`  ✅ Limpeza concluída.`);
    } else {
      logs.push(`[5/5] 💾 Registros mantidos no banco para verificação de persistência entre reinicializações.`);
    }

    const durationMs = Date.now() - startTime;
    logs.push(`🎉 Teste de persistência finalizado com SUCESSO em ${durationMs}ms!`);

    return {
      success: true,
      timestamp: new Date(),
      durationMs,
      logs,
      recordsCreated: {
        talhaoId: talhao.id,
        animalId: animal.id,
        estoqueId: estoque.id,
        maquinaId: maquina.id,
        ordenhaId: ordenha.id,
        tratamentoId: tratamento.id,
      },
      stats,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error?.message || String(error);
    logs.push(`❌ ERRO durante o teste de persistência: ${errorMsg}`);
    
    return {
      success: false,
      timestamp: new Date(),
      durationMs,
      logs,
      recordsCreated: {},
      stats: {
        talhoes: 0,
        animais: 0,
        estoqueItens: 0,
        maquinas: 0,
        ordenhas: 0,
        tratamentos: 0,
      },
      error: errorMsg,
    };
  }
}
