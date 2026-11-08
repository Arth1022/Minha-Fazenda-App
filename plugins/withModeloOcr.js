// Config plugin: pede ao Google Play Services para baixar o modelo de leitura de
// texto (OCR do número do brinco) junto com a instalação do app, e não no primeiro
// uso. Assim a leitura funciona offline no campo desde o início.
// O expo-camera já declara "barcode_ui" nessa mesma chave; os dois ficam juntos.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const CHAVE = 'com.google.mlkit.vision.DEPENDENCIES';
const MODELOS = ['barcode_ui', 'ocr'];

module.exports = function withModeloOcr(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools';

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app['meta-data'] = app['meta-data'] ?? [];
    const existente = app['meta-data'].find((item) => item.$['android:name'] === CHAVE);
    const atuais = (existente?.$['android:value'] ?? '').split(',').map((m) => m.trim());
    const valor = [...new Set([...atuais, ...MODELOS].filter(Boolean))].join(',');

    // tools:replace: o valor do app vence o "barcode_ui" que vem do manifest do expo-camera
    const atributos = { 'android:name': CHAVE, 'android:value': valor, 'tools:replace': 'android:value' };
    if (existente) existente.$ = atributos;
    else app['meta-data'].push({ $: atributos });
    return cfg;
  });
};
