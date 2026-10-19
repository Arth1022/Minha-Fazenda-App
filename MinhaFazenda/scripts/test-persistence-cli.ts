import { runPersistenceTest } from '../src/database';

async function runCliTest() {
  console.log('=========================================================');
  console.log('🌾 MINHA FAZENDA - TESTE DE PERSISTÊNCIA / BANCO DE DADOS');
  console.log('=========================================================\n');

  const result = await runPersistenceTest(false);

  result.logs.forEach((log) => console.log(log));

  console.log('\n--- ESTATÍSTICAS FINAIS DO BANCO ---');
  console.log(`• Talhões cadastrados:     ${result.stats.talhoes}`);
  console.log(`• Animais cadastrados:     ${result.stats.animais}`);
  console.log(`• Itens no Estoque:        ${result.stats.estoqueItens}`);
  console.log(`• Máquinas cadastradas:    ${result.stats.maquinas}`);
  console.log(`• Ordenhas registradas:    ${result.stats.ordenhas}`);
  console.log(`• Tratamentos cadastrados: ${result.stats.tratamentos}`);

  if (result.success) {
    console.log('\n=========================================================');
    console.log('🎉 SUCESSO: Persistência e Repositórios 100% validados!');
    console.log('=========================================================\n');
  } else {
    console.error('\n❌ Falha no teste:', result.error);
    process.exit(1);
  }
}

runCliTest().catch((err) => {
  console.error('❌ Erro inesperado no teste:', err);
  process.exit(1);
});
