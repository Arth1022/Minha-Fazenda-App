# Mudanças de schema

Status: proposto → entity+changeset → API em produção → app publicado → concluído

Pedido inicial do app (SCHEMA_VERSION 1): as tabelas que o celular sincroniza, geradas de `src/entities/`.
Regras: nomes em `snake_case` iguais nas três camadas; ids `uuid` gerados no celular; datas `timestamptz`
(no celular, texto ISO 8601 em UTC); booleano `boolean` (no celular 0/1, no upload `true`/`false`);
listas e objetos em `text` com JSON. O upload manda as colunas em `data` com esses nomes.

Fora do sync (só no celular, local-only): `perfil_local`, `notificacoes_agendadas`, `pontos_gps`.
Só do servidor: `sessoes`, `convites`, `sync_rejeicoes` (ver arquitetura) e as colunas de `usuarios` além de `id`, `nome`, `avatar_url`.

Nulo? abaixo é o que o app grava hoje (não = o app sempre preenche). Coluna nova depois desta leva é sempre nullable.

| ID | Data | Tabela | Mudança | Tipo (Postgres) | Nulo? | Pedido por | Status |
|---|---|---|---|---|---|---|---|
| SC-001 | 2026-11-11 | fazendas | + tabela `fazendas` (6 colunas) | ver SC-001 | ver SC-001 | front | proposto |
| SC-002 | 2026-11-11 | fazenda_membros | + tabela `fazenda_membros` (6 colunas) | ver SC-002 | ver SC-002 | front | proposto |
| SC-003 | 2026-11-11 | usuarios | + tabela `usuarios` (3 colunas) | ver SC-003 | ver SC-003 | front | proposto |
| SC-004 | 2026-11-11 | fazenda_config | + tabela `fazenda_config` (13 colunas) | ver SC-004 | ver SC-004 | front | proposto |
| SC-005 | 2026-11-11 | lotes | + tabela `lotes` (10 colunas) | ver SC-005 | ver SC-005 | front | proposto |
| SC-006 | 2026-11-11 | animais | + tabela `animais` (33 colunas) | ver SC-006 | ver SC-006 | front | proposto |
| SC-007 | 2026-11-11 | pesagens | + tabela `pesagens` (10 colunas) | ver SC-007 | ver SC-007 | front | proposto |
| SC-008 | 2026-11-11 | reproducoes | + tabela `reproducoes` (18 colunas) | ver SC-008 | ver SC-008 | front | proposto |
| SC-009 | 2026-11-11 | tratamentos | + tabela `tratamentos` (21 colunas) | ver SC-009 | ver SC-009 | front | proposto |
| SC-010 | 2026-11-11 | doses_aplicadas | + tabela `doses_aplicadas` (8 colunas) | ver SC-010 | ver SC-010 | front | proposto |
| SC-011 | 2026-11-11 | avaliacoes_corporais | + tabela `avaliacoes_corporais` (9 colunas) | ver SC-011 | ver SC-011 | front | proposto |
| SC-012 | 2026-11-11 | controles_leiteiros | + tabela `controles_leiteiros` (9 colunas) | ver SC-012 | ver SC-012 | front | proposto |
| SC-013 | 2026-11-11 | secagens | + tabela `secagens` (8 colunas) | ver SC-013 | ver SC-013 | front | proposto |
| SC-014 | 2026-11-11 | mastites | + tabela `mastites` (11 colunas) | ver SC-014 | ver SC-014 | front | proposto |
| SC-015 | 2026-11-11 | cios | + tabela `cios` (9 colunas) | ver SC-015 | ver SC-015 | front | proposto |
| SC-016 | 2026-11-11 | exames | + tabela `exames` (13 colunas) | ver SC-016 | ver SC-016 | front | proposto |
| SC-017 | 2026-11-11 | anotacoes_animal | + tabela `anotacoes_animal` (9 colunas) | ver SC-017 | ver SC-017 | front | proposto |
| SC-018 | 2026-11-11 | ordenhas | + tabela `ordenhas` (11 colunas) | ver SC-018 | ver SC-018 | front | proposto |
| SC-019 | 2026-11-11 | maquinas | + tabela `maquinas` (24 colunas) | ver SC-019 | ver SC-019 | front | proposto |
| SC-020 | 2026-11-11 | usos_maquina | + tabela `usos_maquina` (35 colunas) | ver SC-020 | ver SC-020 | front | proposto |
| SC-021 | 2026-11-11 | paradas_uso | + tabela `paradas_uso` (10 colunas) | ver SC-021 | ver SC-021 | front | proposto |
| SC-022 | 2026-11-11 | abastecimentos | + tabela `abastecimentos` (18 colunas) | ver SC-022 | ver SC-022 | front | proposto |
| SC-023 | 2026-11-11 | leituras_horimetro | + tabela `leituras_horimetro` (15 colunas) | ver SC-023 | ver SC-023 | front | proposto |
| SC-024 | 2026-11-11 | ocorrencias_maquina | + tabela `ocorrencias_maquina` (18 colunas) | ver SC-024 | ver SC-024 | front | proposto |
| SC-025 | 2026-11-11 | anotacoes_maquina | + tabela `anotacoes_maquina` (9 colunas) | ver SC-025 | ver SC-025 | front | proposto |
| SC-026 | 2026-11-11 | talhoes | + tabela `talhoes` (21 colunas) | ver SC-026 | ver SC-026 | front | proposto |
| SC-027 | 2026-11-11 | marcadores_mapa | + tabela `marcadores_mapa` (13 colunas) | ver SC-027 | ver SC-027 | front | proposto |
| SC-028 | 2026-11-11 | movimentacoes | + tabela `movimentacoes` (13 colunas) | ver SC-028 | ver SC-028 | front | proposto |
| SC-029 | 2026-11-11 | calculos_cerca | + tabela `calculos_cerca` (21 colunas) | ver SC-029 | ver SC-029 | front | proposto |
| SC-030 | 2026-11-11 | modelos_cultura | + tabela `modelos_cultura` (10 colunas) | ver SC-030 | ver SC-030 | front | proposto |
| SC-031 | 2026-11-11 | ciclos_plantio | + tabela `ciclos_plantio` (18 colunas) | ver SC-031 | ver SC-031 | front | proposto |
| SC-032 | 2026-11-11 | etapas_ciclo | + tabela `etapas_ciclo` (17 colunas) | ver SC-032 | ver SC-032 | front | proposto |
| SC-033 | 2026-11-11 | usos_area | + tabela `usos_area` (11 colunas) | ver SC-033 | ver SC-033 | front | proposto |

## SC-001 — tabela `fazendas`
- Só leitura no celular (desce pelo sync; muda pelos endpoints REST). Colunas que o celular recebe.
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `nome` | text | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-002 — tabela `fazenda_membros`
- Só leitura no celular (desce pelo sync; muda pelos endpoints REST). Colunas que o celular recebe.
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `fazenda_id` | uuid | não |
| `usuario_id` | uuid | não |
| `papel` | text (owner / collaborator) | não |
| `created_at` | timestamptz | sim |
| `removed_at` | timestamptz | sim |

## SC-003 — tabela `usuarios`
- Só leitura no celular (desce pelo sync; muda pelos endpoints REST). Colunas que o celular recebe.
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `nome` | text | não |
| `avatar_url` | text | sim |

## SC-004 — tabela `fazenda_config`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `tipo_producao` | text (leite / corte / misto) | não |
| `divisa_json` | text (JSON) | sim |
| `area_hectares` | numeric | sim |
| `min_lat` | numeric | sim |
| `max_lat` | numeric | sim |
| `min_lng` | numeric | sim |
| `max_lng` | numeric | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-005 — tabela `lotes`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `nome` | text | não |
| `descricao` | text | sim |
| `area_id` | uuid | sim |
| `area_desde` | timestamptz | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-006 — tabela `animais`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `brinco` | text | não |
| `nome` | text | sim |
| `raca` | text | sim |
| `sexo` | text (F / M) | não |
| `data_nascimento` | timestamptz | sim |
| `nascimento_aproximado` | boolean | não |
| `ja_pariu` | boolean | não |
| `crias_anteriores` | integer | não |
| `mae_id` | uuid | sim |
| `pai_id` | uuid | sim |
| `pai_descricao` | text | sim |
| `origem` | text (nascido / comprado) | sim |
| `data_entrada` | timestamptz | sim |
| `status` | text (ativo / vendido / morto / descarte) | não |
| `data_saida` | timestamptz | sim |
| `motivo_saida` | text | sim |
| `lote_id` | uuid | sim |
| `producao_leite_l` | numeric | sim |
| `racao_kg_dia` | numeric | sim |
| `valor_compra` | numeric | sim |
| `valor_venda` | numeric | sim |
| `peso_saida_kg` | numeric | sim |
| `sisbov` | text | sim |
| `grau_sangue` | text | sim |
| `foto_uri` | text | sim |
| `data_desmame` | timestamptz | sim |
| `parto_assistido` | boolean | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-007 — tabela `pesagens`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `data` | timestamptz | não |
| `peso_kg` | numeric | não |
| `metodo` | text (balanca / fita) | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-008 — tabela `reproducoes`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `tipo` | text (cobertura / inseminacao) | não |
| `data` | timestamptz | não |
| `prenhez_confirmada` | boolean | sim |
| `previsao_parto` | timestamptz | sim |
| `data_parto` | timestamptz | sim |
| `cria_id` | uuid | sim |
| `touro_id` | uuid | sim |
| `touro_descricao` | text | sim |
| `data_diagnostico` | timestamptz | sim |
| `metodo_diagnostico` | text (toque / ultrassom / outro) | sim |
| `data_aborto` | timestamptz | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-009 — tabela `tratamentos`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `medicamento` | text | não |
| `dose` | text | sim |
| `data_inicio` | timestamptz | não |
| `data_fim` | timestamptz | sim |
| `dias_semana` | text (JSON) | não |
| `horario` | text | sim |
| `intervalo_horas` | integer | sim |
| `aviso_minutos_antes` | integer | não |
| `notificacao_ativa` | boolean | não |
| `carencia_leite_dias` | integer | sim |
| `carencia_carne_dias` | integer | sim |
| `observacoes` | text | sim |
| `grupo_aplicacao_id` | uuid | sim |
| `comprovante_uri` | text | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-010 — tabela `doses_aplicadas`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `tratamento_id` | uuid | não |
| `dia` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-011 — tabela `avaliacoes_corporais`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `data` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |
| `escore` | numeric | não |

## SC-012 — tabela `controles_leiteiros`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `data` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |
| `litros` | numeric | não |

## SC-013 — tabela `secagens`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `data` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-014 — tabela `mastites`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `data` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |
| `tetos` | text (JSON) | não |
| `tipo` | text (clinica / subclinica) | não |
| `observacoes` | text | sim |

## SC-015 — tabela `cios`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `data` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |
| `observacoes` | text | sim |

## SC-016 — tabela `exames`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `data` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |
| `tipo` | text (brucelose / tuberculose / outro) | não |
| `descricao` | text | sim |
| `resultado` | text (negativo / positivo / inconclusivo) | não |
| `validade_dias` | integer | sim |
| `comprovante_uri` | text | sim |

## SC-017 — tabela `anotacoes_animal`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `data` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |
| `texto` | text | não |

## SC-018 — tabela `ordenhas`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `periodo` | text (manha / tarde / noite) | não |
| `horario_previsto` | text | sim |
| `horario_notificacao` | text | sim |
| `volume_litros` | numeric | sim |
| `data_registro` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-019 — tabela `maquinas`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `codigo` | text | não |
| `nome` | text | não |
| `tipo` | text (trator / colheitadeira / pulverizador / plantadeira / implemento / caminhao / utilitario / ordenhadeira / outro) | não |
| `categoria` | text (motorizada / implemento) | não |
| `marca` | text | sim |
| `modelo` | text | sim |
| `ano_fabricacao` | integer | sim |
| `numero_serie` | text | sim |
| `placa` | text | sim |
| `potencia_cv` | numeric | sim |
| `combustivel` | text (diesel / gasolina / etanol / flex / eletrico / nenhum) | sim |
| `tanque_litros` | numeric | sim |
| `largura_trabalho_m` | numeric | sim |
| `possui_horimetro` | boolean | não |
| `velocidade_max_kmh` | numeric | sim |
| `horimetro_inicial` | numeric | sim |
| `data_aquisicao` | timestamptz | sim |
| `status` | text (ativa / manutencao / inativa) | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-020 — tabela `usos_maquina`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `maquina_id` | uuid | não |
| `inicio` | timestamptz | não |
| `fim` | timestamptz | sim |
| `operador` | text | sim |
| `operador_id` | uuid | sim |
| `implemento_id` | uuid | sim |
| `atividade` | text (plantio / pulverizacao / gradagem / transporte / trato / parado / outro) | sim |
| `origem` | text (app / manual) | não |
| `fim_motivo` | text (manual / parada / pausa / velocidade / assumida / fora) | sim |
| `rastreado` | boolean | não |
| `inicio_lat` | numeric | sim |
| `inicio_lng` | numeric | sim |
| `fim_lat` | numeric | sim |
| `fim_lng` | numeric | sim |
| `km_total` | numeric | sim |
| `km_trabalhando` | numeric | sim |
| `seg_trabalhando` | integer | sim |
| `seg_deslocando` | integer | sim |
| `seg_parada` | integer | sim |
| `seg_pausa` | integer | sim |
| `seg_sem_sinal` | integer | sim |
| `area_estimada_ha` | numeric | sim |
| `qualidade` | numeric | sim |
| `localizacao_simulada` | boolean | não |
| `rastro` | text (JSON) | sim |
| `talhoes` | text (JSON) | sim |
| `parada_avisada_em` | timestamptz | sim |
| `continua_ate` | timestamptz | sim |
| `regras_desde` | timestamptz | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-021 — tabela `paradas_uso`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `uso_id` | uuid | não |
| `motivo` | text (pausa / continua) | não |
| `inicio` | timestamptz | não |
| `fim` | timestamptz | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-022 — tabela `abastecimentos`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `maquina_id` | uuid | não |
| `uso_id` | uuid | sim |
| `operador` | text | sim |
| `operador_id` | uuid | sim |
| `litros` | numeric | não |
| `tanque_cheio` | boolean | não |
| `origem` | text (fazenda / posto) | não |
| `horimetro_h` | numeric | sim |
| `lat` | numeric | sim |
| `lng` | numeric | sim |
| `foto_uri` | text | sim |
| `abastecido_em` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-023 — tabela `leituras_horimetro`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `maquina_id` | uuid | não |
| `uso_id` | uuid | sim |
| `operador` | text | sim |
| `operador_id` | uuid | sim |
| `valor_h` | numeric | não |
| `estimado_h` | numeric | sim |
| `origem` | text (abastecimento / avulsa) | não |
| `foto_uri` | text | sim |
| `lido_em` | timestamptz | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-024 — tabela `ocorrencias_maquina`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `maquina_id` | uuid | não |
| `uso_id` | uuid | sim |
| `operador` | text | sim |
| `operador_id` | uuid | sim |
| `categoria` | text (motor / hidraulico / pneu / eletrico / vazamento / outro) | não |
| `pode_usar` | boolean | não |
| `descricao` | text | sim |
| `foto_uri` | text | sim |
| `lat` | numeric | sim |
| `lng` | numeric | sim |
| `registrado_em` | timestamptz | não |
| `resolvida_em` | timestamptz | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-025 — tabela `anotacoes_maquina`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `maquina_id` | uuid | não |
| `uso_id` | uuid | sim |
| `texto` | text | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-026 — tabela `talhoes`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `nome` | text | não |
| `tipo` | text (pasto / lavoura / reserva / outro) | não |
| `cor` | text | não |
| `area_hectares` | numeric | não |
| `perimetro_m` | numeric | sim |
| `geometria_json` | text (JSON) | não |
| `centro_lat` | numeric | não |
| `centro_lng` | numeric | não |
| `min_lat` | numeric | não |
| `max_lat` | numeric | não |
| `min_lng` | numeric | não |
| `max_lng` | numeric | não |
| `cultura` | text | sim |
| `fase_lavoura` | text (preparo / vegetativo / colheita / pousio) | sim |
| `data_plantio` | timestamptz | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-027 — tabela `marcadores_mapa`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `talhao_id` | uuid | sim |
| `tipo` | text (praga / daninha / erosao / outro) | não |
| `titulo` | text | não |
| `descricao` | text | sim |
| `lat` | numeric | não |
| `lng` | numeric | não |
| `resolvido` | boolean | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-028 — tabela `movimentacoes`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `animal_id` | uuid | não |
| `area_id` | uuid | não |
| `lote_id` | uuid | sim |
| `entrada_em` | timestamptz | não |
| `saida_em` | timestamptz | sim |
| `registrado_por` | text | sim |
| `registrado_por_id` | uuid | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-029 — tabela `calculos_cerca`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `area_id` | uuid | não |
| `tipo_cerca` | text (arame4 / arame5 / eletrica1 / eletrica2) | não |
| `fios` | integer | não |
| `espacamento_m` | numeric | não |
| `perimetro_m` | numeric | não |
| `cantos` | integer | não |
| `metros_arame` | numeric | não |
| `rolos` | integer | não |
| `mouroes` | integer | não |
| `esticadores` | integer | não |
| `preco_rolo` | numeric | sim |
| `preco_mourao` | numeric | sim |
| `preco_esticador` | numeric | sim |
| `custo` | numeric | sim |
| `desatualizado` | boolean | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-030 — tabela `modelos_cultura`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `nome` | text | não |
| `taxa_kg_ha` | numeric | sim |
| `saco_kg` | numeric | não |
| `etapas` | text (JSON) | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-031 — tabela `ciclos_plantio`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `area_id` | uuid | não |
| `cultura` | text | não |
| `modelo_id` | text | sim |
| `data_plantio` | timestamptz | não |
| `area_ha` | numeric | não |
| `taxa_kg_ha` | numeric | não |
| `saco_kg` | numeric | não |
| `sementes_kg` | numeric | não |
| `sacos` | integer | não |
| `calculo_desatualizado` | boolean | não |
| `status` | text (ativo / encerrado / cancelado) | não |
| `encerrado_em` | timestamptz | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-032 — tabela `etapas_ciclo`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `ciclo_id` | uuid | não |
| `ordem` | integer | não |
| `nome` | text | não |
| `tipo` | text (preparo / plantio / trato / colheita) | não |
| `prevista_em` | timestamptz | não |
| `realizada_em` | timestamptz | sim |
| `observacao` | text | sim |
| `responsavel_id` | uuid | sim |
| `responsavel_nome` | text | sim |
| `atribuida_em` | timestamptz | sim |
| `atribuida_por` | uuid | sim |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |

## SC-033 — tabela `usos_area`
- Tabela de domínio: `BaseFazendaEntity` (+ `server_updated_at`, preenchido pela API), índice em `fazenda_id`. Sync Stream: bloco por `fazenda_id` (SELECT *).
- Impacto em apps antigos: nenhum (tabela nova; o app ainda não foi publicado)

| Coluna | Tipo (Postgres) | Nulo? |
|---|---|---|
| `id` | uuid | não |
| `uso_id` | uuid | não |
| `area_id` | uuid | não |
| `inicio` | timestamptz | não |
| `segundos` | integer | não |
| `km` | numeric | não |
| `fazenda_id` | uuid | não |
| `created_by` | uuid | sim |
| `created_at` | timestamptz | sim |
| `updated_at` | timestamptz | sim |
| `deleted_at` | timestamptz | sim |