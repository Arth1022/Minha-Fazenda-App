# Minha Fazenda — App Mobile (Local-First)

Aplicativo mobile de gestão rural desenvolvido com **React Native (Expo Router)**, **TypeScript** e **WatermelonDB (SQLite)**, projetado para operar **100% offline no campo**.

---

## 1. Estrutura de Pastas

O projeto adota uma organização por domínio (`features/`), mantendo rotas finas em `src/app/` e entidades do WatermelonDB centralizadas em `src/entities/`:

```text
src/
├─ app/                    # Rotas do Expo Router (1 linha cada)
│  ├─ _layout.tsx          # RootLayout (AppProviders + Stack)
│  ├─ (tabs)/              # _layout.tsx, index, mapa, rebanho, estoque, maquinas
│  └─ animal/[id].tsx      # Rota fora das abas (Ficha do animal / QR Code)
├─ features/               # 1 pasta por domínio, arquivos direto nela
│  ├─ home/                # HomeScreen.tsx
│  ├─ mapa/                # MapaScreen.tsx, TalhaoRepository.ts, calculos.ts
│  ├─ rebanho/             # RebanhoScreen.tsx, AnimalDetalheScreen.tsx,
│  │                       # AnimalRepository.ts, TratamentoRepository.ts, OrdenhaRepository.ts
│  ├─ estoque/             # EstoqueScreen.tsx, EstoqueRepository.ts
│  └─ maquinas/            # MaquinasScreen.tsx, MaquinaRepository.ts
├─ entities/               # Animal.ts, Talhao.ts, Tratamento.ts, EstoqueItem.ts, Maquina.ts, Ordenha.ts
├─ database/               # database.ts, schema.ts, migrations.ts, BaseRepository.ts, seeds/
├─ components/             # UI genérica reutilizável: Header.tsx, AppTabs.tsx, ThemedText.tsx, ThemedView.tsx
├─ providers/              # AppProviders.tsx (DatabaseProvider oficial do WatermelonDB + ThemeProvider)
└─ constants/  utils/      # Tema (theme.ts) e formatadores gerais (formatters.ts)
__tests__/                 # Testes automatizados de persistência e regras
```

---

## 2. Regras de Arquitetura

1. **Rotas finas:** `src/app/` contém apenas arquivos de roteamento de uma linha, ex.:
   ```ts
   export { default } from '@/features/mapa/MapaScreen';
   ```
2. **Fluxo de dependência unidirecional:** `app → features → entities / database`. Uma feature não importa arquivos internos de outra feature; código compartilhado entre domínios deve subir para `components/` ou `utils/`.
3. **Sem pastas fantasma:** Toda pasta criada no repositório deve conter implementação real e ativa.

---

## 3. Execução e Build Nativo (Development Client)

O **WatermelonDB** utiliza código nativo C++ e bindings JSI de alto desempenho para o SQLite, garantindo persistência local confiável e operação offline total no campo.

> [!IMPORTANT]
> **O app NÃO roda no Expo Go padrão** devido aos módulos nativos do WatermelonDB.
> A configuração nativa é injetada automaticamente via Config Plugin (`@morrowdigital/watermelondb-expo-plugin`) configurado no [`app.json`](file:///c:/Users/ti/Documents/GitHub/Minha-Fazenda-App/app.json) durante o prebuild do Expo.
> 
> Falhas de inicialização do SQLite no aparelho não realizam fallback silencioso para banco volátil em memória; elas disparam um erro visível imediato para proteger a integridade dos dados rurais.

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

### Executar na Web (Simulação com LokiJS/IndexedDB):
```bash
npx expo start --web
```

### Testes e Verificação:
```bash
# Validação de tipos e ESLint
npm run lint

# Teste automatizado de persistência e timestamps do WatermelonDB
npm run test:db
```
