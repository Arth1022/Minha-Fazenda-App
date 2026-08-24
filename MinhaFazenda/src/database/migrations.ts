import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // Quando adicionar/alterar campos no futuro, altere a versão do schema
    // em schema.ts e adicione uma nova entrada aqui.
    // Exemplo de uso futuro:
    /*
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'animais',
          columns: [{ name: 'observacoes', type: 'string', isOptional: true }],
        }),
      ],
    },
    */
  ],
});
