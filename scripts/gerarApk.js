#!/usr/bin/env node
/**
 * Gera o APK de release com a API de um ambiente:
 *
 *   npm run apk               → staging (padrão: API local)
 *   npm run apk:staging
 *   npm run apk:production    → API na nuvem
 *
 * O Expo 58 só carrega .env, .env.local e .env.production (não lê .env.staging),
 * então o script copia .env.<ambiente> para .env.local durante o build (o
 * .env.local vence o .env.production) e depois devolve o .env.local que havia.
 * As variáveis EXPO_PUBLIC_* entram no APK na hora do bundle.
 *
 * API em http (staging local): o APK de release bloqueia http por padrão, então
 * o build liga `minhafazenda.httpLocal` (ver plugins/withHttpLocal.js). Produção
 * só aceita https.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const AMBIENTES = ['staging', 'production'];
const raiz = path.resolve(__dirname, '..');
const ambiente = process.argv[2] ?? 'staging';

function falhar(mensagem) {
  console.error(`\n❌ ${mensagem}\n`);
  process.exit(1);
}

if (!AMBIENTES.includes(ambiente)) falhar(`Ambiente "${ambiente}" não existe. Use: ${AMBIENTES.join(' ou ')}.`);

const arquivoAmbiente = path.join(raiz, `.env.${ambiente}`);
if (!fs.existsSync(arquivoAmbiente)) falhar(`Falta o arquivo .env.${ambiente}.`);
const conteudo = fs.readFileSync(arquivoAmbiente, 'utf8');
const urlApi = /^\s*EXPO_PUBLIC_API_URL\s*=\s*(.+?)\s*$/m.exec(conteudo)?.[1] ?? '';

if (!urlApi) falhar(`.env.${ambiente} não tem EXPO_PUBLIC_API_URL.`);
if (urlApi.includes('TROCAR')) falhar(`Defina a URL da API em .env.${ambiente} antes de gerar o APK (hoje: ${urlApi}).`);
const http = urlApi.startsWith('http://');
if (http && ambiente === 'production') falhar('A API de produção precisa ser https.');

// .env.local temporário com o ambiente escolhido
const envLocal = path.join(raiz, '.env.local');
const envLocalAntes = fs.existsSync(envLocal) ? fs.readFileSync(envLocal, 'utf8') : null;
fs.writeFileSync(envLocal, `# Gerado por scripts/gerarApk.js (${ambiente}); apagado ao terminar\n${conteudo}`);

console.log(`\n📦 APK ${ambiente} → API ${urlApi}\n`);
let status = 1;
try {
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const resultado = spawnSync(gradlew, ['assembleRelease', `-Pminhafazenda.httpLocal=${http}`], {
    cwd: path.join(raiz, 'android'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  status = resultado.status ?? 1;
} finally {
  if (envLocalAntes === null) fs.rmSync(envLocal, { force: true });
  else fs.writeFileSync(envLocal, envLocalAntes);
}

if (status !== 0) falhar('O build do Android falhou (veja o log acima).');

const versao = require(path.join(raiz, 'app.json')).expo.version;
const origem = path.join(raiz, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const pastaSaida = path.join(raiz, 'dist', 'apk');
fs.mkdirSync(pastaSaida, { recursive: true });
const destino = path.join(pastaSaida, `minha-fazenda-${ambiente}-${versao}.apk`);
fs.copyFileSync(origem, destino);
console.log(`\n✅ APK ${ambiente}: ${path.relative(raiz, destino)}\n`);
