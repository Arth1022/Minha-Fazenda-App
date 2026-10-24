# Code Review · Front-end

Registro do trabalho de front, organizado por sprint, para revisão do usuário.
Cada parte traz o código, o que foi feito e por que as escolhas foram tomadas.

---

## Sprint 1 · Ícone e selo de leite

**Commit:** `823a65d` "Ícone e selo de leite"

**Pedido:** a tela de rebanho mostrava a produção de leite com o emoji 💧 em azul (`waterBlue`). Isso parecia água, não leite. O pedido foi trocar por um ícone de leite, com uma cor que lembre leite.

**Contexto:** durante a sprint, o usuário decidiu remover o leite por animal do modelo (migration `0002` remove `producao_leite_l`). O full-stack reescreveu `AnimalCard.tsx` e `RebanhoScreen.tsx` sem nenhuma métrica de leite. Por isso a entrega ficou como **peças reutilizáveis** (token de cor, ícone e componente), e nenhuma tela usa elas por enquanto.

### 1. Tokens de cor no `theme.ts`

`src/constants/theme.ts`

```ts
  // Semânticas e Indicadores
  waterBlue: '#0EA5E9',        // Informativo (badge info)
  waterBlueBg: '#E0F2FE',      // Fundo suave azul
  milk: '#A16207',             // Produção de leite (ícone e valor em litros)
  milkBg: '#FEF6E4',           // Fundo creme do leite
```

**O que foi feito**
- Criei dois tokens novos: `milk` (cor do ícone e do texto) e `milkBg` (fundo do selo).
- Mudei o comentário do `waterBlue`. Antes ele dizia "Produção de leite"; agora diz "Informativo (badge info)", que é o único uso que sobrou (`Badge` variante `info`).

**Por quê**
- **Por que não azul:** azul junto com uma gota é o código visual de água. Num app de fazenda, onde água (bebedouro, irrigação) também é assunto, isso confunde.
- **Por que creme + caramelo:** leite é branco, e branco não aparece sobre card branco. O jeito é usar um **fundo creme** (`#FEF6E4`), que lembra a cor do leite integral, com um **texto/ícone caramelo escuro** (`#A16207`) que dá contraste. É a mesma família de tons quentes de "laticínio" (leite, nata, doce de leite).
- **Contraste:** `#A16207` sobre `#FEF6E4` dá cerca de 4,6:1, o que passa no WCAG AA para texto pequeno. Um amarelo mais claro (como o `wheatGold`, já usado para lavoura) não passaria e ainda se confundiria com lavoura.
- **Por que tokens novos e não reaproveitar `warning`:** o `warning` (`#D97706`) tem cor parecida, mas significa alerta. Usar o mesmo token faria o leite parecer um aviso, e qualquer ajuste de cor do alerta mudaria o leite junto. Cada significado ganha o seu token.

### 2. Ícone `'milk'` no `AppIcon`

`src/components/ui/AppIcon.tsx`

```tsx
export type AppIconName =
  | 'sun'
  | 'sunset'
  | 'moon'
  | 'bell'
  | 'edit'
  | 'plus'
  | 'x'
  | 'milk';

// ...

    case 'milk':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M8 2h8" />
          <Path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2" />
          <Path d="M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0" />
        </Svg>
      );
```

**O que foi feito**
- Adicionei o nome `'milk'` ao tipo `AppIconName` e um `case` novo que desenha uma **garrafa de leite** (tampa, gargalo e o nível do leite como uma linha ondulada).
- Quebrei o tipo em várias linhas porque, com 8 nomes, ele passava da largura de leitura.

**Por quê**
- **Garrafa, e não gota ou balde:** a garrafa é o símbolo de leite mais reconhecível e não se confunde com água (gota) nem com ordenha (balde ou teta).
- **Mesmo padrão dos outros ícones:** traço no estilo Lucide/Feather, `viewBox 24`, `strokeWidth 2`, pontas arredondadas e cor por prop. Assim ele combina visualmente com sol, lua, sino etc.
- **SVG em vez de emoji:** emoji muda de desenho entre Android, iOS e web, e não aceita cor. Em vez de puxar uma biblioteca de ícones, usei o `AppIcon` que o projeto já tem, que não depende de fonte (o próprio arquivo explica que fontes de ícone falhavam no Metro).

### 3. Componente `MilkAmount`

`src/components/ui/MilkAmount.tsx` (novo)

```tsx
export interface MilkAmountProps {
  liters: number;
}

/**
 * Selo creme com ícone de garrafa de leite e o volume em litros.
 */
export function MilkAmount({ liters }: MilkAmountProps) {
  return (
    <View style={styles.pill}>
      <AppIcon name="milk" size={12} color={AgroColors.milk} />
      <Text style={styles.text}>{liters.toFixed(1)} L</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.milkBg,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.milk,
  },
});
```

**O que foi feito**
- Um selo em formato de pílula (`Radius.full`) com fundo creme, o ícone de garrafa e o volume formatado com uma casa decimal ("22.1 L").
- Uma única prop, `liters: number`. Sem validação extra: o `?? 0` fica com quem chama, que sabe se o dado pode faltar.

**Por quê**
- **Componente separado:** o leite aparecia em dois lugares (card da lista e resumo do animal), cada um com o próprio emoji, estilo e `toFixed`. Juntar num componente deixa ícone, cor e formato iguais em todo o app, e uma mudança (como a vírgula do ponto 1 abaixo) vale para todos de uma vez.
- **Pílula com fundo:** o fundo creme é o que faz a cor "falar leite" sobre o card branco (ver tokens). Sem ele, só o caramelo poderia parecer texto de alerta.
- **Tamanhos:** texto 12 com peso 700 e ícone 12, iguais ao texto de métrica que existia no card (`fontSize 12`, `fontWeight '700'`). Ícone e texto com a mesma altura ficam alinhados na linha. Espaçamentos usam os tokens `Spacing.one / xs / half`.
- **Fica em `components/ui`, e não em `features/rebanho`:** leite não é exclusivo do rebanho. Ordenha e o futuro resumo também mostram litros.

### 4. Export no `index.ts`

`src/components/ui/index.ts`

```ts
export { Header, type HeaderProps } from './Header';
export { MilkAmount, type MilkAmountProps } from './MilkAmount';
```

**O que foi feito:** exportei o componente e o tipo das props pelo barrel, em ordem alfabética, como os outros.

**Por quê:** as telas importam de `@/components/ui` (ex.: `RebanhoScreen`). Pelo barrel, o `MilkAmount` fica disponível do mesmo jeito que `Card`, `Badge` etc.

### Pontos do review (Líder Técnico)

#### 1. `toFixed(1)` mostra "22.1 L" com ponto; em pt-BR seria "22,1 L"

**Concordo, é um erro de localização.** O app é todo em português, e o produtor lê "22.1" como estranho (ou até como 221). Duas opções:

- `liters.toFixed(1).replace('.', ',')`: simples e não depende de nada.
- `liters.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })`: o certo para pt-BR, e também coloca separador de milhar ("1.285,0 L"). Depende do suporte a `Intl` no Hermes, que existe no RN atual, mas precisa ser testado no aparelho.

**Recomendação:** criar um helper `formatLiters` (ou um `formatDecimal` genérico em `src/utils`), já que litros, kg e valores em R$ vão precisar do mesmo formato. Dentro dele, usar `toLocaleString('pt-BR')` se funcionar no device, ou o `replace` se não funcionar. Não corrigi, aguardando a decisão do usuário.

#### 2. `fontSize` 12 e tamanho do ícone 12 fixos no código, fora dos tokens

**Procede em parte.**
- **Texto:** o tema já tem um token que serve: `Typography.captionBold` (12 / 700 / lineHeight 16). O certo é `text: { ...Typography.captionBold, color: AgroColors.milk }`. Isso remove o número solto e ainda corrige o `lineHeight`, que hoje não está definido. Copiei os valores do card antigo, que também tinha números fixos, em vez de usar o token. Foi falha minha.
- **Ícone:** o tema **não tem** escala de tamanho de ícone. O próprio `AppIcon` usa `size = 20` fixo como padrão, e o resto do projeto também passa números direto. Criar um token só para este caso seria inconsistente. Se o usuário quiser, o certo é uma escala `IconSize = { sm: 12, md: 16, lg: 20 }` no `theme.ts`, aplicada em todos os ícones de uma vez numa task separada.

**Recomendação:** trocar o texto para `Typography.captionBold` agora (é uma linha) e deixar a escala de ícones como sugestão para outra task.

#### 3. Nenhuma tela usa o `MilkAmount` (leite por vaca foi cancelado)

**Correto: hoje ele não tem uso.** Leite **por vaca** saiu do escopo, mas leite **do rebanho/da fazenda** continua existindo, porque a ordenha registra `volume_litros` (`src/database/schema.ts`). Onde ele ainda faz sentido:

- **Resumo do rebanho (Fase 3):** "litros de leite no mês", somado das ordenhas. O full-stack já disse que pretende usar o `MilkAmount` aí.
- **Telas de ordenha:** quando a ordenha mostrar o volume de cada sessão ou o total do dia.
- **Home/dashboard:** se houver um card de produção diária da fazenda.

**Recomendação:** manter o componente. É pequeno (cerca de 40 linhas), não tem dependências e já tem destino certo na Fase 3. Se o usuário preferir não ter código sem uso, as quatro partes saem juntas de forma limpa (tokens, `case 'milk'`, arquivo e export) e voltam quando a Fase 3 começar.

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/constants/theme.ts` | + tokens `milk` e `milkBg`; comentário do `waterBlue` atualizado |
| `src/components/ui/AppIcon.tsx` | + nome `'milk'` no tipo e o `case` com o SVG da garrafa |
| `src/components/ui/MilkAmount.tsx` | **novo**: selo de litros |
| `src/components/ui/index.ts` | + export de `MilkAmount` e `MilkAmountProps` |

`AnimalCard.tsx` e `RebanhoScreen.tsx`: **nenhuma mudança minha ficou neles**. Os imports que coloquei durante a sprint foram removidos depois que o full-stack reescreveu os dois arquivos.

### Resultado do `tsc`

```
$ npx tsc --noEmit
(sem saída)
exit code: 0
```

O projeto inteiro passa no type-check, sem erros.

---

## Sprint 1 · Correção: tela do Rebanho volta à identidade

**Commit:** `5b85a29` "Rebanho: volta à identidade visual anterior"

**Pedido (usuário, via Líder Técnico):** a tela do Rebanho tinha perdido a identidade com a reescrita do commit `5688a37`. O pedido foi voltar ao visual do `df309c5`, mantendo a camada de dados nova (`useRebanho`, `calcularFase`, pesagens, crias). Não usei checkout do arquivo antigo: copiei o layout e liguei nos dados atuais.

### Antes × depois

| Parte | Em `5688a37` (antes da correção) | Agora |
|---|---|---|
| Card do animal | Título `nome · brinco` + `Badge` genérico de fase + alerta em badge | Avatar 🐮, título (`nome` ou `Brinco xxx`), raça, linha de métricas **⚖ peso** + **selo de leite**, alerta em uma linha pequena só quando existe |
| Leite | Não existia | `MilkAmount` (garrafa + creme da Sprint 1) no lugar da 💧 azul do `df309c5` |
| Toque no card | Abria a ficha direto | 1º toque seleciona, 2º toque no selecionado abre a ficha (como no `df309c5`) |
| Lista | Todos os cards, sem limite | Altura de 3 cards, com rolagem interna |
| Card de resumo | Removido | Volta: Peso, Produção de Leite, Crias, Ração Concentrado |
| Filtro | Removido | Funil nas abas: só "alta produção" (≥ 20 L) |
| Abas | Vacas / Novilhas / Bezerros / Machos (sempre) | Vacas / Novilhas / Bezerros; **Machos só aparece se houver garrote ou touro** |
| Valor sem dado | — | "—" (nunca "0.0 L" inventado) |
| Números | `toFixed` com ponto, `fontSize` solto | Vírgula decimal (`22,1 L`), fontes por `Typography` |

### 1. Formatação: `src/utils/formatters.ts`

```ts
/** Exibido no lugar de um valor que ainda não foi informado. */
export const SEM_VALOR = '—';

/** Número com vírgula decimal (ex.: 22.1 → "22,1"). */
export function formatDecimal(valor: number, casas = 1): string {
  return valor.toFixed(casas).replace('.', ',');
}

/** Valor com unidade ("22,1 L"), ou "—" quando não há valor. */
export function formatMedida(valor: number | null, unidade: string, casas = 1): string {
  return valor === null ? SEM_VALOR : `${formatDecimal(valor, casas)} ${unidade}`;
}
```

**Por quê:** atende o ponto 1 do review (vírgula pt-BR). Um lugar só resolve litros, kg e kg/dia, e também o "—" para valor ausente. Escolhi `replace('.', ',')` em vez de `toLocaleString('pt-BR')` porque é determinístico e não depende do suporte a `Intl` no Hermes. Os valores do rebanho não chegam a milhar, então o separador de milhar não faz falta aqui.

### 2. `MilkAmount` aceita `null` e usa `Typography`

```tsx
export interface MilkAmountProps {
  /** Litros de leite; null mostra "—" */
  liters: number | null;
}
// ...
<Text style={styles.text}>{formatMedida(liters, 'L')}</Text>
// ...
text: {
  ...Typography.captionBold,
  color: AgroColors.milk,
},
```

**Por quê:** atende os pontos 1 e 2 do review. `producao_leite_l` é opcional, e a regra é não inventar "0,0 L". `captionBold` (12/700) é exatamente o tamanho que estava fixo, agora vindo do tema e com `lineHeight`. O tamanho do ícone (12) continua fixo porque o tema não tem uma escala de ícones (ver ponto 2 da Sprint 1).

### 3. `AnimalCard`: layout do `df309c5` com dados novos

```tsx
const displayTitle = animal.nome || `Brinco ${animal.brinco}`;
// ...
<View style={styles.metricsInline}>
  <View style={styles.metricBadge}>
    <Text style={styles.scaleIcon}>⚖</Text>
    <Text style={styles.weightText}>{formatMedida(animal.pesoKg, 'kg', 0)}</Text>
  </View>
  <MilkAmount liters={animal.producaoLeiteL} />
</View>

{animal.alerta ? (
  <Text style={styles.alertText}>⚠ {animal.alerta}</Text>
) : null}
```

**O que foi feito:** voltaram o avatar, o título, a raça e a linha de métricas. Saiu o `Badge` de fase, porque a aba já diz a fase. Fontes por `Typography` (`bodyBold`, `caption`, `captionBold`, `micro`) e espaçamentos por `Spacing`.

**Por quê**
- **O card recebe só `animal: AnimalComFase`:** peso, alerta e leite já vêm calculados pelo `useRebanho`, então o card é só apresentação, sem consultas próprias.
- **Peso vem da pesagem mais recente** (`pesosAtuais()` no `useRebanho`), porque `peso_kg` saiu do animal. Ele é mostrado sem casas decimais no card (`450 kg`); o detalhe fica na ficha.
- **Alerta mantido em uma linha `micro` laranja**, só quando existe. Cabe embaixo das métricas sem virar mais um badge e não aparece na maioria dos cards.
- `fase` e `alerta` saíram das props: o card lê o alerta do próprio `animal`.

### 4. `ResumoAnimalCard` (novo): card de baixo

```tsx
export function ResumoAnimalCard({ animal }: ResumoAnimalCardProps) {
  return (
    <Card padding="three">
      <View style={styles.list}>
        <ResumoLinha label="Peso">…{formatMedida(animal.pesoKg, 'kg', 0)}…</ResumoLinha>
        <ResumoLinha label="Produção de Leite"><MilkAmount liters={animal.producaoLeiteL} /></ResumoLinha>
        <ResumoLinha label="Crias">…{animal.crias}…</ResumoLinha>
        <ResumoLinha label="Ração Concentrado">…{formatMedida(animal.racaoKgDia, 'kg/dia')}…</ResumoLinha>
      </View>
    </Card>
  );
}
```

**Por quê**
- **Componente próprio:** no `df309c5`, as quatro linhas estavam soltas dentro da tela, com estilos repetidos. Agora a tela só faz `<ResumoAnimalCard animal={selectedAnimal} />`, e `ResumoLinha` evita repetir a mesma `View` + label quatro vezes.
- **Crias** = `criasPorMae()` (filhos com `mae_id` igual ao do animal). **Peso** = `pesosAtuais()`. **Leite e ração** = colunas recriadas pelo back-end (migration 0006). Tudo chega pronto no `animal`.
- **Fonte:** `Typography.body` / `bodyBold` (14). O `df309c5` usava 13 fixo, que não existe na escala do tema. Preferi seguir o tema (ponto 2 do review) a manter um número solto; a diferença visual é de 1px.

### 5. `RebanhoScreen`: comportamento de antes

```tsx
// A aba "Machos" só aparece quando há garrote ou touro no rebanho
const tabs = useMemo(
  () => rebanho.some((animal) => GRUPO_DA_FASE[animal.fase] === 'machos')
    ? [...TABS, TAB_MACHOS]
    : TABS,
  [rebanho]
);

// 1º toque seleciona o animal; 2º toque no selecionado abre a ficha
const handleAnimalPress = (animal: Animal) => { … };
```

**O que foi feito:** voltaram a seleção em dois toques, a lista limitada a 3 cards com rolagem interna (`VISIBLE_ANIMALS`), o funil "alta produção ≥ 20 L" (`ALTA_PRODUCAO_LEITE_L`) e o card de resumo. As abas usam a fase do `calcularFase` (literatura Embrapa).

**Por quê**
- **Machos condicional:** o `df309c5` não tinha machos. Na fazenda de leite eles são exceção, então a aba só aparece quando existe garrote ou touro. Considerei **garrote + touro** (e não só touro) porque o bezerro macho já vai para "Bezerros" e o garrote não teria onde aparecer. *A confirmar com o usuário (Líder Técnico).*
- **Filtro com leite `null`:** o animal sem produção informada fica fora da "alta produção". Não dá para afirmar que ele produz ≥ 20 L.
- **`selectedAnimal` sem `useMemo`:** é um `find` numa lista já filtrada, então o memo não pagava a leitura extra.
- **`handleAnimalCreated` passa `jaPariu`** ao `calcularFase` e seleciona o animal recém-criado.

### 6. `useRebanho.ts`: peso atual, crias e `jaPariu`

```ts
const { data: crias } = useLiveQuery(criasPorMae());
const { data: pesos } = useLiveQuery(pesosAtuais());

return useMemo(() => {
  const partoPorMae = new Map(partos.map((p) => [p.maeId, p.data]));
  const criasPor = new Map(crias.map((c) => [c.maeId, c.total]));
  const pesoPor = new Map(pesos.map((p) => [p.animalId, p.pesoKg]));
  return lista.map((animal) => {
    // ...
    return {
      ...animal,
      // ...
      pesoKg: pesoPor.get(animal.id) ?? null,
      crias: criasPor.get(animal.id) ?? 0,
      fase: calcularFase({
        sexo: animal.sexo,
        dataNascimento: animal.dataNascimento,
        ultimoParto,
        jaPariu: animal.jaPariu,
      }),
    };
  });
}, [lista, partos, comCarencia, crias, pesos, produzLeite]);
```

**Por quê**
- **Sem N+1:** duas consultas agregadas do back-end (`criasPorMae`, `pesosAtuais`) para o rebanho inteiro, em vez de uma consulta por card. Usei o mesmo padrão do `partoPorMae`, que já existia: um `Map` por id. Durante o desenvolvimento existiu um `usePesoAtual` temporário (uma consulta por animal); ele foi apagado e não entra no histórico.
- **`AnimalComFase` ganhou `pesoKg` e `crias`:** a lista e o resumo leem do mesmo objeto, sem buscar de novo.
- **`jaPariu`:** sem isso, uma vaca comprada adulta, que pariu antes de entrar no app, aparecia como novilha na aba errada. Era pendência do back-end, passada para o front pelo Líder Técnico.

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/features/rebanho/screens/RebanhoScreen.tsx` | Seleção em 2 toques, lista de 3 com rolagem, filtro, resumo, aba Machos condicional, `jaPariu` |
| `src/features/rebanho/components/AnimalCard.tsx` | Layout do `df309c5` com peso da pesagem e `MilkAmount` |
| `src/features/rebanho/components/ResumoAnimalCard.tsx` | **novo**: card de resumo |
| `src/features/rebanho/hooks/useRebanho.ts` | + `pesoKg` e `crias` (consultas agregadas) e `jaPariu` no `calcularFase` |
| `src/components/ui/MilkAmount.tsx` | `liters: number \| null`, vírgula, `Typography.captionBold` |
| `src/utils/formatters.ts` | + `SEM_VALOR`, `formatDecimal`, `formatMedida` |

### Resultado do `tsc`

```
$ npx tsc --noEmit
(sem saída)
exit code: 0
```

Obs.: `npx eslint` quebra dentro do `eslint-plugin-import` (stack em `exportMap/builder.js`), antes de analisar as regras. É um problema da ferramenta, não destes arquivos.

---

## Sprint 1 · Para onde foram os campos do cadastro (Novo Animal)

**Pergunta do usuário:** "Aonde foi parar todos aqueles campos para serem preenchidos com informações da vaca? O primeiro modal de registro (Novo Animal) foi resumido, mas aonde incrementamos mais dados?"

**Resposta curta:** no commit `5688a37`, os campos saíram do modal e foram para tabelas próprias (pesagens, reproduções) ou viraram valores calculados (crias). Só que **nenhuma tela foi criada para preencher esses dados**: hoje o produtor não consegue informar peso, leite, ração, mãe, coberturas, "já pariu" nem sexo, nem no cadastro nem depois. A ficha do animal só tem tratamentos.

> Este documento só registra a situação: nada foi implementado. A recomendação no fim está **PENDENTE DE DECISÃO DO USUÁRIO (P5/P6)**.

### 1. Antes × hoje

| # | Campo no `df309c5` | Obrigatório | Hoje no modal |
|---|---|---|---|
| 1 | Identificação (Brinco) | sim | ✅ mantido |
| 2 | Nome | não | ✅ mantido |
| 3 | Idade (anos + meses) | não | ✅ mantido (grava `nascimento_aproximado = true`) |
| 4 | Raça (autocomplete) | não | ✅ mantido |
| 5 | Peso (kg) | **sim** | ❌ removido |
| 6 | Produção de Leite (L) | não | ❌ removido |
| 7 | Crias | não | ❌ removido |
| 8 | Ração Concentrado (kg/dia) | não | ❌ removido |
| 9 | Brinco do Pai | não | ❌ removido |
| 10 | Brinco da Mãe | não | ❌ removido |
| 11 | Histórico de Coberturas / Inseminações (data, tipo, touro/sêmen) | não | ❌ removido (`CoberturasField.tsx` apagado) |

São **11 campos no `df309c5`** (12 se idade em anos e idade em meses contarem separado), contra **4 hoje**. `sexo` e `já pariu` nunca estiveram no modal, mas existem no banco e também entram na tabela abaixo.

### 2. Destino de cada campo removido

| Campo | Onde está hoje no banco | Função em `data/` | Tela para preencher |
|---|---|---|---|
| **Peso** | Tabela `pesagens` (`animal_id`, `data`, `peso_kg`): virou histórico, com uma linha por pesagem | `createPesagem` (escrita), `pesosAtuais` / `pesagensDoAnimal` (leitura) | **Nenhuma** |
| **Produção de leite** | Coluna `animais.producao_leite_l` (removida na 0002, recriada na 0006 como leite estimado) | Só via `createAnimal`; não existe `updateAnimal` | **Nenhuma** (a tela do Rebanho mostra "—") |
| **Crias** | Não é mais coluna: é **calculado** pela contagem de animais com `mae_id` = id da vaca | `criasPorMae` / `criasDe` (leitura); entra via `registrarParto` | **Nenhuma**: sem registro de parto, fica sempre 0 |
| **Ração** | Coluna `animais.racao_kg_dia` (removida na 0002, recriada na 0006) | Só via `createAnimal` | **Nenhuma** (mostra "—") |
| **Pai** | **Sumiu**: não há coluna `pai` nem `pai_brinco` | — | Nenhuma |
| **Mãe** | Coluna `animais.mae_id` (FK para `animais.id`; antes era texto `mae_brinco`) | Preenchida só pelo `registrarParto` | **Nenhuma**: um animal comprado não tem como receber a mãe |
| **Coberturas** | Tabela `reproducoes` (`tipo` = `cobertura` \| `inseminacao`, `data`, `prenhez_confirmada`, `previsao_parto`, `data_parto`, `cria_id`) | `createReproducao`, `confirmarPrenhez`, `reproducoesDoAnimal` | **Nenhuma** |
| ↳ **Touro / sêmen** | **Sumiu**: `reproducoes` não tem coluna para o reprodutor | — | Nenhuma |
| **Já pariu** | Coluna `animais.ja_pariu` (migration 0005), padrão `false` | Só via `createAnimal` | **Nenhuma**: a vaca comprada adulta fica como "novilha" |
| **Sexo** | Coluna `animais.sexo` (`'F'` \| `'M'`), padrão `'F'` | Só via `createAnimal` | **Nenhuma**: ver o bug no item 4 |

### 3. Trechos de código

#### `CoberturasField.tsx` (removido no `5688a37`): resumo

Componente de cerca de 270 linhas, embutido no fim do modal Novo Animal:

```tsx
/**
 * Seção "Histórico de Coberturas / Inseminações" do cadastro de animal:
 * exibe os registros em linha do tempo e um mini-formulário, aberto sob
 * demanda, para incluir novos.
 */
export function CoberturasField({ coberturas, onAdd, onRemove }: CoberturasFieldProps) {
  const [tipo, setTipo] = useState<TipoCobertura>('inseminacao'); // chips: Inseminação | Monta Natural
  const [data, setData] = useState('');                            // DD/MM/AAAA com máscara
  const [touroSemen, setTouroSemen] = useState('');                // "Touro" na monta, "Sêmen" na inseminação
  // ...linha do tempo com badge de contagem, botão remover e mini-formulário
}
```

No hook antigo, as coberturas iam num `useFieldArray` e eram gravadas junto com o animal (`createAnimal(dados, coberturas)`). Bezerros ignoravam a lista.

#### Funções que já existem, mas nenhuma tela chama

```ts
// data/pesagens.ts
export async function createPesagem(input: NovaPesagem): Promise<void>

// data/reproducoes.ts
/** Registra a cobertura/inseminação já com a previsão de parto calculada. */
export async function createReproducao(
  input: Omit<NovaReproducao, 'previsaoParto'>
): Promise<Reproducao>

export async function confirmarPrenhez(id: string, confirmada: boolean): Promise<void>

// data/animais.ts
/**
 * Registra o parto: cria o bezerro já ligado à mãe (origem "nascido", nascimento
 * na data do parto) e fecha a cobertura em aberto mais recente da vaca, se houver.
 */
export async function registrarParto(
  maeId: string,
  { data, sexo, brinco }: DadosParto
): Promise<Animal>

/** Saída do rebanho: só muda o status, o registro nunca é apagado. */
export async function registrarSaida(
  animalId: string,
  saida: { status: StatusSaida; data: Date; motivo?: string }
): Promise<void>
```

Não existe `updateAnimal`. Editar dados do animal está no plano da Sprint 2 (B5).

### 4. Bug: todo animal entra como fêmea

```ts
// schema.ts
sexo: text('sexo', { enum: SEXOS }).notNull().default('F'),

// useNovoAnimalForm.ts: o createAnimal não envia sexo
const created = await createAnimal({
  brinco,
  nome: values.nome || undefined,
  raca: values.raca || undefined,
  dataNascimento: …,
  nascimentoAproximado: idadeMesesTotal !== null,
});
```

O modal não pergunta o sexo, então todo animal cadastrado vira `'F'`. Efeitos:
- um touro cadastrado aparece como **novilha**;
- a aba **Machos** nunca aparece para animais criados pelo app (só para os do seed);
- um bezerro macho é contado como **bezerra**, e no futuro entraria em "registrar cobertura".

### 5. Recomendação: PENDENTE DE DECISÃO DO USUÁRIO (P5/P6)

O modal continua curto: só o que define **quem é** o animal. Dados opcionais ficam recolhidos, e **eventos com data** (pesagem, cobertura, parto) vão para a ficha.

**Modal: sempre visível**
- Brinco*, nome, idade, raça (como hoje);
- **Sexo** (chips F / M): corrige o bug do item 4;
- **Já pariu?** (switch): só aparece para fêmea com 12 meses ou mais. Resolve a vaca comprada adulta.

**"Mais detalhes": recolhido, tudo opcional**
- **Peso atual** (kg) → vira a 1ª linha em `pesagens`;
- **Produção de leite** (L/dia) → `producao_leite_l`;
- **Ração concentrado** (kg/dia) → `racao_kg_dia`;
- **Mãe** (autocomplete pelos brincos já cadastrados) → `mae_id`.

**Ficha do animal: ações**
- **Nova pesagem**: `createPesagem`;
- **Registrar cobertura** / confirmar prenhez: `createReproducao`, `confirmarPrenhez`;
- **Registrar parto**: `registrarParto` (cria a cria, liga `mae_id`, conta crias e vira "vaca");
- **Editar dados**: precisa do `updateAnimal` (B5 da Sprint 2);
- **Saída** (venda/morte): `registrarSaida`.

**O que não voltaria**
- **Coberturas dentro do cadastro:** era o pedaço mais pesado do modal antigo. Cobertura é um evento com data e acompanhamento (prenhez, previsão de parto), então o lugar natural é a ação na ficha.
- **Pai e touro/sêmen:** só se o usuário quiser de volta. Exige colunas novas (back-end).

**Prioridade sugerida:** (a) sexo + já pariu no modal → (b) "Mais detalhes" com peso, leite e ração, senão a tela do Rebanho fica só com "—" → (c) "Nova pesagem" e "Registrar parto" na ficha → (d) "Editar dados" (B5).

> **Decisão do usuário (P5/P6):** aprovado. O cadastro novo entra na Sprint 2, com sexo, "Já pariu?" e "Mais detalhes" (peso, leite, ração, mãe e pai). Pai e touro/sêmen voltam com colunas novas.

---

# Sprint 2

Escrito conforme cada item é entregue. Os tipos de dados vêm de `@/dtos`; os props continuam no próprio componente.

## F10 · Token `IconSize`

```ts
// src/constants/theme.ts
/** Tamanhos padrão dos ícones vetoriais (AppIcon) */
export const IconSize = {
  sm: 12,
  md: 16,
  lg: 20,
} as const;

// src/components/ui/AppIcon.tsx
export function AppIcon({ name, size = IconSize.lg, color = '#64748B' }: AppIconProps) {

// src/components/ui/MilkAmount.tsx
<AppIcon name="milk" size={IconSize.sm} color={AgroColors.milk} />
```

**O que foi feito:** criei a escala de tamanho de ícone (decisão P4) e apliquei no padrão do `AppIcon` e no `MilkAmount`.

**Por quê**
- Fecha o ponto 2 do review da Sprint 1: o "12" solto do `MilkAmount` agora vem do tema.
- **Os valores são os que já se usavam:** 12 no selo de leite, 20 como padrão do `AppIcon` e na Home, e 16 como meio-termo para chips e botões. Nenhum ícone muda de tamanho.
- `HomeScreen.tsx` e `OrdenhaCard.tsx` também passam números fixos, mas estavam travados (o back-end está trocando imports para DTOs). Ficam para quando forem liberados.

**Commit:** `421b877`

## Componentes de formulário novos

Todos são arquivos novos, exportados em `@/components/forms` (o `InfoBanner` em `@/components/ui`). Nenhum consulta o banco: recebem valor e devolvem pelo `onChange`. Seguem o visual do `ChipSelector` (rótulo `caption` 600, borda `borderStrong`, selecionado em verde) e usam só tokens do tema.

| Componente | Valor | Uso previsto |
|---|---|---|
| `WeekdayPicker` | `DiaSemana[]` (1 = domingo … 7 = sábado) | Novo Tratamento: dias da dose |
| `IntervalPicker` | `4 \| 6 \| 8 \| 12 \| 24` | Novo Tratamento: "a cada N h" quando são todos os dias |
| `AvisoPicker` | `0 \| 15 \| 60 \| 1440` | Novo Tratamento: "Quando notificar" (`aviso_minutos_antes`) |
| `SwitchField` | `boolean` | Cadastro: "Já pariu?" |
| `CollapsibleSection` | — (abre/fecha) | Cadastro: "Mais detalhes" |
| `AnimalPicker` | `id \| null` | Mãe; base do `OrigemAnimalField` |
| `OrigemAnimalField` | `{ id, descricao }` | Pai (cadastro) e touro (cobertura) |
| `DateField` | `Date` | Data de pesagem, cobertura, parto, saída e dose |
| `InfoBanner` | — | "Limite de lembretes atingido" |

### `WeekdayPicker`

```tsx
export const TODOS_OS_DIAS: DiaSemana[] = [1, 2, 3, 4, 5, 6, 7];

const alternar = (dia: DiaSemana) =>
  onChange(
    value.includes(dia)
      ? value.filter((d) => d !== dia)
      : [...value, dia].sort((a, b) => a - b)
  );
```

**Por quê**
- **De 1 a 7 com 1 = domingo:** é o padrão do `expo-notifications` (`DiaSemana` vem de `@/dtos`). O valor vai direto para o agendamento, sem conversão.
- **Visual de alarme do celular** (pedido do usuário): sete círculos D S T Q Q S S. Como as letras se repetem (Q, S), cada círculo tem `accessibilityLabel` com o nome do dia, para o leitor de tela.
- **"Todos os dias" / "Limpar":** é o atalho mais comum (remédio diário). Com todos marcados, o formulário mostra o `IntervalPicker`.
- O array fica sempre ordenado, então `[2, 4]` e `[4, 2]` não viram valores diferentes.

### `IntervalPicker` e `AvisoPicker`

```tsx
export const INTERVALOS_HORAS = [4, 6, 8, 12, 24] as const;
export const AVISOS_MINUTOS = [0, 15, 60, 1440] as const;

<ChipSelector
  options={OPCOES}
  value={String(value)}
  onChange={(v) => onChange(Number(v) as IntervaloHoras)}
/>
```

**Por quê**
- **São um `ChipSelector` por dentro:** não duplicam o estilo de chip, só traduzem número ↔ texto (o `ChipSelector` trabalha com `string`).
- **Opções fixas, sem campo livre:** o intervalo só aceita divisores de 24, então a dose cai nos mesmos horários todo dia. Como não há digitação, não há o que validar.
- As listas e os tipos (`IntervaloHoras`, `AvisoMinutos`) são exportados para o formulário e o back-end usarem os mesmos valores.

### `SwitchField` e `CollapsibleSection`

**Por quê:** os dois são pequenos e genéricos (rótulo + `Switch`; título + ▾ + conteúdo). O `CollapsibleSection` começa **fechado**, para o cadastro continuar curto. Quem não quer detalhes nem vê os campos.

### `AnimalPicker`

```tsx
const escolhido = animais.find((animal) => animal.id === value);
if (escolhido) return /* cartão verde "🐮 Mimosa · #104  ✕" */;
// senão: campo de busca + até 5 sugestões por brinco/nome (sem acento/caixa)
```

**Por quê**
- **Devolve o `id`, não o texto:** `mae_id`, `pai_id` e `touro_id` são FKs. Antes era `mae_brinco` em texto, que quebrava se o brinco mudasse.
- **Quem chama filtra a lista** (só fêmeas para mãe, só machos para pai/touro). O componente não conhece regra de rebanho.
- **Escolhido = cartão com ✕:** fica claro que já existe uma seleção, e tocar no cartão desfaz. A busca reaproveita `normalizarTexto` ("mimosa" acha "Mimosa").

### `OrigemAnimalField`: "Da fazenda" × "De fora / sêmen"

```tsx
export interface OrigemAnimalValue {
  id: string | null;
  descricao: string | null;
}

const trocarOrigem = (nova: Origem) => {
  setOrigem(nova);
  onChange({ id: null, descricao: null });
};
```

**Por quê**
- **Dois chips no topo** decidem qual campo aparece: o `AnimalPicker` (→ `id`) ou o texto livre (→ `descricao`). É a forma mais simples de alternar, pedida pelo Líder Técnico.
- **Trocar limpa o outro lado:** nunca vão `pai_id` e `pai_descricao` juntos.
- **Um componente para os dois usos:** pai no cadastro (`pai_id`/`pai_descricao`) e touro na cobertura (`touro_id`/`touro_descricao`).
- **`OrigemAnimalValue` fica no componente, não em `@/dtos`:** é a forma do valor do campo (UI), não um contrato com `data/`. Quem salva mapeia para as colunas.

### `DateField`

```tsx
function textoDaData(data: Date): string {
  const dias = diasEntre(data, new Date());
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return formatDataBR(data);
}
```

**Por quê**
- **Começa em "Hoje ▾":** quase todo registro (pesagem, parto, dose) é do dia. O produtor só toca se precisar mudar.
- **Calendário nativo** (`@react-native-community/datetimepicker`, já instalado e usado pelo `TimeWheelPicker`). Ele não digita data, então não precisa de máscara nem de validação de formato.
- `maximumDate` / `minimumDate` deixam quem chama impedir data futura em registros que já aconteceram.

### `InfoBanner`

**Por quê:** é uma faixa simples (ícone + texto) com as cores `warning*` que já existem no tema, e tem a variante `info` para outros avisos. `accessibilityRole="alert"` faz o leitor de tela anunciar o aviso. Ele só exibe: quem decide se o limite (~60 lembretes) foi atingido é o back-end.

### Validação

`tsc` isolado (HEAD + só estes arquivos, com índice temporário): **OK**. O `tsc` do working tree inteiro acusa erros em `__tests__/` (trabalho em andamento do back-end), não nestes arquivos.

**Commit:** `ad145b9`

## F6 · Menu "Outros registros"

`src/features/rebanho/components/OutrosRegistrosMenu.tsx` (novo)

```tsx
export type TipoRegistro = 'pesagem' | 'cobertura' | 'parto' | 'saida';

const OPCOES: OpcaoRegistro[] = [
  { tipo: 'pesagem', icone: '⚖', titulo: 'Pesagem', descricao: 'Registrar o peso do animal' },
  { tipo: 'cobertura', icone: '🐂', titulo: 'Cobertura', descricao: 'Monta natural ou inseminação', reprodutiva: true },
  { tipo: 'parto', icone: '🐄', titulo: 'Parto', descricao: 'Registrar o nascimento da cria', reprodutiva: true },
  { tipo: 'saida', icone: '🚪', titulo: 'Saída', descricao: 'Venda, morte ou descarte' },
];

const opcoes = OPCOES.filter((opcao) => reprodutiva || !opcao.reprodutiva);

<FormModal visible={visible} title="Outros registros" onClose={onClose}>
  {opcoes.map((opcao) => <Pressable onPress={() => onSelect(opcao.tipo)}>…</Pressable>)}
</FormModal>
```

**O que foi feito:** um modal com as quatro opções em cartões (ícone + título + descrição + ›). Ele só avisa qual foi escolhida (`onSelect(tipo)`); quem abre o mini-formulário é a ficha (F7).

**Por quê**
- **Cobertura e Parto só para novilha/vaca:** o menu recebe `reprodutiva: boolean`. A ficha calcula esse valor com `emIdadeReprodutiva(sexo, fase)`, que já existe em `services/fase`. O menu não conhece a regra de fase.
- **As opções ficam numa lista de dados (`OPCOES`)**, não em quatro blocos de JSX repetidos. Para incluir um registro novo, basta uma linha.
- **Descrição em cada opção:** "Saída" sozinho é ambíguo; "Venda, morte ou descarte" deixa claro.

### `FormModal`: `onSubmit` opcional

```tsx
/** Sem onSubmit, o modal não mostra o rodapé (ex.: menu de opções) */
onSubmit?: () => void;
// ...
{onSubmit ? <View style={styles.footer}>…Cancelar / Salvar…</View> : null}
```

**Por quê:** o menu precisa do mesmo modal (fundo escuro, cartão, título, ✕), mas sem os botões Salvar/Cancelar. Deixar `onSubmit` opcional reaproveita o modal inteiro em vez de copiar ~150 linhas de estilo. Quem já usa (Home, Novo Animal, Tratamento) passa `onSubmit` e não muda nada.

**Validação:** `tsc` isolado OK.

**Commit:** `ff8e761`

## F7 · Mini-formulários: Pesagem, Cobertura, Parto e Saída

`src/features/rebanho/components/registros/` (novos) + `hooks/useEnvioRegistro.ts`

| Formulário | Campos | Grava com |
|---|---|---|
| `PesagemForm` | Peso* (kg), Data (Hoje ▾) | `createPesagem` |
| `CoberturaForm` | Tipo (Monta natural / Inseminação), Data, Touro (`OrigemAnimalField`) | `createReproducao` (com `touroId` / `touroDescricao`) |
| `PartoForm` | Data, Sexo da cria, Brinco da cria* | `registrarParto` (cria a cria ligada à mãe e fecha a cobertura aberta) |
| `SaidaForm` | Tipo (Venda / Morte / Descarte), Data, Observação | `registrarSaida` |

```tsx
// RegistroForm.tsx: a ficha só faz <RegistroForm tipo={…} animalId={…} touros={…} onClose={…} />
switch (tipo) {
  case 'pesagem':   return <PesagemForm animalId={animalId} onClose={onClose} />;
  case 'cobertura': return <CoberturaForm animalId={animalId} touros={touros} onClose={onClose} />;
  case 'parto':     return <PartoForm maeId={animalId} onClose={onClose} />;
  case 'saida':     return <SaidaForm animalId={animalId} onClose={onClose} />;
}

// useEnvioRegistro.ts: carregando → salva → fecha; se der erro, avisa
const submit = async () => {
  setSaving(true);
  try {
    await enviar();
    onClose();
  } catch {
    Alert.alert('Não foi possível salvar', 'Tente novamente.');
  } finally {
    setSaving(false);
  }
};

// PesagemForm.tsx: a única validação é o que não pode faltar
if (!(parseDecimal(peso) > 0)) {
  setErro('Informe o peso em kg.');
  return;
}
```

**Por quê**
- **Um arquivo por formulário + `RegistroForm` que escolhe:** cada formulário fica com 50 a 70 linhas e lê de cima a baixo. A ficha não precisa conhecer os quatro.
- **Usa só as funções que já existiam em `data/`:** nenhuma regra nova no front. A previsão de parto (cobertura + 283 dias) e a ligação cria ↔ mãe já são feitas pelo `createReproducao` e pelo `registrarParto`.
- **Renderizado só enquanto aberto (`visible` fixo):** cada abertura monta o formulário de novo, com campos limpos. Não precisa de `reset` nem de `useEffect`.
- **Validação mínima:** só peso > 0 e brinco da cria preenchido, que são os campos obrigatórios das tabelas. O resto tem valor padrão (data = hoje, tipo = o mais comum) ou é opcional.
- **`useEnvioRegistro`:** os quatro formulários compartilham o mesmo carregar/fechar/erro em vez de repetir o `try/finally`.
- **Touro:** na inseminação o rótulo vira "Sêmen / touro". O `OrigemAnimalField` grava `touroId` (touro da fazenda) **ou** `touroDescricao` (de fora/sêmen), nunca os dois.
- **Data máxima = hoje** em todos: são registros de algo que já aconteceu.
- **Saída:** "Venda / Morte / Descarte" mapeiam para o status (`vendido`, `morto`, `descarte`). O subtítulo avisa que o histórico fica guardado, porque o produtor pode ter medo de "apagar" o animal.

**Ligação na ficha:** quem liga é o full-stack, dono do `AnimalDetalheScreen` (F8), com o snippet repassado pelo Líder Técnico. `touros = useRebanho().filter(sexo === 'M')` e `reprodutiva = ficha.podeReproduzir`.

**Validação:** `tsc` isolado OK.

**Commit:** `7965910`

## F2 · `FichaResumo`: topo da Ficha Animal

`src/features/rebanho/components/FichaResumo.tsx` (novo) + `ResumoLinha.tsx` (extraído)

```tsx
export function FichaResumo({ ficha, alerta }: FichaResumoProps) {
  const { animal, fase, idade, situacaoLeite, peso, ultimoParto, podeReproduzir } = ficha;
  const titulo = animal.nome ? `${animal.nome} · ${animal.brinco}` : `Brinco ${animal.brinco}`;
  const subtitulo = [FASE_LABEL[fase], idade, animal.raca].filter(Boolean).join(' · ');
  // perfil (🐮 + título + "Vaca · 4 anos · Girolando" + badge Em lactação/Seca)
  // alerta (InfoBanner), se houver
  // card: Peso (+ ganho), Produção de Leite*, Ração*, Crias**, Último parto*
}

/** "+12 kg em 30 dias", ou null quando só há uma pesagem. */
function textoDoGanho(peso: PesoAtual | null): string | null { … }
```
\* só quando preenchido · \*\* só para novilha/vaca

**O que foi feito:** o bloco de cima da ficha, com perfil, alerta e um card de números. Ele recebe o `FichaAnimal` pronto (do `useFichaAnimal`, contrato em `@/dtos`) e não faz nenhuma consulta.

**Por quê**
- **Só exibe:** quem calcula fase, idade, situação do leite e ganho de peso é o `useFichaAnimal`/back-end. O componente fica testável só com props e não duplica regra.
- **Linhas condicionais:** na ficha (diferente da lista do Rebanho, que precisa de colunas alinhadas), um "—" em leite/ração de um touro só polui. A linha aparece quando há dado, seguindo o comentário do esqueleto da ficha: "Produção de Leite só quando preenchida". Crias aparece só para novilha/vaca (`podeReproduzir`).
- **Ganho de peso junto do peso:** "+12 kg em 30 dias" em verde e pequeno, embaixo do valor. É a informação que o produtor quer ao pesar, e o `PesoAtual` já traz `ganhoKg` e `diasDesdeAnterior`.
- **Subtítulo com `filter(Boolean)`:** sem idade ou sem raça, não sobra " ·  · ".
- **Situação do leite como badge à direita:** "Em lactação" (verde) ou "Seca" (cinza). Só aparece em fazenda de leite e para vaca, porque o `situacaoLeite` já vem `null` nos outros casos.
- **`alerta` é prop opcional:** o `FichaAnimal` não tem alerta. A ficha passa o mesmo texto de carência da lista, quando houver.

### `ResumoLinha` extraído

```tsx
export function ResumoLinha({ label, children }: ResumoLinhaProps) {
  // texto/número vira <Text> em negrito; elemento (ex.: MilkAmount) entra como está
}
```

**Por quê:** a linha "rótulo ..... valor" estava dentro do `ResumoAnimalCard` e passou a ser usada também no `FichaResumo`. Ela aceita texto direto (`<ResumoLinha label="Crias">{3}</ResumoLinha>`), o que tirou o `<Text style={styles.value}>` repetido do `ResumoAnimalCard` (−32 linhas, mesmo visual).

**Pendente:** o full-stack troca a "Identificação do Animal" do `AnimalDetalheScreen` por `<FichaResumo ficha={ficha} alerta={…} />` (placeholder "A. F2").

**Validação:** `tsc` isolado OK.

**Commit:** `75b74a7`

## F9 · Cadastro novo (modal "Novo Animal")

`NovoAnimalForm.tsx` + `useNovoAnimalForm.ts` + `RebanhoScreen.tsx` (passa `animais={rebanho}`)

**Antes × agora**

| Sempre à vista | "Mais detalhes" (recolhido) |
|---|---|
| Brinco*, Nome, **Sexo** (Fêmea/Macho), Idade, Raça, **Já pariu?** (só fêmea adulta) | **Peso atual**, **Produção de leite** e **Ração** (só fêmea), **Mãe** (`AnimalPicker`, fêmeas), **Pai** (`OrigemAnimalField`, machos ou de fora/sêmen) |

```ts
// useNovoAnimalForm.ts
const [sexo, idadeAnos, idadeMeses] = form.watch(['sexo', 'idadeAnos', 'idadeMeses']);
const idade = idadeTotalMeses(idadeAnos, idadeMeses);
const femea = sexo === 'F';
// "Já pariu?" só faz sentido para fêmea adulta (sem idade, tratamos como adulta)
const mostrarJaPariu = femea && (idade === null || idade >= IDADE_FIM_CRIA_MESES);

// envio
jaPariu: ehFemea && values.jaPariu,
producaoLeiteL: ehFemea ? decimalOuNull(values.producaoLeiteL) : null,
racaoKgDia: ehFemea ? decimalOuNull(values.racaoKgDia) : null,
maeId: values.maeId,
paiId: values.pai.id,
paiDescricao: values.pai.descricao,
```

**Por quê**
- **Corrige o bug do sexo** (Sprint 1): o modal agora pergunta, com padrão Fêmea (a maior parte do rebanho leiteiro). Um touro cadastrado deixa de virar novilha e a aba Machos passa a funcionar para animais criados no app.
- **"Já pariu?" condicional:** aparece só para fêmea com 12 meses ou mais, ou sem idade informada, que tratamos como adulta, igual ao `calcularFase`. Resolve a vaca comprada adulta, que antes ficava como novilha.
- **Macho não leva leite, ração nem "já pariu"** (decisão do usuário): os campos somem da tela **e** o envio força `null`/`false`. Se o produtor digitar leite e depois trocar para Macho, o valor não vai para o banco.
- **"Mais detalhes" fechado:** o modal continua com 6 campos à vista, como o usuário pediu ("sem perder a simplicidade"). Quem quer completar abre a seção.
- **Mãe e pai pelo id:** grava `mae_id`/`pai_id` (FK) em vez do texto `mae_brinco`/`pai_brinco` de antes. Pai de fora ou sêmen vai em `pai_descricao`.
- **`decimalOuNull`:** campo vazio vira `null`, nunca `0`. Leite/ração vazios aparecem como "—" na lista, sem inventar valor.
- **Sem modo edição:** decisão do usuário. Não haverá "Editar dados" na ficha, então o cadastro existe só neste modal.

**Pendente (B5):** o **peso atual** já está no formulário, mas só vai ser gravado quando o back-end entregar o `cadastrarAnimal` (animal + 1ª pesagem na mesma transação). O Líder Técnico pediu para não chamar `createPesagem` depois do `createAnimal`, porque se der erro no meio fica animal sem pesagem. Está marcado com `TODO(B5)` no hook; a troca é uma linha.

**Validação:** `tsc` isolado OK.

**Commit:** `295df9c`

## F4 · `ReproducaoCard`

`src/features/rebanho/components/ReproducaoCard.tsx` (novo)

```tsx
export interface ReproducaoCardProps {
  reproducao: ReproducaoFicha;        // coberturaAberta + previsaoParto (useFichaAnimal)
  ultimoParto: Date | null;
  touros: Animal[];                    // para mostrar o nome do touro da fazenda
  onConfirmarPrenhez: (coberturaId: string, prenhe: boolean) => void;
}

/** "12/12/2026 (em 40 dias)", "Hoje" ou "(há 3 dias)" se já passou. */
function textoDaPrevisao(previsao: Date): string { … }

{coberturaAberta.prenhezConfirmada == null ? (
  <Button label="Está prenhe" variant="outline" … onPress={() => onConfirmarPrenhez(id, true)} />
  <Button label="Não pegou" variant="ghost" … onPress={() => onConfirmarPrenhez(id, false)} />
) : null}
```

**O que mostra:** Monta natural/Inseminação + data, Touro, Previsão de parto (com "em N dias"), Prenhez (Confirmada / A confirmar) e Último parto. Sem cobertura em aberto, mostra "Nenhuma cobertura em aberto.".

**Por quê**
- **Só exibe, igual ao `FichaResumo`:** quem grava a confirmação é a ficha, via `onConfirmarPrenhez` → `confirmarPrenhez(id, prenhe)` de `data/reproducoes`. O componente não importa nada de `data/`.
- **"Está prenhe" / "Não pegou":** palavras do produtor no lugar de "positivo/negativo". Os botões só aparecem enquanto a prenhez não foi respondida. Com "Não pegou", a cobertura deixa de estar "em aberto" (regra do `useFichaAnimal`) e o card volta para "Nenhuma cobertura em aberto.".
- **"em N dias" na previsão:** o produtor quer saber quanto falta, não só a data. Se passou, mostra "há N dias", um sinal de parto atrasado ou de parto não registrado.
- **Touro:** mostra o nome/brinco quando é da fazenda (`touroId` procurado em `touros`), senão o texto de fora/sêmen (`touroDescricao`).
- **Reaproveita `ResumoLinha`**, então tem o mesmo visual do card de resumo.

**Para a ficha (full-stack):** placeholder "C. F4". Renderizar só se `ficha.podeReproduzir`:
`<ReproducaoCard reproducao={ficha.reproducao} ultimoParto={ficha.ultimoParto} touros={machos} onConfirmarPrenhez={confirmarPrenhez} />`

**Validação:** `tsc` isolado OK.
