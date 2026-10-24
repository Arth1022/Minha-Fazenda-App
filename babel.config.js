module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Migrations do Drizzle: importa os arquivos .sql como string
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
