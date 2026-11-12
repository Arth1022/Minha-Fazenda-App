# Minha Fazenda — App Mobile (Local-First)

Aplicativo mobile de gestão rural desenvolvido com **React Native (Expo SDK 58 + Expo Router)**, **TypeScript** e **Drizzle ORM sobre expo-sqlite**, projetado para operar **100% offline no campo**. Plataformas: Android e iOS.

---

## 1. Estrutura de Pastas

O projeto adota uma organização por domínio (`features/`), mantendo rotas finas em `src/app/`:

```text
src/
├─ app/                    # Rotas do Expo Router (1 linha cada)
│  ├─ _layout.tsx          # RootLayout: providers + rotas protegidas por estado da conta
│  ├─ (conta)/             # boas-vindas, cadastro, entrar, sem-conta
│  ├─ convite/[token].tsx  # Link do convite (minhafazenda://convite/<token>)
│  ├─ fazendas, perfil, membros
│  └─ (tabs)/ ...          # O app em si (só com uma fazenda aberta)
├─ entities/               # Tabelas do Drizzle (fonte da verdade do schema local), colunasBase,
│                          # helpers de escrita (novoRegistro/atualizar/apagar), filtro daFazenda, SCHEMA_VERSION
├─ features/               # 1 pasta por domínio: conta, perfil, fazenda, convite, sync, home, rebanho, mapa, maquinas...
├─ shared/                 # Cliente da API, componente Avatar, deviceId
├─ database/               # Fachada do banco para as telas: db, tabelas e consultas ao vivo
├─ services/               # Serviços compartilhados (usuário atual, notificações, fotos, QR...)
├─ components/  providers/ constants/  utils/
__tests__/                 # Testes em Node com o PowerSync de verdade (support/ = @powersync/node)
```

---

## 2. Regras de Arquitetura

1. **Rotas finas:** `src/app/` contém apenas arquivos de roteamento de uma linha, ex.:
   ```ts
   export { default } from '@/features/mapa/MapaScreen';
   ```
2. **Fluxo de dependência unidirecional:** `app → features → database/entities`. Código compartilhado entre domínios sobe para `shared/`, `components/`, `services/` ou `utils/`.
3. **Banco só por `@/database`:** telas e features importam `db`, tabelas, helpers e as consultas ao vivo de `@/database`.
4. **Sem pastas fantasma:** Toda pasta criada no repositório deve conter implementação real e ativa.

---

## 3. Banco Local e Sync (PowerSync + Drizzle)

O app é offline-first: a tela lê e grava sempre no SQLite local; o PowerSync sobe as escritas para a API (`POST /sync/upload`) e desce os dados das fazendas do usuário. A tela nunca espera a rede. Arquitetura completa: doc "Minha Fazenda — Arquitetura de Sync, Conta e Fazenda".

- **Schema:** `src/entities/` é a fonte da verdade. O schema do PowerSync sai dele (`DrizzleAppSchema`, em `features/sync/schema.ts`), **sem migration**: as tabelas são views criadas ao abrir o banco. Não há `drizzle-kit` nem `useMigrations`.
- **Mudou coluna?** Antes, uma linha no `SCHEMA_CHANGES.md` (status `proposto`) e some 1 em `SCHEMA_VERSION` (`src/entities/versao.ts`). Em produção a coluna só entra no app depois de existir na API.
- **Colunas base:** toda tabela de domínio tem `fazenda_id`, `created_by`, `created_at`, `updated_at` e `deleted_at` (`colunasBase`). Só os helpers de `entities/escrita.ts` preenchem esses campos: `novoRegistro(dados)` no insert, `atualizar(dados)` no update e `apagar(...)` (soft delete).
- **Consultas:** toda consulta de domínio filtra com `daFazenda(tabela)` (fazenda ativa e `deleted_at IS NULL`).
- **Sem FK, UNIQUE nem ON DELETE** (o PowerSync guarda as tabelas como views): unicidade e "apagar junto" são feitos na transação que grava.
- **Datas:** texto ISO 8601 em UTC (`timestamptz` no Postgres), lidas como `Date` (`dataHora` em `entities/base.ts`).
- **Só leitura no celular:** `fazendas`, `fazenda_membros` e `usuarios` (mudam pelos endpoints REST). **Local-only:** `perfil_local`, `notificacoes_agendadas`, `pontos_gps`.
- **Telas reativas:** `useLiveQuery` (consulta do Drizzle) e `useConsultaAoVivo` reexecutam quando muda qualquer tabela da consulta, inclusive pelo sync.
- **Conta:** tokens só no `expo-secure-store`. Estados `carregando`, `deslogado`, `sem-conta`, `logado` (sobrevivem ao reiniciar). Sem conta, o `connect()` nunca é chamado.
- **QR Code impresso** vale em todos os celulares da fazenda: o `id` é UUID gerado no aparelho e o sync nunca o troca.

Configuração: copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL`.

---

## 4. Execução e Build Nativo (Development Client)

O PowerSync (`@powersync/react-native` + `@op-engineering/op-sqlite`), o `expo-secure-store` e o `expo-crypto` são módulos nativos: o app roda em development build (não no Expo Go). Após instalar ou atualizar dependências nativas, gere uma nova build de desenvolvimento.

### Executar no Android (Recomendado):
```bash
# 1. Instalar dependências
npm install

# 2. Gerar build nativa de desenvolvimento e executar no dispositivo/emulador Android
npx expo run:android
```

### Executar no iOS:
```bash
npx expo run:ios
```

### Testes e Verificação:
```bash
# Validação de tipos e ESLint
npm run lint

# Todos os testes, em Node com o PowerSync de verdade (@powersync/node)
npm test

# Drizzle × Postgres (CI): compara com contracts/schema-colunas.json, gerado pelo CI do back
npm run test:schema
```
