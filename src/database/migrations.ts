import {
  addColumns,
  createTable,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'animais',
          columns: [
            { name: 'pai_brinco', type: 'string', isOptional: true },
            { name: 'mae_brinco', type: 'string', isOptional: true },
            { name: 'data_nascimento', type: 'number', isOptional: true },
          ],
        }),
        createTable({
          name: 'coberturas',
          columns: [
            { name: 'animal_id', type: 'string', isIndexed: true },
            { name: 'data', type: 'number' },
            { name: 'tipo', type: 'string' },
            { name: 'touro_semen', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
