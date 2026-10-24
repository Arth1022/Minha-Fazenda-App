# Code review: ajustes nas telas do Rebanho (24/10/2026)

Esta sessão teve um agente só. Ela cobre os 3 ajustes da tela **Gerenciamento Rebanho** e os 14 da **Ficha Animal** / modal **Novo Tratamento**. A pedido do usuário, também tirou os emojis dos componentes dessas telas.

Validação: `tsc --noEmit` limpo, `eslint` sem aviso novo, `npm test` passando. A suíte ganhou 3 checagens para `alterarFimDoTratamento` e a do aviso padrão foi atualizada.

---

## 1. Banco e dados

### 1.1 Coluna `observacoes` em `tratamentos` (item 9 da ficha)

```ts
// src/database/schema.ts
/** Anotação livre do produtor (via de aplicação, lote, veterinário...) */
observacoes: text('observacoes'),
```

```sql
-- src/database/migrations/0009_tratamentos_observacoes.sql (gerada pelo drizzle-kit)
ALTER TABLE `tratamentos` ADD `observacoes` text;
```

**Por quê:** o campo "Observações" do formulário precisa ser gravado em algum lugar. A coluna aceita null, então os tratamentos que já existem não mudam. A migration, o snapshot e o `migrations.js` saíram do `drizzle-kit generate`, nada foi escrito à mão. O `npm run test:migrations` passa.

### 1.2 Aviso fixo de 15 minutos (item 8)

```ts
// src/features/rebanho/services/doses.ts
/** O aviso da dose toca sempre 15 minutos antes (não é escolha do produtor). */
export const AVISO_DOSE_MINUTOS_ANTES = 15;
```

```ts
// src/features/rebanho/data/tratamentos.ts
export async function createTratamento(
  input: Omit<NovoTratamento, 'avisoMinutosAntes'>
): Promise<Tratamento> {
  const valores = { ...input, avisoMinutosAntes: AVISO_DOSE_MINUTOS_ANTES };
  ...
}
```

**Por quê:** o valor fixo fica na regra (service) e é aplicado na única porta de gravação. Quem chama não tem como mandar outro valor, porque o tipo do input já tira o campo (`Omit`). A coluna `aviso_minutos_antes` continua no banco. O agendador de notificações de dose, quando sair, lê dela sem precisar de mudança. Optei por não fazer migration para remover a coluna: é mais seguro e, se um dia o produtor puder escolher de novo, basta voltar o campo.

### 1.3 Mudar o fim do tratamento pela ficha (item 5)

```ts
// src/features/rebanho/data/tratamentos.ts
export async function alterarFimDoTratamento(tratamento: Tratamento, dataFim: Date): Promise<void> {
  const fim = inicioDoDia(dataFim);
  const erros = errosDaAgenda({ ...tratamento, dataFim: fim });
  if (erros.length > 0) throw new Error(erros.join('; '));
  await db.update(tratamentos).set({ dataFim: fim }).where(eq(tratamentos.id, tratamento.id));
}
```

**Por quê:** reaproveita o `errosDaAgenda`, que já valida "fim antes do início" e "período sem dia de dose". Assim a ficha e o cadastro seguem a mesma regra. A data é gravada à meia-noite, como o cadastro faz. A ficha usa `useLiveQuery`, então a tela se atualiza sozinha depois do update.

Testes novos (`__tests__/doses.test.ts`): grava a meia-noite do novo fim, recusa fim antes do início e mantém o valor anterior quando recusa.

---

## 2. Tela Gerenciamento Rebanho

| Item | O que mudou |
|---|---|
| 1. Fundo do leite | `MilkAmount` ganhou `variant: 'pill' \| 'plain'`. A lista e o resumo usam `plain`. A ficha continua com o selo. |
| 2. Card verde ao clicar | O `AnimalCard` perdeu o prop `selected`: sem a variante `selected` e sem o avatar verde. |
| 3. Um toque abre a ficha | O `handleAnimalPress` agora só faz `setSelectedId` e `router.push`. |

```ts
// RebanhoScreen.tsx
// Um toque abre a ficha; o resumo abaixo da lista fica com o último aberto
const handleAnimalPress = (animal: Animal) => {
  setSelectedId(animal.id);
  router.push({ pathname: '/animal/[id]', params: { id: animal.id } });
};
```

**Por quê:** o `ResumoAnimalCard` abaixo da lista precisa de um animal. Guardar o último aberto deixa esse resumo útil quando o usuário volta da ficha. A variante de leite virou prop em vez de um componente novo porque o visual muda só no fundo.

---

## 3. Ficha Animal

### 3.1 Idade junto da identificação (item 1)

```tsx
// FichaResumo.tsx
<Text style={styles.titulo} numberOfLines={1}>
  {titulo}
  {idade ? <Text style={styles.idade}> · {idade}</Text> : null}
</Text>
```

A idade saiu do subtítulo, que agora mostra fase · raça, e foi para a linha do brinco/nome em cinza. Usei `Text` aninhado para que ela quebre e corte junto com o título.

### 3.2 O TratamentoAtivoCard foi dividido em componentes (itens 2, 3, 4, 5)

Antes era um arquivo de 270 linhas. Agora ele só monta as partes, que ficam em `components/tratamento/`:

| Componente | Responsabilidade |
|---|---|
| `PeriodoDoTratamento` | Início só leitura e Fim editável (chama `alterarFimDoTratamento`, mostra o erro num Alert). Sem fim aparece "Contínuo". |
| `TrilhaDeDoses` | Os círculos dos dias. Tocar marca ou desmarca a dose. |
| `ProximaDoseCard` | O card "Próxima dose" com o ícone SVG de relógio, sem o título "Notificações". |

- **Item 2:** o botão "Dei a dose de hoje" saiu. Marcar a dose agora é só pelo círculo da trilha.
- **Item 3:** saiu o título "Notificações". Ficou só o card.
- **Item 4:** o 🕒 virou `AppIcon name="clock"` (SVG no padrão Feather, como os outros ícones do app).
- **Item 5:** o Fim agora é um `DateField` que dá para editar, com `minimumDate` igual ao início.

Para o Início e o Fim terem o mesmo visual, o `DateField` ganhou dois recursos genéricos:
- `disabled`: só exibe a data, sem seta e com fundo cinza;
- `value: Date | null` com `placeholder`, para o tratamento contínuo.

### 3.3 Sem o sub-banner "Tratamento Animal" (item 11)

O `subBannerTitle` saiu do `Header` da ficha. O prop continua no `Header` porque é genérico.

### 3.4 Reprodução vira seção, sem card (item 12)

`ReproducaoCard.tsx` foi renomeado para `ReproducaoSecao.tsx`. O `Card` virou uma `View` com `SectionHeader title="Reprodução"` e as linhas direto na tela, como no tratamento. O nome do arquivo mudou porque "Card" passaria a enganar quem lê.

### 3.5 Menu "Adicionar" (itens 13 e 14)

`OutrosRegistrosMenu.tsx` foi renomeado para `AdicionarRegistroMenu.tsx`. O botão do rodapé e o título do modal agora dizem "Adicionar". Os ícones das opções saíram e ficaram só título e descrição, com uma seta SVG no lugar do "›".

---

## 4. Modal Novo Tratamento

| Item | O que mudou |
|---|---|
| 6. Horário | O `TimeWheelPicker` virou um campo compacto, igual ao `DateField`: "08:00" com ícone de relógio, e o seletor nativo abre ao tocar. Saíram a caixa verde com o número de 28px e o "Selecionar horário". |
| 7. Carência genérica | Um campo só, "Carência (dias)", fora do "Mais detalhes". |
| 8. Avisar | O `AvisoPicker` saiu do formulário (ver 1.2). |
| 9. Resumo e observações | A frase "Dose única hoje às 08:00…" saiu. "Observações" (multilinha) entrou no "Mais detalhes". |
| 10. Botão | Agora é `submitLabel="SALVAR"`. |

### Carência genérica (decisão do usuário: um campo, sem mexer no banco)

```ts
// useNovoTratamentoForm.ts
// Carência genérica: o mesmo prazo vale para a carne e, se a fazenda tira leite, para o leite
const carencia = v.carenciaDias ? Number(v.carenciaDias) : null;
...
carenciaLeiteDias: produzLeite ? carencia : null,
carenciaCarneDias: carencia,
```

Para preencher sozinho a partir do último uso do remédio, vale a carência da carne. Se só a do leite foi informada, vale a do leite. Os alertas de carência e as consultas continuam lendo as duas colunas, então nada mais precisou mudar.

### TimeWheelPicker

O componente ganhou o prop `label`. Antes, só no Android, ele escrevia "Horário" por dentro, e o formulário escrevia outro "Horário" por fora. Agora o rótulo vem de quem usa: o modal de tratamento e o de ordenha na Home passam `label="Horário"`. No iOS a roda abre embaixo do campo ao tocar (mesmo padrão do `DateField`), em vez de ficar sempre aberta ocupando o modal.

### Código morto removido

Sem a frase de resumo, `resumoDaAgenda`, `textoDoAviso`, `ehDoseUnica` e os helpers de texto ficaram sem uso. O arquivo `services/resumoTratamento.ts` foi renomeado para `services/agendaEmEdicao.ts` e ficou só com `UMA_VEZ_POR_DIA` e `temDoseNoPeriodo`. O DTO `AgendaEmEdicao` encolheu para os quatro campos que a validação usa: `diasSemana`, `comecaEm`, `ate` e `semFim`.

---

## 5. Sem emojis nos componentes (pedido do usuário)

Novos ícones no `AppIcon`, todos SVG Feather/Lucide: `clock`, `tag`, `weight`, `alert`, `check`, `chevronDown`, `chevronUp` e `chevronRight`. As três setas usam um `case` só, com um mapa de paths, para não repetir o `<Svg>` três vezes.

| Onde | Antes | Depois |
|---|---|---|
| Avatar da lista e da ficha | 🐮 repetido em 2 arquivos | Componente `AnimalAvatar` usado nos dois. A vaquinha 🐮 continua, a pedido do usuário (é a exceção da regra) |
| Peso / alerta no `AnimalCard` | ⚖ / ⚠ | `weight` / `alert` |
| Trilha de doses | ✓ | `check` |
| Fechar do `FormModal` | ✕ | `x` |
| `DateField`, `CollapsibleSection`, menu Adicionar | ▾ ▴ › | setas SVG |

Ainda há emojis fora destas telas, que não mexi para não sair do escopo: a tab bar (`app/(tabs)/_layout.tsx`), `HomeScreen`, `MapaScreen`, o 🔔 e o ✓ do `Header`, o `InfoBanner`, o `AnimalPicker`, e o `LinhaDoTempo` e o `ProximosCard`, que hoje não aparecem na ficha.

---

## 6. Arquivos

**Novos:** `components/tratamento/{PeriodoDoTratamento,TrilhaDeDoses,ProximaDoseCard}.tsx`, `components/AnimalAvatar.tsx`, `migrations/0009_tratamentos_observacoes.sql` e o snapshot dela.

**Renomeados:** `ReproducaoCard` → `ReproducaoSecao`, `OutrosRegistrosMenu` → `AdicionarRegistroMenu`, `services/resumoTratamento` → `services/agendaEmEdicao`.

**Alterados:** `schema.ts`, `data/tratamentos.ts`, `services/doses.ts`, `dtos/novoTratamento.dto.ts`, `useNovoTratamentoForm.ts`, `NovoTratamentoForm.tsx`, `TratamentoAtivoCard.tsx`, `FichaResumo.tsx`, `AnimalCard.tsx`, `ResumoAnimalCard.tsx`, `RebanhoScreen.tsx`, `AnimalDetalheScreen.tsx`, `RegistroForm.tsx` (import), `AppIcon.tsx`, `MilkAmount.tsx`, `DateField.tsx`, `TimeWheelPicker.tsx`, `CollapsibleSection.tsx`, `FormModal.tsx`, `HomeScreen.tsx` (label do horário), `__tests__/doses.test.ts`, `__tests__/regras.test.ts` (fixture com `observacoes`).

**Apagados:** `code-review/front-end.md` e `code-review/back-end.md`, a pedido do usuário.

---

## 7. Cadastro: "Já pariu?" vira o campo "Crias"

O interruptor "Já pariu?" do modal Novo Animal virou um campo numérico, "Crias": quantas crias ela teve antes de entrar no app. Ele só aparece para fêmea adulta, a mesma regra que valia para o interruptor.

```ts
// src/database/schema.ts (migration 0010_animais_crias_anteriores, gerada pelo drizzle-kit)
criasAnteriores: integer('crias_anteriores').notNull().default(0),
```

```ts
// useNovoAnimalForm.ts
const criasAnteriores = mostrarCrias && values.crias ? Number(values.crias) : 0;
...
criasAnteriores,
jaPariu: criasAnteriores > 0,
```

**Por quê:**
- O número precisa ser guardado para aparecer na ficha e na lista. As crias que nasceram antes do app não são cadastradas como animal, então contar só por `mae_id` daria 0.
- A coluna `ja_pariu` continua existindo e passa a ser derivada das crias: teve cria, é vaca (Embrapa). Assim o `calcularFase` e os animais já cadastrados não mudam.
- O total exibido soma as crias cadastradas com ela como mãe e as `criasAnteriores`. Na lista é `AnimalComFase.crias` (`useRebanho`), na ficha é o campo novo `FichaAnimal.totalCrias` (`useFichaAnimal`). O `FichaResumo` continua só exibindo.

Teste novo em `__tests__/persistence.test.ts`: `crias_anteriores` começa em 0 e o `createAnimal` grava o valor.

---

## 8. Ficha: separação entre tratamentos

Com mais de um tratamento em andamento, um bloco emendava no outro e não dava para ver onde cada um começava.

- O componente novo `TratamentosSecao` tem o título "Tratamentos", com um selo da contagem ("2 em andamento"), e põe uma linha divisória entre um tratamento e outro. Segue o padrão da `ReproducaoSecao`: título e conteúdo direto na tela, sem card.
- O `TratamentoAtivoCard` ganhou uma faixa verde de 4px à esquerda do nome do remédio, que marca o início de cada bloco.
- Sem tratamento, aparece o texto "Nenhum tratamento em andamento." no lugar do `EmptyState` em card, no mesmo estilo do "Nenhuma cobertura em aberto." da reprodução.
- O `AnimalDetalheScreen` agora só chama `<TratamentosSecao ativos={ativos} />`. O loop e o estado vazio ficam na seção.
