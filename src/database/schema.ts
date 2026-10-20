import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'talhoes',
      columns: [
        { name: 'nome', type: 'string' },
        { name: 'tipo', type: 'string', isOptional: true },
        { name: 'area_ha', type: 'number', isOptional: true },
        { name: 'poligono_geojson', type: 'string', isOptional: true },
        { name: 'possui_cerca', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'animais',
      columns: [
        { name: 'brinco', type: 'string', isIndexed: true },
        { name: 'nome', type: 'string', isOptional: true },
        { name: 'raca', type: 'string', isOptional: true },
        { name: 'peso_kg', type: 'number', isOptional: true },
        { name: 'producao_leite_l', type: 'number', isOptional: true },
        { name: 'crias', type: 'number', isOptional: true },
        { name: 'racao_kg_dia', type: 'number', isOptional: true },
        { name: 'talhao_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'tratamentos',
      columns: [
        { name: 'animal_id', type: 'string', isIndexed: true },
        { name: 'medicamento', type: 'string' },
        { name: 'data_inicio', type: 'number' },
        { name: 'data_fim', type: 'number', isOptional: true },
        { name: 'dias_confirmados', type: 'string', isOptional: true },
        { name: 'proxima_dose_em', type: 'number', isOptional: true },
        { name: 'notificacao_ativa', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'estoque_itens',
      columns: [
        { name: 'categoria', type: 'string' },
        { name: 'nome', type: 'string' },
        { name: 'quantidade', type: 'number' },
        { name: 'unidade', type: 'string' },
        { name: 'estoque_minimo', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'maquinas',
      columns: [
        { name: 'nome', type: 'string' },
        { name: 'status_percentual', type: 'number', isOptional: true },
        { name: 'manutencao_devida', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'ordenhas',
      columns: [
        { name: 'periodo', type: 'string' },
        { name: 'horario_previsto', type: 'string', isOptional: true },
        { name: 'horario_notificacao', type: 'string', isOptional: true },
        { name: 'volume_litros', type: 'number', isOptional: true },
        { name: 'data_registro', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
