# Mapeamento do schema do app para o back-end

Gerado de `src/entities/` (fonte da verdade do schema no app) em 2026-11-11 · `SCHEMA_VERSION = 2` (2026-11-16: sem `animais.racao_kg_dia`, SC-050) · branch `feature/conta-e-sync`.

Este é o schema que o celular sincroniza com o Postgres. Cada tabela abaixo precisa existir no Postgres com estas colunas e tipos (o teste `npm run test:schema` do app compara com `contracts/schema-colunas.json` do CI do back). O pedido formal de cada tabela está no `SCHEMA_CHANGES.md` (SC-001 a SC-033; a saída de `animais.racao_kg_dia` é o SC-050).

## Convenções

| App (Drizzle/SQLite) | Postgres | Java (Entity) |
|---|---|---|
| text com UUID (`id`, `*_id`, `created_by`, `atribuida_por`) | uuid | UUID |
| text | text | String |
| text (enum) | text | enum (`@Enumerated(STRING)`) |
| text (JSON) | text | String (JSON) |
| integer | integer | Integer |
| real | numeric | BigDecimal |
| integer 0/1 (boolean) | boolean | Boolean |
| text ISO 8601 UTC (data e hora) | timestamptz | OffsetDateTime |

- **Nomes** em `snake_case`, iguais no Drizzle, no Postgres e no `data` do upload.
- **ids** são UUID gerados no celular; o servidor aceita o id que veio do app e nunca troca (o QR impresso aponta para ele).
- **Toda tabela de domínio** tem `id`, `fazenda_id` (não nulo), `created_by`, `created_at`, `updated_at`, `deleted_at` e, só no servidor, `server_updated_at`, com índice em `fazenda_id` (`BaseFazendaEntity`).
- **Apagar = soft delete**: o app nunca manda `DELETE` de tabela de domínio; manda `PATCH` com `deleted_at` (e `updated_at`). "Apagar junto" (ex.: excluir área apaga os marcadores e a cerca) também chega como `PATCH` de cada linha. Não precisa de `ON DELETE CASCADE`.
- **Sem FK nem UNIQUE no celular** (o PowerSync guarda as tabelas como views). A coluna "Valores / referência" diz para onde cada `*_id` aponta; as regras de unicidade que o app confere estão em cada tabela. Se o back criar UNIQUE no Postgres, um conflito entre dois celulares offline vira rejeição no `/sync/upload`.
- **Datas**: o app grava `toISOString()` (`2026-11-11T12:34:56.789Z`). O PowerSync precisa devolver no mesmo formato ISO 8601 em UTC (config edition 2+).
- **"Nulo? = não"** é o que o app sempre preenche. Pela regra do back, coluna nova depois desta leva é sempre nullable.

## Formato do upload (`POST /sync/upload`)

```json
{ "schemaVersion": 1,
  "ops": [
    { "op": "PUT",   "table": "animais", "id": "<uuid>", "data": { "fazenda_id": "<uuid>", "brinco": "1023", "sexo": "F", "ja_pariu": false, "created_at": "2026-11-11T12:00:00.000Z", "updated_at": "2026-11-11T12:00:00.000Z" } },
    { "op": "PATCH", "table": "animais", "id": "<uuid>", "data": { "nome": "Mimosa", "updated_at": "2026-11-11T12:05:00.000Z" } },
    { "op": "PATCH", "table": "pesagens", "id": "<uuid>", "data": { "deleted_at": "2026-11-11T12:06:00.000Z", "updated_at": "2026-11-11T12:06:00.000Z" } }
  ] }
```

- `PUT` = registro novo, com todas as colunas não nulas; `PATCH` = só as colunas que mudaram.
- Booleanos vão como `true`/`false`; JSON vai como texto (string); datas como texto ISO 8601.
- `fazenda_id`, `created_by` e `created_at` vêm preenchidos pelo app, mas a API não deve confiar neles (membro e papel saem de `fazenda_membros`).
- O app descarta, sem enviar, qualquer escrita local em `fazendas`, `fazenda_membros` e `usuarios`.

## Tabelas

| Tabela | Tipo | Colunas no app | Para que serve |
|---|---|---|---|
| [`fazendas`](#fazendas) | só leitura no celular | 6 | Fazendas. Criadas e renomeadas pela API (`POST`/`PATCH /fazendas`). |
| [`fazenda_membros`](#fazenda_membros) | só leitura no celular | 6 | Quem está em cada fazenda e o papel. `removed_at` preenchido = saiu ou foi removido. Único (fazenda_id, usuario_id). |
| [`usuarios`](#usuarios) | só leitura no celular | 3 | Colegas de fazenda: o celular recebe só id, nome e avatar_url (stream `colegas`). As outras colunas (e-mail, telefone, credencial) são só do servidor. |
| [`fazenda_config`](#fazenda_config) | domínio | 13 | Configuração da fazenda: uma linha por fazenda, com `id` igual ao `fazenda_id` (tipo de produção e divisa no mapa). |
| [`lotes`](#lotes) | domínio | 10 | Lotes de animais; guardam o pasto em que o lote foi colocado inteiro. |
| [`animais`](#animais) | domínio | 33 | Rebanho. |
| [`pesagens`](#pesagens) | domínio | 10 | Pesagens do animal (balança ou fita). |
| [`reproducoes`](#reproducoes) | domínio | 18 | Coberturas e inseminações, diagnóstico, parto e aborto. |
| [`tratamentos`](#tratamentos) | domínio | 21 | Tratamentos com agenda de doses e carências. |
| [`doses_aplicadas`](#doses_aplicadas) | domínio | 8 | Um registro por dia de dose confirmada (`dia` = meia-noite local do dia). |
| [`avaliacoes_corporais`](#avaliacoes_corporais) | domínio | 9 | Escore de condição corporal (1 a 5). |
| [`controles_leiteiros`](#controles_leiteiros) | domínio | 9 | Litros da vaca num dia. |
| [`secagens`](#secagens) | domínio | 8 | Secagem da vaca. |
| [`mastites`](#mastites) | domínio | 11 | Casos de mastite com os tetos afetados. |
| [`cios`](#cios) | domínio | 9 | Cios observados. |
| [`exames`](#exames) | domínio | 13 | Exames (brucelose, tuberculose…) com validade. |
| [`anotacoes_animal`](#anotacoes_animal) | domínio | 9 | Anotações livres da ficha do animal. |
| [`ordenhas`](#ordenhas) | domínio | 11 | Horários e registros de ordenha por turno. |
| [`maquinas`](#maquinas) | domínio | 24 | Máquinas e implementos. `codigo` é o ID curto (TR-01) impresso no QR. |
| [`usos_maquina`](#usos_maquina) | domínio | 35 | Cada vez que uma máquina foi ligada (`fim` nulo = em uso), com o resumo do rastro gravado ao encerrar. |
| [`paradas_uso`](#paradas_uso) | domínio | 10 | Pausas e respostas "Continua" durante um uso. |
| [`abastecimentos`](#abastecimentos) | domínio | 18 | Abastecimentos (consumo de tanque cheio a tanque cheio). |
| [`leituras_horimetro`](#leituras_horimetro) | domínio | 15 | Leituras do horímetro, sempre digitadas. |
| [`ocorrencias_maquina`](#ocorrencias_maquina) | domínio | 19 | Problemas relatados na máquina (`resolvida_em` nulo = em aberto). |
| [`anotacoes_maquina`](#anotacoes_maquina) | domínio | 9 | Anotações livres da máquina. |
| [`talhoes`](#talhoes) | domínio | 21 | Áreas do mapa (pasto, lavoura, reserva, outro) com geometria GeoJSON. |
| [`marcadores_mapa`](#marcadores_mapa) | domínio | 13 | Pontos de atenção no mapa (praga, daninha, erosão). |
| [`movimentacoes`](#movimentacoes) | domínio | 13 | Entradas e saídas de animais nos pastos (`saida_em` nulo = local atual). |
| [`calculos_cerca`](#calculos_cerca) | domínio | 21 | Conta de cerca salva para uma área (uma por área). |
| [`modelos_cultura`](#modelos_cultura) | domínio | 10 | Modelos de cultura criados na fazenda (os prontos ficam no código). |
| [`ciclos_plantio`](#ciclos_plantio) | domínio | 18 | Ciclos de plantio de uma lavoura (no máximo um `ativo` por área). |
| [`etapas_ciclo`](#etapas_ciclo) | domínio | 17 | Etapas da linha do tempo do ciclo; com responsável, viram tarefa. |
| [`usos_area`](#usos_area) | domínio | 11 | Tempo e KM de cada uso de máquina em cada área. |

## Fora do sync

**Só no celular (local-only, nunca sobem e não existem no Postgres):**
- `perfil_local` (id, nome, foto_path)
- `notificacoes_agendadas` (id, entidade, entidade_id, dispara_em, created_at)
- `pontos_gps` (id, uso_id, lat, lng, precisao_m, velocidade_ms, simulado, registrado_em)

**Só no servidor** (ver arquitetura): `sessoes`, `convites`, `sync_rejeicoes`, e as colunas de `usuarios` além de `id`, `nome`, `avatar_url`.

**Saíram do app nesta leva** (se o back já tinha algo assim, não precisa criar): `talhoes.sync_status` (o PowerSync controla o sync), `tratamentos.dias_confirmados` e `tratamentos.proxima_dose_em` (legado, substituídos por `doses_aplicadas` e pela agenda), `fazenda_config.nome` (o nome é o de `fazendas`), e `criado_por` em todas as tabelas (virou `created_by`).

## Sync Streams

- `fazendas`, `membros` e `colegas` (só `id, nome, avatar_url` de `usuarios`), como na arquitetura.
- Um bloco `SELECT * FROM <tabela> WHERE fazenda_id IN (...membros ativos...)` para cada tabela de domínio: `fazenda_config`, `lotes`, `animais`, `pesagens`, `reproducoes`, `tratamentos`, `doses_aplicadas`, `avaliacoes_corporais`, `controles_leiteiros`, `secagens`, `mastites`, `cios`, `exames`, `anotacoes_animal`, `ordenhas`, `maquinas`, `usos_maquina`, `paradas_uso`, `abastecimentos`, `leituras_horimetro`, `ocorrencias_maquina`, `anotacoes_maquina`, `talhoes`, `marcadores_mapa`, `movimentacoes`, `calculos_cerca`, `modelos_cultura`, `ciclos_plantio`, `etapas_ciclo`, `usos_area`.

## Colunas por tabela

### fazendas

Fazendas. Criadas e renomeadas pela API (`POST`/`PATCH /fazendas`).

- Tipo: **só leitura no celular**

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `nome` | text | String | não |  |  |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |

### fazenda_membros

Quem está em cada fazenda e o papel. `removed_at` preenchido = saiu ou foi removido. Único (fazenda_id, usuario_id).

- Tipo: **só leitura no celular**
- Unicidade conferida pelo app: (fazenda_id, usuario_id) único.
- Índices no celular: `fazenda_membros_usuario_idx` (usuario_id, fazenda_id), `fazenda_membros_fazenda_idx` (fazenda_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `usuario_id` | uuid | UUID | não |  | → usuarios.id |
| `papel` | text | enum (@Enumerated(STRING)) | não |  | `owner`, `collaborator` |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `removed_at` | timestamptz | OffsetDateTime | sim |  |  |

### usuarios

Colegas de fazenda: o celular recebe só id, nome e avatar_url (stream `colegas`). As outras colunas (e-mail, telefone, credencial) são só do servidor.

- Tipo: **só leitura no celular**

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `nome` | text | String | não |  |  |
| `avatar_url` | text | String | sim |  |  |

### fazenda_config

Configuração da fazenda: uma linha por fazenda, com `id` igual ao `fazenda_id` (tipo de produção e divisa no mapa).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: Uma linha por fazenda (`id` = `fazenda_id`).
- Índices no celular: `fazenda_config_fazenda_idx` (fazenda_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  | → fazendas.id (mesmo valor de fazenda_id) |
| `tipo_producao` | text | enum (@Enumerated(STRING)) | não |  | `leite`, `corte`, `misto` |
| `divisa_json` | text | String (JSON) | sim |  | JSON: anel da divisa `[[lng, lat], ...]` (fechado) |
| `area_hectares` | numeric | BigDecimal | sim |  |  |
| `min_lat` | numeric | BigDecimal | sim |  |  |
| `max_lat` | numeric | BigDecimal | sim |  |  |
| `min_lng` | numeric | BigDecimal | sim |  |  |
| `max_lng` | numeric | BigDecimal | sim |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### lotes

Lotes de animais; guardam o pasto em que o lote foi colocado inteiro.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: `nome` único na fazenda, sem diferenciar maiúsculas.
- Índices no celular: `lotes_fazenda_idx` (fazenda_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `nome` | text | String | não |  |  |
| `descricao` | text | String | sim |  |  |
| `area_id` | uuid | UUID | sim |  | → talhoes.id |
| `area_desde` | timestamptz | OffsetDateTime | sim |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### animais

Rebanho.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `animais_fazenda_idx` (fazenda_id), `animais_brinco_idx` (brinco), `animais_mae_id_idx` (mae_id), `animais_pai_id_idx` (pai_id), `animais_lote_id_idx` (lote_id), `animais_status_idx` (status)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `brinco` | text | String | não |  |  |
| `nome` | text | String | sim |  |  |
| `raca` | text | String | sim |  |  |
| `sexo` | text | enum (@Enumerated(STRING)) | não | `"F"` | `F`, `M` |
| `data_nascimento` | timestamptz | OffsetDateTime | sim |  |  |
| `nascimento_aproximado` | boolean | Boolean | não | `false` |  |
| `ja_pariu` | boolean | Boolean | não | `false` |  |
| `crias_anteriores` | integer | Integer | não | `0` |  |
| `mae_id` | uuid | UUID | sim |  | → animais.id |
| `pai_id` | uuid | UUID | sim |  | → animais.id |
| `pai_descricao` | text | String | sim |  |  |
| `origem` | text | enum (@Enumerated(STRING)) | sim |  | `nascido`, `comprado` |
| `data_entrada` | timestamptz | OffsetDateTime | sim |  |  |
| `status` | text | enum (@Enumerated(STRING)) | não | `"ativo"` | `ativo`, `vendido`, `morto`, `descarte` |
| `data_saida` | timestamptz | OffsetDateTime | sim |  |  |
| `motivo_saida` | text | String | sim |  |  |
| `lote_id` | uuid | UUID | sim |  | → lotes.id |
| `producao_leite_l` | numeric | BigDecimal | sim |  |  |
| `valor_compra` | numeric | BigDecimal | sim |  |  |
| `valor_venda` | numeric | BigDecimal | sim |  |  |
| `peso_saida_kg` | numeric | BigDecimal | sim |  |  |
| `sisbov` | text | String | sim |  |  |
| `grau_sangue` | text | String | sim |  |  |
| `foto_uri` | text | String | sim |  | caminho de arquivo no celular: a foto não sobe (só vale no aparelho que tirou) |
| `data_desmame` | timestamptz | OffsetDateTime | sim |  |  |
| `parto_assistido` | boolean | Boolean | não | `false` |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### pesagens

Pesagens do animal (balança ou fita).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `pesagens_fazenda_idx` (fazenda_id), `pesagens_animal_id_idx` (animal_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `data` | timestamptz | OffsetDateTime | não |  |  |
| `peso_kg` | numeric | BigDecimal | não |  |  |
| `metodo` | text | enum (@Enumerated(STRING)) | não | `"balanca"` | `balanca`, `fita` |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### reproducoes

Coberturas e inseminações, diagnóstico, parto e aborto.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `reproducoes_fazenda_idx` (fazenda_id), `reproducoes_animal_id_idx` (animal_id), `reproducoes_touro_id_idx` (touro_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `tipo` | text | enum (@Enumerated(STRING)) | não |  | `cobertura`, `inseminacao` |
| `data` | timestamptz | OffsetDateTime | não |  |  |
| `prenhez_confirmada` | boolean | Boolean | sim |  |  |
| `previsao_parto` | timestamptz | OffsetDateTime | sim |  |  |
| `data_parto` | timestamptz | OffsetDateTime | sim |  |  |
| `cria_id` | uuid | UUID | sim |  | → animais.id |
| `touro_id` | uuid | UUID | sim |  | → animais.id |
| `touro_descricao` | text | String | sim |  |  |
| `data_diagnostico` | timestamptz | OffsetDateTime | sim |  |  |
| `metodo_diagnostico` | text | enum (@Enumerated(STRING)) | sim |  | `toque`, `ultrassom`, `outro` |
| `data_aborto` | timestamptz | OffsetDateTime | sim |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### tratamentos

Tratamentos com agenda de doses e carências.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `tratamentos_fazenda_idx` (fazenda_id), `tratamentos_animal_id_idx` (animal_id), `tratamentos_grupo_aplicacao_id_idx` (grupo_aplicacao_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `medicamento` | text | String | não |  |  |
| `dose` | text | String | sim |  |  |
| `data_inicio` | timestamptz | OffsetDateTime | não |  |  |
| `data_fim` | timestamptz | OffsetDateTime | sim |  |  |
| `dias_semana` | text | String (JSON) | não | `'[1,2,3,4,5,6,7]'` | JSON: dias com dose, `1` = domingo … `7` = sábado |
| `horario` | text | String | sim |  | texto `HH:mm` |
| `intervalo_horas` | integer | Integer | sim |  |  |
| `aviso_minutos_antes` | integer | Integer | não | `0` |  |
| `notificacao_ativa` | boolean | Boolean | não | `true` |  |
| `carencia_leite_dias` | integer | Integer | sim |  |  |
| `carencia_carne_dias` | integer | Integer | sim |  |  |
| `observacoes` | text | String | sim |  |  |
| `grupo_aplicacao_id` | uuid | UUID | sim |  |  |
| `comprovante_uri` | text | String | sim |  | caminho de arquivo no celular: a foto não sobe (só vale no aparelho que tirou) |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### doses_aplicadas

Um registro por dia de dose confirmada (`dia` = meia-noite local do dia).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: Um registro por (tratamento_id, dia), entre os não apagados.
- Índices no celular: `doses_aplicadas_fazenda_idx` (fazenda_id), `doses_aplicadas_tratamento_dia_idx` (tratamento_id, dia)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `tratamento_id` | uuid | UUID | não |  | → tratamentos.id |
| `dia` | timestamptz | OffsetDateTime | não |  | meia-noite local do dia da dose (em UTC); compare por faixa de 24 h |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### avaliacoes_corporais

Escore de condição corporal (1 a 5).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `avaliacoes_corporais_fazenda_idx` (fazenda_id), `avaliacoes_corporais_animal_id_idx` (animal_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `data` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `escore` | numeric | BigDecimal | não |  |  |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### controles_leiteiros

Litros da vaca num dia.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `controles_leiteiros_fazenda_idx` (fazenda_id), `controles_leiteiros_animal_id_idx` (animal_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `data` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `litros` | numeric | BigDecimal | não |  |  |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### secagens

Secagem da vaca.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `secagens_fazenda_idx` (fazenda_id), `secagens_animal_id_idx` (animal_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `data` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### mastites

Casos de mastite com os tetos afetados.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `mastites_fazenda_idx` (fazenda_id), `mastites_animal_id_idx` (animal_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `data` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `tetos` | text | String (JSON) | não | `[]` | JSON: lista de `AE`, `AD`, `PE`, `PD` |
| `tipo` | text | enum (@Enumerated(STRING)) | não |  | `clinica`, `subclinica` |
| `observacoes` | text | String | sim |  |  |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### cios

Cios observados.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `cios_fazenda_idx` (fazenda_id), `cios_animal_id_idx` (animal_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `data` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `observacoes` | text | String | sim |  |  |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### exames

Exames (brucelose, tuberculose…) com validade.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `exames_fazenda_idx` (fazenda_id), `exames_animal_id_idx` (animal_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `data` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `tipo` | text | enum (@Enumerated(STRING)) | não |  | `brucelose`, `tuberculose`, `outro` |
| `descricao` | text | String | sim |  |  |
| `resultado` | text | enum (@Enumerated(STRING)) | não |  | `negativo`, `positivo`, `inconclusivo` |
| `validade_dias` | integer | Integer | sim |  |  |
| `comprovante_uri` | text | String | sim |  | caminho de arquivo no celular: a foto não sobe (só vale no aparelho que tirou) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### anotacoes_animal

Anotações livres da ficha do animal.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `anotacoes_animal_fazenda_idx` (fazenda_id), `anotacoes_animal_animal_id_idx` (animal_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `data` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `texto` | text | String | não |  |  |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### ordenhas

Horários e registros de ordenha por turno.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `ordenhas_fazenda_idx` (fazenda_id), `ordenhas_data_registro_idx` (data_registro)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `periodo` | text | enum (@Enumerated(STRING)) | não |  | `manha`, `tarde`, `noite` |
| `horario_previsto` | text | String | sim |  | texto `HH:mm` |
| `horario_notificacao` | text | String | sim |  | texto `HH:mm` |
| `volume_litros` | numeric | BigDecimal | sim |  |  |
| `data_registro` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### maquinas

Máquinas e implementos. `codigo` é o ID curto (TR-01) impresso no QR.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: `codigo` único na fazenda (TODO(decisao): dois celulares offline podem gerar o mesmo).
- Índices no celular: `maquinas_fazenda_idx` (fazenda_id), `maquinas_codigo_idx` (codigo)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `codigo` | text | String | não |  |  |
| `nome` | text | String | não |  |  |
| `tipo` | text | enum (@Enumerated(STRING)) | não | `"outro"` | `trator`, `colheitadeira`, `pulverizador`, `plantadeira`, `implemento`, `caminhao`, `utilitario`, `ordenhadeira`, `outro` |
| `categoria` | text | enum (@Enumerated(STRING)) | não | `"motorizada"` | `motorizada`, `implemento` |
| `marca` | text | String | sim |  |  |
| `modelo` | text | String | sim |  |  |
| `ano_fabricacao` | integer | Integer | sim |  |  |
| `numero_serie` | text | String | sim |  |  |
| `placa` | text | String | sim |  |  |
| `potencia_cv` | numeric | BigDecimal | sim |  |  |
| `combustivel` | text | enum (@Enumerated(STRING)) | sim |  | `diesel`, `gasolina`, `etanol`, `flex`, `eletrico`, `nenhum` |
| `tanque_litros` | numeric | BigDecimal | sim |  |  |
| `largura_trabalho_m` | numeric | BigDecimal | sim |  |  |
| `possui_horimetro` | boolean | Boolean | não | `true` |  |
| `velocidade_max_kmh` | numeric | BigDecimal | sim |  |  |
| `horimetro_inicial` | numeric | BigDecimal | sim |  |  |
| `data_aquisicao` | timestamptz | OffsetDateTime | sim |  |  |
| `status` | text | enum (@Enumerated(STRING)) | não | `"ativa"` | `ativa`, `manutencao`, `inativa` |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### usos_maquina

Cada vez que uma máquina foi ligada (`fim` nulo = em uso), com o resumo do rastro gravado ao encerrar.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: No máximo um uso com `fim` nulo por `maquina_id`, e um por `operador_id`.
- Índices no celular: `usos_maquina_fazenda_idx` (fazenda_id), `usos_maquina_maquina_inicio_idx` (maquina_id, inicio), `usos_maquina_inicio_idx` (inicio), `usos_maquina_operador_fim_idx` (operador_id, fim), `usos_maquina_implemento_idx` (implemento_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `maquina_id` | uuid | UUID | não |  | → maquinas.id |
| `inicio` | timestamptz | OffsetDateTime | não |  |  |
| `fim` | timestamptz | OffsetDateTime | sim |  |  |
| `operador` | text | String | sim |  |  |
| `operador_id` | uuid | UUID | sim |  | → usuarios.id |
| `implemento_id` | uuid | UUID | sim |  | → maquinas.id |
| `atividade` | text | enum (@Enumerated(STRING)) | sim |  | `plantio`, `pulverizacao`, `gradagem`, `transporte`, `trato`, `parado`, `outro` |
| `origem` | text | enum (@Enumerated(STRING)) | não | `"app"` | `app`, `manual` |
| `fim_motivo` | text | enum (@Enumerated(STRING)) | sim |  | `manual`, `parada`, `pausa`, `velocidade`, `assumida`, `fora` |
| `rastreado` | boolean | Boolean | não | `false` |  |
| `inicio_lat` | numeric | BigDecimal | sim |  |  |
| `inicio_lng` | numeric | BigDecimal | sim |  |  |
| `fim_lat` | numeric | BigDecimal | sim |  |  |
| `fim_lng` | numeric | BigDecimal | sim |  |  |
| `km_total` | numeric | BigDecimal | sim |  |  |
| `km_trabalhando` | numeric | BigDecimal | sim |  |  |
| `seg_trabalhando` | integer | Integer | sim |  |  |
| `seg_deslocando` | integer | Integer | sim |  |  |
| `seg_parada` | integer | Integer | sim |  |  |
| `seg_pausa` | integer | Integer | sim |  |  |
| `seg_sem_sinal` | integer | Integer | sim |  |  |
| `area_estimada_ha` | numeric | BigDecimal | sim |  |  |
| `qualidade` | numeric | BigDecimal | sim |  |  |
| `localizacao_simulada` | boolean | Boolean | não | `false` |  |
| `rastro` | text | String (JSON) | sim |  | JSON: rastro simplificado `[[lng, lat], ...]` |
| `talhoes` | text | String (JSON) | sim |  | JSON: `[{ talhaoId, nome, km, segundos, areaHa }]` por área |
| `parada_avisada_em` | timestamptz | OffsetDateTime | sim |  |  |
| `continua_ate` | timestamptz | OffsetDateTime | sim |  |  |
| `regras_desde` | timestamptz | OffsetDateTime | sim |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### paradas_uso

Pausas e respostas "Continua" durante um uso.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `paradas_uso_fazenda_idx` (fazenda_id), `paradas_uso_uso_id_idx` (uso_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `uso_id` | uuid | UUID | não |  | → usos_maquina.id |
| `motivo` | text | enum (@Enumerated(STRING)) | não |  | `pausa`, `continua` |
| `inicio` | timestamptz | OffsetDateTime | não |  |  |
| `fim` | timestamptz | OffsetDateTime | sim |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### abastecimentos

Abastecimentos (consumo de tanque cheio a tanque cheio).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `abastecimentos_fazenda_idx` (fazenda_id), `abastecimentos_maquina_data_idx` (maquina_id, abastecido_em)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `maquina_id` | uuid | UUID | não |  | → maquinas.id |
| `uso_id` | uuid | UUID | sim |  | → usos_maquina.id |
| `operador` | text | String | sim |  |  |
| `operador_id` | uuid | UUID | sim |  | → usuarios.id |
| `litros` | numeric | BigDecimal | não |  |  |
| `tanque_cheio` | boolean | Boolean | não | `true` |  |
| `origem` | text | enum (@Enumerated(STRING)) | não | `"fazenda"` | `fazenda`, `posto` |
| `horimetro_h` | numeric | BigDecimal | sim |  |  |
| `lat` | numeric | BigDecimal | sim |  |  |
| `lng` | numeric | BigDecimal | sim |  |  |
| `foto_uri` | text | String | sim |  | caminho de arquivo no celular: a foto não sobe (só vale no aparelho que tirou) |
| `abastecido_em` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### leituras_horimetro

Leituras do horímetro, sempre digitadas.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `leituras_horimetro_fazenda_idx` (fazenda_id), `leituras_horimetro_maquina_data_idx` (maquina_id, lido_em)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `maquina_id` | uuid | UUID | não |  | → maquinas.id |
| `uso_id` | uuid | UUID | sim |  | → usos_maquina.id |
| `operador` | text | String | sim |  |  |
| `operador_id` | uuid | UUID | sim |  | → usuarios.id |
| `valor_h` | numeric | BigDecimal | não |  |  |
| `estimado_h` | numeric | BigDecimal | sim |  |  |
| `origem` | text | enum (@Enumerated(STRING)) | não | `"avulsa"` | `abastecimento`, `avulsa` |
| `foto_uri` | text | String | sim |  | caminho de arquivo no celular: a foto não sobe (só vale no aparelho que tirou) |
| `lido_em` | timestamptz | OffsetDateTime | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### ocorrencias_maquina

Problemas relatados na máquina (`resolvida_em` nulo = em aberto). Cada problema abre uma tarefa (`tarefa_id`): concluir a tarefa preenche `resolvida_em`, e resolver o problema conclui a tarefa.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `ocorrencias_maquina_fazenda_idx` (fazenda_id), `ocorrencias_maquina_maquina_idx` (maquina_id, resolvida_em), `ocorrencias_maquina_tarefa_idx` (tarefa_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `maquina_id` | uuid | UUID | não |  | → maquinas.id |
| `uso_id` | uuid | UUID | sim |  | → usos_maquina.id |
| `operador` | text | String | sim |  |  |
| `operador_id` | uuid | UUID | sim |  | → usuarios.id |
| `categoria` | text | enum (@Enumerated(STRING)) | não |  | `motor`, `hidraulico`, `pneu`, `eletrico`, `vazamento`, `outro` |
| `pode_usar` | boolean | Boolean | não |  |  |
| `descricao` | text | String | sim |  |  |
| `foto_uri` | text | String | sim |  | caminho de arquivo no celular: a foto não sobe (só vale no aparelho que tirou) |
| `lat` | numeric | BigDecimal | sim |  |  |
| `lng` | numeric | BigDecimal | sim |  |  |
| `registrado_em` | timestamptz | OffsetDateTime | não |  |  |
| `resolvida_em` | timestamptz | OffsetDateTime | sim |  |  |
| `tarefa_id` | uuid | UUID | sim |  | → tarefas.id (null nos problemas de antes do vínculo) |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### anotacoes_maquina

Anotações livres da máquina.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `anotacoes_maquina_fazenda_idx` (fazenda_id), `anotacoes_maquina_maquina_id_idx` (maquina_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `maquina_id` | uuid | UUID | não |  | → maquinas.id |
| `uso_id` | uuid | UUID | sim |  | → usos_maquina.id |
| `texto` | text | String | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### talhoes

Áreas do mapa (pasto, lavoura, reserva, outro) com geometria GeoJSON.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `talhoes_fazenda_idx` (fazenda_id), `talhoes_bbox_idx` (min_lat, max_lat, min_lng, max_lng)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `nome` | text | String | não |  |  |
| `tipo` | text | enum (@Enumerated(STRING)) | não | `"pasto"` | `pasto`, `lavoura`, `reserva`, `outro` |
| `cor` | text | String | não |  |  |
| `area_hectares` | numeric | BigDecimal | não |  |  |
| `perimetro_m` | numeric | BigDecimal | sim |  |  |
| `geometria_json` | text | String (JSON) | não |  | JSON: GeoJSON `{ "type": "Polygon", "coordinates": [[[lng, lat], ...]] }` |
| `centro_lat` | numeric | BigDecimal | não |  |  |
| `centro_lng` | numeric | BigDecimal | não |  |  |
| `min_lat` | numeric | BigDecimal | não |  |  |
| `max_lat` | numeric | BigDecimal | não |  |  |
| `min_lng` | numeric | BigDecimal | não |  |  |
| `max_lng` | numeric | BigDecimal | não |  |  |
| `cultura` | text | String | sim |  |  |
| `fase_lavoura` | text | enum (@Enumerated(STRING)) | sim |  | `preparo`, `vegetativo`, `colheita`, `pousio` |
| `data_plantio` | timestamptz | OffsetDateTime | sim |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### marcadores_mapa

Pontos de atenção no mapa (praga, daninha, erosão).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Índices no celular: `marcadores_mapa_fazenda_idx` (fazenda_id), `marcadores_mapa_lat_lng_idx` (lat, lng), `marcadores_mapa_talhao_idx` (talhao_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `talhao_id` | uuid | UUID | sim |  | → talhoes.id |
| `tipo` | text | enum (@Enumerated(STRING)) | não |  | `praga`, `daninha`, `erosao`, `outro` |
| `titulo` | text | String | não |  |  |
| `descricao` | text | String | sim |  |  |
| `lat` | numeric | BigDecimal | não |  |  |
| `lng` | numeric | BigDecimal | não |  |  |
| `resolvido` | boolean | Boolean | não | `false` |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### movimentacoes

Entradas e saídas de animais nos pastos (`saida_em` nulo = local atual).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: No máximo uma linha com `saida_em` nula por `animal_id`.
- Índices no celular: `movimentacoes_fazenda_idx` (fazenda_id), `movimentacoes_animal_entrada_idx` (animal_id, entrada_em), `movimentacoes_area_idx` (area_id, saida_em, entrada_em), `movimentacoes_lote_entrada_idx` (lote_id, entrada_em)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `animal_id` | uuid | UUID | não |  | → animais.id |
| `area_id` | uuid | UUID | não |  | → talhoes.id |
| `lote_id` | uuid | UUID | sim |  | → lotes.id |
| `entrada_em` | timestamptz | OffsetDateTime | não |  |  |
| `saida_em` | timestamptz | OffsetDateTime | sim |  |  |
| `registrado_por` | text | String | sim |  |  |
| `registrado_por_id` | uuid | UUID | sim |  | → usuarios.id |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### calculos_cerca

Conta de cerca salva para uma área (uma por área).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: Uma linha não apagada por `area_id`.
- Índices no celular: `calculos_cerca_fazenda_idx` (fazenda_id), `calculos_cerca_area_idx` (area_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `area_id` | uuid | UUID | não |  | → talhoes.id |
| `tipo_cerca` | text | enum (@Enumerated(STRING)) | não |  | `arame4`, `arame5`, `eletrica1`, `eletrica2` |
| `fios` | integer | Integer | não |  |  |
| `espacamento_m` | numeric | BigDecimal | não |  |  |
| `perimetro_m` | numeric | BigDecimal | não |  |  |
| `cantos` | integer | Integer | não |  |  |
| `metros_arame` | numeric | BigDecimal | não |  |  |
| `rolos` | integer | Integer | não |  |  |
| `mouroes` | integer | Integer | não |  |  |
| `esticadores` | integer | Integer | não |  |  |
| `preco_rolo` | numeric | BigDecimal | sim |  |  |
| `preco_mourao` | numeric | BigDecimal | sim |  |  |
| `preco_esticador` | numeric | BigDecimal | sim |  |  |
| `custo` | numeric | BigDecimal | sim |  |  |
| `desatualizado` | boolean | Boolean | não | `false` |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### modelos_cultura

Modelos de cultura criados na fazenda (os prontos ficam no código).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: `nome` único na fazenda, sem diferenciar maiúsculas.
- Índices no celular: `modelos_cultura_fazenda_idx` (fazenda_id)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `nome` | text | String | não |  |  |
| `taxa_kg_ha` | numeric | BigDecimal | sim |  |  |
| `saco_kg` | numeric | BigDecimal | não | `20` |  |
| `etapas` | text | String (JSON) | não |  | JSON: `[{ nome, tipo: preparo/plantio/trato/colheita, dias }]` (dias em relação ao plantio) |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### ciclos_plantio

Ciclos de plantio de uma lavoura (no máximo um `ativo` por área).

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: No máximo um `status = ativo` por `area_id`.
- Índices no celular: `ciclos_plantio_fazenda_idx` (fazenda_id), `ciclos_plantio_area_status_idx` (area_id, status), `ciclos_plantio_area_plantio_idx` (area_id, data_plantio)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `area_id` | uuid | UUID | não |  | → talhoes.id |
| `cultura` | text | String | não |  |  |
| `modelo_id` | text | String | sim |  | chave de um modelo pronto do app ou id de `modelos_cultura`: texto, não uuid |
| `data_plantio` | timestamptz | OffsetDateTime | não |  |  |
| `area_ha` | numeric | BigDecimal | não |  |  |
| `taxa_kg_ha` | numeric | BigDecimal | não |  |  |
| `saco_kg` | numeric | BigDecimal | não |  |  |
| `sementes_kg` | numeric | BigDecimal | não |  |  |
| `sacos` | integer | Integer | não |  |  |
| `calculo_desatualizado` | boolean | Boolean | não | `false` |  |
| `status` | text | enum (@Enumerated(STRING)) | não | `"ativo"` | `ativo`, `encerrado`, `cancelado` |
| `encerrado_em` | timestamptz | OffsetDateTime | sim |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### etapas_ciclo

Etapas da linha do tempo do ciclo; com responsável, viram tarefa.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: (ciclo_id, ordem) único.
- Índices no celular: `etapas_ciclo_fazenda_idx` (fazenda_id), `etapas_ciclo_ciclo_ordem_idx` (ciclo_id, ordem), `etapas_ciclo_responsavel_idx` (responsavel_id, prevista_em)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `ciclo_id` | uuid | UUID | não |  | → ciclos_plantio.id |
| `ordem` | integer | Integer | não |  |  |
| `nome` | text | String | não |  |  |
| `tipo` | text | enum (@Enumerated(STRING)) | não |  | `preparo`, `plantio`, `trato`, `colheita` |
| `prevista_em` | timestamptz | OffsetDateTime | não |  |  |
| `realizada_em` | timestamptz | OffsetDateTime | sim |  |  |
| `observacao` | text | String | sim |  |  |
| `responsavel_id` | uuid | UUID | sim |  | → usuarios.id |
| `responsavel_nome` | text | String | sim |  |  |
| `atribuida_em` | timestamptz | OffsetDateTime | sim |  |  |
| `atribuida_por` | uuid | UUID | sim |  | → usuarios.id |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |

### usos_area

Tempo e KM de cada uso de máquina em cada área.

- Tipo: **domínio** — `BaseFazendaEntity`, Sync Stream por `fazenda_id`
- Unicidade conferida pelo app: (uso_id, area_id) único entre os não apagados.
- Índices no celular: `usos_area_fazenda_idx` (fazenda_id), `usos_area_uso_area_idx` (uso_id, area_id), `usos_area_area_inicio_idx` (area_id, inicio)

| Coluna | Postgres | Java | Nulo? | Padrão no app | Valores / referência |
|---|---|---|---|---|---|
| `id` | uuid | UUID | não |  |  |
| `uso_id` | uuid | UUID | não |  | → usos_maquina.id |
| `area_id` | uuid | UUID | não |  | → talhoes.id |
| `inicio` | timestamptz | OffsetDateTime | não |  |  |
| `segundos` | integer | Integer | não |  |  |
| `km` | numeric | BigDecimal | não |  |  |
| `fazenda_id` | uuid | UUID | não |  | → fazendas.id |
| `created_by` | uuid | UUID | sim |  | → usuarios.id |
| `created_at` | timestamptz | OffsetDateTime | sim |  |  |
| `updated_at` | timestamptz | OffsetDateTime | sim |  |  |
| `deleted_at` | timestamptz | OffsetDateTime | sim |  | preenchido = apagado (soft delete) |
| `server_updated_at` | timestamptz | OffsetDateTime | sim |  | só no servidor: a API preenche em toda escrita; o app não tem esta coluna |
