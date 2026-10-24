// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Migrations do Drizzle (.sql) entram no bundle como texto (ver babel.config.js).
config.resolver.sourceExts.push('sql');

module.exports = config;
