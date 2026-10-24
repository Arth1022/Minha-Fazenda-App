# Code Review · Front-end

Registro do trabalho de front, organizado por sprint, para revisão do usuário.
Cada parte traz o código, o que foi feito e por que as escolhas foram tomadas.

---

## Sprint 1 · Ícone e selo de leite

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
