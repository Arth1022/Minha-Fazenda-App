// Config plugin: deixa o APK de release falar com uma API em http (staging com o
// back-end na rede local) só quando o build pede a propriedade
// `minhafazenda.httpLocal=true` (ver scripts/gerarApk.js). Sem ela, o release
// continua bloqueando http (produção é só https); o debug já libera.
//
// O plugin do React Native define o placeholder `usesCleartextTraffic` por tipo de
// build no finalizeDsl (release = false). Só a API de variantes, que roda depois,
// consegue trocar o valor do release.
const { AndroidConfig, withAndroidManifest, withAppBuildGradle } = require('expo/config-plugins');

const MARCA = "findProperty('minhafazenda.httpLocal')";
const BLOCO_GRADLE = `
// API em http só no APK de staging (plugins/withHttpLocal.js, scripts/gerarApk.js).
// O plugin do React Native põe usesCleartextTraffic = false no release (finalizeDsl);
// a API de variantes roda depois dele, então só aqui dá para liberar.
androidComponents {
    onVariants(selector().withBuildType('release')) { variant ->
        if (${MARCA} == 'true') {
            variant.manifestPlaceholders.put('usesCleartextTraffic', 'true')
        }
    }
}
`;

function comManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:usesCleartextTraffic'] = '${usesCleartextTraffic}';
    return cfg;
  });
}

function comGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARCA)) {
      cfg.modResults.contents = `${cfg.modResults.contents.trimEnd()}\n${BLOCO_GRADLE}`;
    }
    return cfg;
  });
}

module.exports = function withHttpLocal(config) {
  return comGradle(comManifest(config));
};
