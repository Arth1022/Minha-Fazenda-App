import {
  caminhoDaMidia,
  ehArquivoLocal,
  ehMidiaRemota,
  fazendaDaMidia,
  tipoDoConteudo,
  tipoPeloArquivo,
  trocarNaLista,
  valorDaMidia,
} from '@/services/midia/valor';

function check(condicao: boolean, mensagem: string) {
  if (!condicao) throw new Error(mensagem);
  console.log(`✅ ${mensagem}`);
}

function runMidiaTest() {
  console.log('🖼️  MINHA FAZENDA - MÍDIA NO STORAGE\n');
  const fazenda = '7b22df08-20c1-44ad-a238-a8f7ff87f735';
  const caminho = `${fazenda}/audios/0532e7e1-4fdd-4b7a-bb0b-873499f3b769.m4a`;
  const valor = valorDaMidia(caminho);

  check(valor === `midia:${caminho}`, 'valor remoto leva o prefixo midia:');
  check(ehMidiaRemota(valor) && !ehArquivoLocal(valor), 'midia: é remoto, não local');
  check(ehArquivoLocal('file:///data/user/0/app/files/fotos/1.jpg'), 'file:// é arquivo só deste celular');
  check(!ehMidiaRemota(null) && !ehArquivoLocal(undefined), 'sem valor não é mídia');
  check(caminhoDaMidia(valor) === caminho, 'caminho sem o prefixo');
  check(fazendaDaMidia(valor) === fazenda, 'fazenda dona do arquivo vem do caminho');

  check(tipoPeloArquivo('file:///x/audios/voz-12s-abc.m4a') === 'audio', 'nota de voz .m4a vai como audio');
  check(tipoPeloArquivo('file:///x/fotos/1.jpeg') === 'imagem', 'foto vai como imagem');
  check(tipoPeloArquivo('file:///x/doc.pdf') === 'documento', 'PDF vai como documento');
  check(tipoDoConteudo('file:///x/voz.m4a') === 'audio/mp4', 'content-type do m4a');

  const lista = ['file:///a.jpg', 'midia:x/imagens/b.jpg'];
  const trocada = trocarNaLista(lista, 'file:///a.jpg', 'midia:x/imagens/a.jpg');
  check(trocada?.[0] === 'midia:x/imagens/a.jpg' && trocada[1] === lista[1], 'troca só a foto enviada na lista do evento');
  check(trocarNaLista(lista, 'file:///nao-esta.jpg', 'midia:z') === null, 'nada a trocar devolve null');
  check(trocarNaLista('texto', 'a', 'b') === null, 'fotos fora de lista são ignoradas');

  console.log('\n🎉 MÍDIA OK!');
}

runMidiaTest();
