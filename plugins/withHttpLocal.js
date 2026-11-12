// Config plugin: deixa o APK de release falar com uma API em http (staging com o
// back-end na rede local) só quando o build pede (`-Pminhafazenda.httpLocal=true`,
// ver scripts/gerarApk.js). Sem a propriedade, o release continua bloqueando http
// (produção é só https). O debug já libera http pelo manifest de debug.
const { AndroidConfig, withAndroidManifest, withAppBuildGradle } = require('expo/config-plugins');

const PLACEHOLDER = 'usesCleartextTraffic';
const LINHA_GRADLE = `manifestPlaceholders += [${PLACEHOLDER}: findProperty('minhafazenda.httpLocal') ?: 'false']`;

function comManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:usesCleartextTraffic'] = `\${${PLACEHOLDER}}`;
    return cfg;
  });
}

function comGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(LINHA_GRADLE)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /defaultConfig\s*\{/,
        (inicio) => `${inicio}\n        // API em http só no build de staging (plugins/withHttpLocal.js)\n        ${LINHA_GRADLE}`
      );
    }
    return cfg;
  });
}

module.exports = function withHttpLocal(config) {
  return comGradle(comManifest(config));
};
