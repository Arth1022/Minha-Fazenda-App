# Minha Fazenda — App Mobile (Local-First)

Aplicativo mobile de gestão rural desenvolvido com **React Native (Expo SDK 58 + Expo Router)**, **TypeScript** e **Drizzle ORM sobre expo-sqlite**, projetado para operar **100% offline no campo**. Plataformas: Android e iOS.

---

## 1. Estrutura de Pastas

O projeto adota uma organização por domínio (`features/`), mantendo rotas finas em `src/app/` e todo o acesso ao banco centralizado em `src/database/`:

```text
src/
├─ app/                    # Rotas do Expo Router (1 linha cada)
│  ├─ _layout.tsx          # RootLayout (AppProviders + Stack)
│  ├─ (tabs)/              # _layout.tsx (tab bar), index, mapa, rebanho, estoque, maquinas
│  └─ animal/[id].tsx      # Rota fora das abas (Ficha do animal / QR Code)
├─ features/               # 1 pasta por domínio
│  ├─ home/                # HomeScreen.tsx, OrdenhaCard.tsx, useHomeOrdenha.ts, ordenhas.ts
│  ├─ rebanho/             # screens/, components/, hooks/
│  │                       # data/: animais, pesagens, reproducoes, tratamentos (consultas e gravações)
│  │                       # services/: fase.ts e indicadores.ts (regras puras: fase, peso, carência, parto)
│  ├─ mapa/                # MapaScreen.tsx      (somente front, sem persistência)
│  ├─ estoque/             # EstoqueScreen.tsx   (somente front, sem persistência)
│  └─ maquinas/            # MaquinasScreen.tsx  (somente front, sem persistência)
├─ database/               # schema.ts (fonte única), client.ts, index.ts, id.ts, seed.ts, migrations/
├─ components/             # UI genérica reutilizável: ui/ (Header, Card, EmptyState...) e forms/
├─ providers/              # AppProviders.tsx (migrations na abertura), FazendaProvider.tsx (leite/corte/misto)
└─ constants/  utils/      # Tema (theme.ts), formatadores, datas e validadores
__tests__/                 # regras.test.ts (regras puras) e persistence.test.ts (support/ = banco sql.js)
```

Somente **Home** (ordenha) e **Rebanho** têm persistência local. Mapa, Estoque e Máquinas existem apenas como telas (layout e estados vazios).

---

## 2. Regras de Arquitetura

1. **Rotas finas:** `src/app/` contém apenas arquivos de roteamento de uma linha, ex.:
   ```ts
   export { default } from '@/features/mapa/MapaScreen';
   ```
2. **Fluxo de dependência unidirecional:** `app → features → database`. Uma feature não importa arquivos internos de outra feature; código compartilhado entre domínios deve subir para `components/` ou `utils/`.
3. **Banco só por `@/database`:** telas e features importam `db`, tabelas, tipos e `useLiveQuery` de `@/database`. Trocar o driver fica restrito a essa pasta.
4. **Sem pastas fantasma:** Toda pasta criada no repositório deve conter implementação real e ativa.

---

## 3. Banco Local (Drizzle + expo-sqlite)

- **Schema:** `src/database/schema.ts` é a fonte única das tabelas, relações e tipos (`typeof tabela.$inferSelect` / `$inferInsert`).
- **Migrations:** geradas pelo `drizzle-kit` em `src/database/migrations/` e aplicadas na abertura do app (`useDatabaseMigrations` no `AppProviders`). Depois de alterar o schema:
  ```bash
  npx drizzle-kit generate
  ```
- **Telas reativas:** `useLiveQuery` reexecuta a consulta quando a tabela principal dela muda.
- **Regras calculadas, não digitadas:** fase (sexo + idade + parto), crias (`mae_id`), peso atual e ganho (pesagens), carência e previsão de parto ficam em `features/rebanho/services/`, como funções puras.
- **Seed de desenvolvimento:** opcional. Com `EXPO_PUBLIC_DEV_SEED=1` no `.env`, um banco vazio recebe um rebanho de exemplo ao abrir o app em modo dev.
- **Convenções (prontas para um sync futuro):** `id` em UUID texto gerado no app, `created_at` / `updated_at` em todas as tabelas (`updated_at` renovado em todo update), datas em epoch ms e arrays em JSON. As chaves estrangeiras (`ON DELETE CASCADE`) são ligadas logo após as migrations.

---

## 4. Execução e Build Nativo (Development Client)

O `expo-sqlite` e o `expo-crypto` são módulos nativos: após instalar ou atualizar dependências nativas, gere uma nova build de desenvolvimento.

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

# Regras do rebanho + persistência (schema, migrations, transações, cascata) com SQLite em Node
npm test
```
