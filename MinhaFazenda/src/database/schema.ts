import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1, // Aumente este número sempre que alterar a estrutura das tabelas
  tables: [
    // Tela: Mapeamento & Áreas
    tableSchema({
      name: 'talhoes',
      columns: [
        { name: 'nome', type: 'string' },
        { name: 'tipo', type: 'string', isOptional: true },
        { name: 'area_ha', type: 'number', isOptional: true },
        { name: 'poligono_geojson', type: 'string', isOptional: true },
        { name: 'possui_cerca', type: 'boolean', isOptional: true },
        { name: 'criado_em', type: 'number' },
        { name: 'atualizado_em', type: 'number' },
      ],
    }),

    // Tela: Gerenciamento Rebanho
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
        { name: 'criado_em', type: 'number' },
        { name: 'atualizado_em', type: 'number' },
      ],
    }),

    // Tela: Tratamento Animal
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
        { name: 'criado_em', type: 'number' },
        { name: 'atualizado_em', type: 'number' },
      ],
    }),

    // Tela: Estoque Fazenda
    tableSchema({
      name: 'estoque_itens',
      columns: [
        { name: 'categoria', type: 'string' },
        { name: 'nome', type: 'string' },
        { name: 'quantidade', type: 'number' },
        { name: 'unidade', type: 'string' },
        { name: 'estoque_minimo', type: 'number', isOptional: true },
        { name: 'criado_em', type: 'number' },
        { name: 'atualizado_em', type: 'number' },
      ],
    }),

    // Tela: Máquinas & Ordenha (parte Máquinas)
    tableSchema({
      name: 'maquinas',
      columns: [
        { name: 'nome', type: 'string' },
        { name: 'status_percentual', type: 'number', isOptional: true },
        { name: 'manutencao_devida', type: 'boolean', isOptional: true },
        { name: 'criado_em', type: 'number' },
        { name: 'atualizado_em', type: 'number' },
      ],
    }),

    // Tela: Máquinas & Ordenha (parte Ordenha)
    tableSchema({
      name: 'ordenhas',
      columns: [
        { name: 'periodo', type: 'string' },
        { name: 'horario_previsto', type: 'string', isOptional: true },
        { name: 'horario_notificacao', type: 'string', isOptional: true },
        { name: 'volume_litros', type: 'number', isOptional: true },
        { name: 'data_registro', type: 'number' },
        { name: 'criado_em', type: 'number' },
        { name: 'atualizado_em', type: 'number' },
      ],
    }),
  ],
});
