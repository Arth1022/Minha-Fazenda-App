# Code review · Back-end

## Sprint 1 · Notificações

Módulo de notificações **locais** (sem servidor), reutilizável por qualquer feature: permissão, canais do Android, agendamento por data ou recorrente, cancelamento, listagem, toque na notificação e vínculo notificação↔registro no banco. Já atende os lembretes do animal (contrato `Lembrete`) e o lembrete diário da ordenha. **Não integrei com nenhuma tela**: as funções ficam prontas para o front chamar.

Tudo fica em `src/services/notificacoes/`; telas e features importam de `@/services/notificacoes`.

> **Versão do Expo:** o projeto está no **SDK 58** (`expo 58.0.19`, `expo-notifications 58.1.6`), não no 57 que o `AGENTS.md` cita. Segui a doc da v58: https://docs.expo.dev/versions/v58.0.0/sdk/notifications/

---

### 1. Biblioteca: expo-notifications

| | expo-notifications | @notifee/react-native | react-native-notify-kit (fork do Notifee) |
|---|---|---|---|
| Versão / último release | 58.1.6 · out/2026 | 9.1.8 · **dez/2024** | 10.9.0 · out/2026 |
| Tamanho (unpacked, npm) | 1,54 MB | **0,92 MB** | 2,65 MB |
| Downloads na semana (npm, 16–22/10/2026) | **4,17 mi** | 228 mil | 38 mil |
| Funciona no Expo Go | sim (notificação local) | não | não |
| Já instalada no projeto | **sim** | não | não |

- **Mais leve:** o Notifee (0,92 MB). Mas está sem release desde dez/2024. Um artigo de terceiros diz que o repositório foi arquivado em abr/2026 e indica o fork `react-native-notify-kit`. Não consegui confirmar o arquivamento no GitHub. O fork é o maior dos três.
- **Mais popular:** o expo-notifications, com cerca de 18× os downloads do Notifee.
- **Venceu o expo-notifications.** É mantido pelo Expo no mesmo ciclo do SDK 58, já estava no `package.json` (custo extra zero), funciona no Expo Go e cobre tudo o que o app precisa: data única, diário, semanal, canais, permissão e toque.
- **Trade-off:** o Notifee/fork tem recursos que não usamos: full-screen intent, foreground service, barra de progresso e estilos ricos. Se algum dia precisarmos deles, só o fork resolve.

---

### 2. Banco: vínculo notificação ↔ registro

`src/database/schema.ts`. A migration `0004_notificacoes_agendadas.sql` foi gerada com `npx drizzle-kit generate`, sem SQL escrito à mão.

```ts
export const ENTIDADES_NOTIFICACAO = ['animal', 'ordenha'] as const;

export const notificacoesAgendadas = sqliteTable(
  'notificacoes_agendadas',
  {
    /** O mesmo identificador usado no agendamento do expo-notifications */
    id: id(),
    entidade: text('entidade', { enum: ENTIDADES_NOTIFICACAO }).notNull(),
    /** Id do animal ou período da ordenha ('manha', 'tarde', 'noite') */
    entidadeId: text('entidade_id').notNull(),
    /** Data do disparo; null nas recorrentes (ex.: ordenha diária) */
    disparaEm: integer('dispara_em', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (table) => [
    index('notificacoes_agendadas_entidade_idx').on(table.entidade, table.entidadeId),
  ]
);
```

```sql
CREATE TABLE `notificacoes_agendadas` (
	`id` text PRIMARY KEY NOT NULL,
	`entidade` text NOT NULL,
	`entidade_id` text NOT NULL,
	`dispara_em` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE INDEX `notificacoes_agendadas_entidade_idx` ON `notificacoes_agendadas` (`entidade`,`entidade_id`);
```

**O que foi feito.** Cada notificação agendada pelo módulo ganha uma linha. O `id` da linha é o mesmo identificador passado ao `scheduleNotificationAsync`. Assim, "cancelar tudo do animal X" vira uma consulta simples seguida de `cancelScheduledNotificationAsync` para cada id.

**Por quê.**
- **Entidade polimórfica, sem chave estrangeira.** A mesma tabela atende animal e turno de ordenha. Um `ON DELETE CASCADE` apagaria a linha, mas a notificação continuaria agendada no aparelho, e aí não haveria mais como achá-la para cancelar. Por isso a regra é: cancelar as notificações antes de apagar o registro. O teste "lembretes cancelados mesmo depois de o animal sair do banco" cobre esse caso.
- **Segue as convenções do schema:** id UUID gerado no app, datas em epoch ms e `created_at`/`updated_at`.
- **Alternativa descartada:** guardar o vínculo só no `content.data` da notificação. Não precisaria de tabela, mas o líder pediu o vínculo persistido. Com a tabela, o front também pode usar `useLiveQuery` sobre `notificacoesDe(...)`.

---

### 3. Gatilhos: quando a notificação dispara

`src/services/notificacoes/gatilhos.ts` (arquivo inteiro):

```ts
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = domingo (padrão do expo-notifications)

export type Quando =
  | { tipo: 'data'; data: Date }
  | { tipo: 'diario'; horario: string }      // "HH:mm"
  | { tipo: 'semanal'; diaSemana: DiaSemana; horario: string };

export function parseHorario(horario: string): Horario | null {
  const match = horario.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hora: Number(match[1]), minuto: Number(match[2]) };
}

export function montarGatilho(quando: Quando, channelId: string, agora = new Date())
  : SchedulableNotificationTriggerInput | null {
  switch (quando.tipo) {
    case 'data':
      if (quando.data.getTime() <= agora.getTime()) return null;
      return { type: SchedulableTriggerInputTypes.DATE, date: quando.data, channelId };
    case 'diario':
      return { type: SchedulableTriggerInputTypes.DAILY, channelId, ...horarioDe(quando.horario) };
    case 'semanal':
      return { type: SchedulableTriggerInputTypes.WEEKLY, channelId, weekday: quando.diaSemana,
               ...horarioDe(quando.horario) };
  }
}
```

**O que foi feito.** Um tipo do domínio (`Quando`) traduzido para o gatilho do expo-notifications. É uma função pura e testável.

**Por quê.**
- **Recomendações da doc v58 seguidas:**
  - usar objetos com `type: SchedulableTriggerInputTypes.*`;
  - passar `channelId` no próprio gatilho, que é como o Android liga a notificação ao canal;
  - lembrar que o `weekday` vai de 1 (domingo) a 7.
- **Data no passado retorna `null`** em vez de agendar: o Android descartaria a notificação de qualquer forma (`ExpoSchedulingDelegate`: "will not trigger in the future, removing").
- **Horário inválido nos recorrentes lança erro.** É erro de programação e não deve ser engolido.
- **Só data única, diário e semanal.** O app só precisa desses três hoje. Mensal e anual existem na lib e entram com uma linha cada, se aparecer o caso.

---

### 4. Canais do Android

`src/services/notificacoes/canais.ts`:

```ts
export const CANAIS = {
  ordenha:    { nome: 'Ordenha',          descricao: 'Lembretes dos horários de ordenha' },
  saude:      { nome: 'Saúde do rebanho', descricao: 'Doses de tratamento, vacinas e fim de carência' },
  reproducao: { nome: 'Reprodução',       descricao: 'Partos previstos e acompanhamento reprodutivo' },
} as const;

export async function registrarCanais(): Promise<void> {
  if (plataforma !== 'android') return;
  await Promise.all(Object.entries(CANAIS).map(([id, canal]) =>
    setNotificationChannelAsync(id, { name: canal.nome, description: canal.descricao,
                                      importance: AndroidImportance.HIGH })));
}
```

**O que foi feito.** Um ponto único de registro dos canais. Os três canais permitem ao produtor silenciar, por exemplo, só a ordenha nas configurações do aparelho.

**Por quê (doc v58).**
- **"No Android 13+ o pedido de permissão só aparece depois que existe um canal."** Por isso `pedirPermissaoNotificacoes()` registra os canais antes de pedir.
- **"Depois de criado, só nome e descrição podem mudar."** O comentário no arquivo avisa: para mudar a importância de um canal, é preciso criar um id novo.
- **`HIGH`** mostra o aviso no topo da tela (heads-up). É o que um lembrete de dose ou de ordenha pede.

---

### 5. Service genérico (camada sobre o expo-notifications)

`src/services/notificacoes/notificacoes.ts`. Trechos principais:

```ts
export async function configurarNotificacoes(): Promise<void> {
  if (!notificacoesDisponiveis) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
    }),
  });
  await registrarCanais();
}

function statusDe(resposta: Notifications.NotificationPermissionsStatus): StatusPermissao {
  // No iOS a doc manda olhar ios.status: "provisória" também entrega a notificação
  const ios = resposta.ios?.status;
  if (resposta.granted || ios === AUTHORIZED || ios === PROVISIONAL || ios === EPHEMERAL) return 'concedida';
  return resposta.canAskAgain ? 'pendente' : 'negada';
}

export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  if (!notificacoesDisponiveis) return false;
  const atual = statusDe(await Notifications.getPermissionsAsync());
  if (atual !== 'pendente') return atual === 'concedida';
  await registrarCanais(); // Android 13+: o pedido só aparece depois que existe ao menos um canal
  return statusDe(await Notifications.requestPermissionsAsync()) === 'concedida';
}

export async function agendarNotificacao(nova: NovaNotificacao, agora = new Date()) {
  if (!notificacoesDisponiveis) return null;
  const trigger = montarGatilho(nova.quando, nova.canal, agora);
  if (!trigger) return null;
  return Notifications.scheduleNotificationAsync({
    identifier: nova.id,
    content: { title: nova.titulo, body: nova.mensagem ?? null, data: { ...nova.dados, url: nova.url } },
    trigger,
  });
}

export function aoTocarNotificacao(callback: (dados: DadosNotificacao) => void): () => void {
  // trata o toque que abriu o app fechado (getLastNotificationResponse + clear)
  // e os toques com o app aberto (addNotificationResponseReceivedListener)
}
```

**O que foi feito.** Uma camada fina, em português, sobre o expo-notifications. Cobre:
- handler (notificação aparece também com o app aberto);
- permissão em três estados: `concedida`, `pendente` e `negada` (`negada` = só pelas configurações do aparelho);
- agendar, cancelar, cancelar todas e listar;
- toque na notificação.

**Por quê (doc v58).**
- **"Agendar não garante exibição; é preciso um handler."** Daí o `configurarNotificacoes()`. Uso `shouldShowBanner`/`shouldShowList`, porque o `shouldShowAlert` está deprecated.
- **iOS: "verifique `ios.status`, não o `status` da raiz".** O estado provisório conta como concedido.
- **O pedido de permissão não é automático:** o app só pede no primeiro tratamento ou cobertura registrado, como o líder definiu. Se a permissão já foi concedida ou negada de vez, `pedirPermissaoNotificacoes()` não mostra o pedido de novo.
- **Toque na notificação:** a notificação leva uma `url` no `data`, que o front passa ao `router.push`. É o padrão da doc para o expo-router. Uso `getLastNotificationResponse`/`clearLastNotificationResponse` (as versões `...Async` estão deprecated na v58). Limpar a resposta evita que o mesmo toque seja tratado de novo quando a tela remonta.
- **Web:** a doc lista só Android e iOS, então na web tudo vira no-op. A plataforma vem de `plataforma.ts` / `.native.ts` / `.web.ts`, o mesmo padrão de `id.ts` / `id.native.ts` do banco. Isso também deixa os testes em Node rodarem sem carregar o `react-native`.

**Alarme exato: LIBERADO pelo usuário (atualização)**

- **O que mudou:**
  - `SCHEDULE_EXACT_ALARM` declarada no `app.json` (`android.permissions`) e no `AndroidManifest.xml`;
  - flag removida;
  - `alarmeExatoPermitido()` e `pedirAlarmeExato()` expostas para o front.
- **Sem a permissão:** a lib cai sozinha no agendamento inexato (`setAndAllowWhileIdle`, no `ExpoSchedulingDelegate`), sem quebrar. Com ela, o mesmo `bestEffort` vira `setExactAndAllowWhileIdle`.
- **Reaplicação dos agendamentos.** A lib só reagenda no boot e na atualização do app. A doc do Android diz que, quando a permissão é revogada, "your app stops, and all future exact alarms are canceled", e que, quando é concedida, o app deve reagendar. Por isso o módulo reaplica os agendamentos em dois momentos:
  - em `configurarNotificacoes()`, na abertura do app;
  - em `pedirAlarmeExato()`, quando a permissão é concedida.

  Datas já vencidas, mas ainda não entregues, ficam como estão. Reagendá-las faria o Android descartar a notificação.
- **Por que `bestEffort` e não `alarmClock`:** o `alarmClock` mostra o ícone de alarme na barra de status até a entrega. Com a ordenha diária, o ícone ficaria lá o tempo todo.
- **⚠️ Ponto de atenção para a publicação na Google Play:**
  - a doc do Android diz que alarme exato é para quando "a user-facing function requires precisely-timed actions";
  - a permissão não vem concedida em instalações novas (Android 13+) e vem negada em restauração de backup no Android 14;
  - a revisão da Play pode questionar o uso. A justificativa é: lembretes de dose e ordenha com horário definido pelo usuário.
- **Para voltar atrás**, se a Play recusar: tirar a permissão do `app.json` e do manifest e refazer o build. O código continua funcionando, com entrega inexata. Só não se deve chamar `pedirAlarmeExato()`, porque a lib lança erro quando a permissão não está declarada.

```ts
export async function pedirAlarmeExato(agora = new Date()): Promise<boolean> {
  if (plataforma !== 'android') return notificacoesDisponiveis;
  if (await alarmeExatoPermitido()) return true;
  const { granted } = await Notifications.requestExactAlarmPermissionsAsync();
  if (granted) await reaplicarAgendamentos(agora);
  return granted;
}
```

---

### 6. Lembretes: animal e ordenha

`src/services/notificacoes/vinculos.ts` (genérico) e `lembretes.ts` (contrato do rebanho e ordenha):

```ts
export async function substituirNotificacoesDe(vinculo: Vinculo, novas: Omit<NovaNotificacao, 'id'>[], agora = new Date()) {
  // Valida os horários antes de cancelar, para um erro não apagar as antigas
  novas.forEach((nova) => montarGatilho(nova.quando, nova.canal, agora));
  await cancelarNotificacoesDe(vinculo);

  const agendadas: string[] = [];
  for (const nova of novas) {
    const id = await agendarNotificacao({ ...nova, id: newId() }, agora);
    if (!id) continue;
    try {
      await db.insert(notificacoesAgendadas).values({ id, ...vinculo,
        disparaEm: nova.quando.tipo === 'data' ? nova.quando.data : null });
    } catch (error) {
      await cancelarNotificacoes([id]); // Sem vínculo não daria para cancelar depois
      throw error;
    }
    agendadas.push(id);
  }
  return agendadas;
}
```

```ts
export interface Lembrete {
  id: string; tipo: 'dose' | 'fim_carencia' | 'parto' | 'vacina';
  data: Date; titulo: string; animalId: string;
}

export const HORARIO_PADRAO_LEMBRETE = '07:00';

export function reagendarLembretesDoAnimal(animalId: string, lembretes: Lembrete[], agora = new Date()) {
  const doAnimal = lembretes.filter((l) => l.animalId === animalId);
  return substituirNotificacoesDe({ entidade: 'animal', entidadeId: animalId },
                                  doAnimal.map(notificacaoDoLembrete), agora);
}

export async function reagendarLembreteOrdenha(periodo: PeriodoOrdenha, horario: string | null) {
  // diário no horário "HH:mm" (o horarioNotificacao da ordenha); null desliga
}
```

**O que foi feito.**
- **`substituirNotificacoesDe`** é a operação central: cancela as notificações antigas do registro, agenda as novas e grava o vínculo.
- **`reagendarLembretesDoAnimal`** recebe a lista de `Lembrete` (o contrato do líder) e passa por essa operação. As notificações seguem esta regra:

  | Tipo | Canal |
  |---|---|
  | dose, fim_carencia, vacina | `saude` |
  | parto | `reproducao` |

  Todas abrem a ficha `/animal/:id` ao tocar.
- **`reagendarLembreteOrdenha`** faz o mesmo para o turno de ordenha, com gatilho diário.

**Por quê.**
- **`calcularLembretes` ainda não existe** (fica para a próxima mini sprint). Por isso `reagendarLembretesDoAnimal` recebe a lista pronta. Quando a função existir, a chamada fica `reagendarLembretesDoAnimal(id, calcularLembretes(animal, contexto, hoje))`. A tela e as notificações usam a mesma fonte.
- **Datas sem hora (meia-noite) avisam às 07:00.** Previsão de parto e fim de carência são calculados à meia-noite (`adicionarDias`), e ninguém quer ser acordado à 00:00. Datas com hora (ex.: próxima dose às 14:30) avisam na própria hora.
- **Valida antes de cancelar.** Um horário inválido não apaga o lembrete que já estava agendado. O teste da ordenha cobre esse caso.
- **Agenda no aparelho e depois grava a linha.** Se a gravação falhar, desfaz o agendamento para não deixar notificação órfã.
- **`sincronizarVinculos()`**, chamada na abertura do app, apaga os vínculos de notificações que o aparelho já disparou e descartou. Também cobre o banco restaurado por backup sem os agendamentos.
- **Regras de domínio fora daqui:** nada de cálculo de dose, carência ou parto entrou neste módulo, como o líder pediu.

---

### 7. Configuração e testes

- **`app.json`:** entrou o plugin `["expo-notifications", { "color": "#1B5E20" }]`, com a cor da marca, a mesma do splash. Não configurei `icon`: o `android-icon-monochrome.png` atual ainda é o placeholder do template do Expo, e o design precisa entregar um PNG branco com transparência (96×96, segundo a doc). As permissões `POST_NOTIFICATIONS` e `RECEIVE_BOOT_COMPLETED` já estão no `AndroidManifest`, e a doc diz que o `RECEIVE_BOOT_COMPLETED` é adicionado automaticamente. O plugin só vale depois de um novo build nativo (`npx expo prebuild` / `expo run:android`). O módulo funciona sem ele, só sem a cor.
- **Testes** (`__tests__/notificacoes.test.ts`, `npm run test:notificacoes`, incluído no `npm test`):
  - Rodam em Node com o mesmo esquema dos testes de banco: o `tsconfig.test.json` aponta `expo-notifications` para um fake em memória (`__tests__/support/expo-notifications.ts`) e `@/database` para o sql.js com as migrations reais.
  - Cobrem gatilhos, permissão (inclusive iOS provisória), canais antes do pedido, agendamento, vínculo no banco, reagendamento, saída do animal, ordenha, sincronização e toque.
  - **Trade-off:** o fake não prova o comportamento nativo (horário real de entrega, Doze). Isso precisa de um teste manual no aparelho.

---

---

## Sprint 1 · Regra de fase (literatura Embrapa)

`src/features/rebanho/services/fase.ts`:

```ts
if (sexo === 'F') {
  if (jaPariu || ultimoParto) return 'vaca';
  if (idade !== null && idade < IDADE_FIM_CRIA_MESES) return 'bezerra';
  return 'novilha';
}
```

**O que foi feito.**
- **Regra da fêmea:**
  - bezerra: menos de 12 meses;
  - novilha: não pariu;
  - vaca: já pariu.

  A troca para vaca acontece só pelo parto. A regra antiga dos 24 meses saiu.
- **Coluna nova:** `animais.ja_pariu` (boolean, não nulo, padrão `false`), na migration `0005_animais_ja_pariu.sql` (drizzle-kit), sem backfill.
- **Quando a fêmea é vaca:** `ja_pariu = true` **ou** cria registrada (o `ultimoParto`, que vem de `ultimosPartos()`).
- **`calcularFase`:** ganhou `jaPariu?: boolean` em `DadosFase`. O campo é opcional para não quebrar quem já chama a função.
- **`createAnimal`:** aceita o campo, porque recebe `NovoAnimal`. O futuro `updateAnimal` também vai aceitar, se receber `Partial<NovoAnimal>`.
- **Fêmea sem idade e sem parto:** agora é novilha (adulta que não pariu). Antes era vaca.
- **`IDADE_ADULTO_MESES`:** agora vale só para o macho virar touro. Nenhum outro arquivo usa a constante. `emIdadeReprodutiva` e `calcularSituacaoLeite` não mudaram.
- **Seed:** a Mimosa (comprada) continua vaca, porque tem crias registradas.

**Fontes (lidas no original).**
- **Embrapa Gado de Corte, Glossário Eletrônico (Termos Gado de Corte):**
  - nº 15, Bezerro: "Bovino entre 0 e 12 meses de idade";
  - nº 126, Novilha: "Fêmea bovina, normalmente jovem, que ainda não pariu sua primeira cria";
  - nº 127, Garrote: "Macho bovino entre 13 e 24 meses de idade";
  - nº 183, Touro: "Bovino (macho) inteiro, não castrado, que se usa como reprodutor".

  https://www.embrapa.br/documents/1355108/77023402/Gloss%C3%A1rio+Eletr%C3%B4nico+-+Termos+Gado+de+Corte/61350fca-bc56-2ab2-d0af-0e2d70c1d590
- **Embrapa, Programa Balde Cheio, Manual Roda da Reprodução 2.0:**
  - "bezerra: fêmea até 12 meses de idade";
  - "novilha aberta: fêmea com mais de 12 meses de idade";
  - "novilha coberta: fêmea que ainda não pariu";
  - "animais que já pariram (vacas)".

  https://www.embrapa.br/documents/1355045/17319618/Manual+Roda+da+Reprodu%C3%A7%C3%A3o+2.0/bbf8ef86-8f69-5990-ba95-febba9182943
- **MAPA:** não encontrei definição de categoria por nome. Usei as duas fontes da Embrapa.

**Macho: só relatório, nada foi mudado.**
- bezerro (até 12 meses) e garrote (13 a 24 meses) batem com o glossário da Embrapa.
- "Touro" na literatura é definido pela função (macho inteiro, reprodutor), não pela idade. O macho adulto castrado é "boi". O IBGE chama de "boi" todo macho com 2 anos ou mais, touro incluído. Então "≥ 24 meses = touro" é uma simplificação: só fica correta se o app não tiver machos castrados. Se tiver, falta um campo "castrado" e a categoria "boi".

**Pendências para o front.**
- `useRebanho.ts` e `RebanhoScreen.tsx` ainda não passam `jaPariu: animal.jaPariu` para o `calcularFase`. Enquanto isso, uma vaca comprada com `ja_pariu` aparece como novilha na lista. Basta acrescentar uma linha em cada arquivo.
- Vaca com `ja_pariu` e sem parto registrado aparece como "seca" no leite, como já acontecia com vaca sem parto.

---

### Arquivos

**Novos**
- `src/services/notificacoes/index.ts`: API pública do módulo
- `src/services/notificacoes/notificacoes.ts`: camada sobre o expo-notifications
- `src/services/notificacoes/gatilhos.ts`: `Quando` → gatilho (puro)
- `src/services/notificacoes/canais.ts`: canais do Android
- `src/services/notificacoes/vinculos.ts`: vínculo notificação↔registro (Drizzle)
- `src/services/notificacoes/lembretes.ts`: contrato `Lembrete`, animal e ordenha
- `src/services/notificacoes/plataforma.ts`, `plataforma.native.ts`, `plataforma.web.ts`
- `src/database/migrations/0004_notificacoes_agendadas.sql`, `src/database/migrations/meta/0004_snapshot.json` (drizzle-kit)
- `__tests__/notificacoes.test.ts`
- `__tests__/support/expo-notifications.ts`: fake para os testes em Node
- `src/database/migrations/0005_animais_ja_pariu.sql`, `src/database/migrations/meta/0005_snapshot.json` (drizzle-kit)
- `code-review/back-end.md`: este arquivo

**Alterados**
- `src/database/schema.ts`: tabela `notificacoes_agendadas`, coluna `animais.ja_pariu`
- `src/features/rebanho/services/fase.ts`: regra de fase pela literatura
- `__tests__/regras.test.ts`, `__tests__/persistence.test.ts`: testes de fase e de `ja_pariu`
- `android/app/src/main/AndroidManifest.xml`: `SCHEDULE_EXACT_ALARM`
- `src/database/migrations/migrations.js`, `src/database/migrations/meta/_journal.json` (drizzle-kit)
- `tsconfig.test.json`: path do fake de `expo-notifications`
- `package.json`: script `test:notificacoes`, incluído no `test`
- `app.json`: plugin `expo-notifications` e permissão `SCHEDULE_EXACT_ALARM`

### Saída dos testes

`npm test` (exit 0) roda as três suítes: regras, banco e notificações. São 120 checks.

```
=========================================================
🐄 MINHA FAZENDA - REGRAS DO REBANHO
=========================================================
✅ fêmea com 11 meses é bezerra
✅ fêmea com 12 meses é novilha
✅ fêmea com 23 meses sem parto é novilha
✅ fêmea com cria registrada é vaca
✅ fêmea com ja_pariu = true é vaca (comprada já parida)
✅ fêmea de 30 meses sem parto e sem ja_pariu é novilha
✅ ja_pariu = false não muda a regra
✅ o parto decide antes da idade
✅ fêmea sem idade e sem parto é novilha (adulta que não pariu)
✅ fêmea sem idade que já pariu é vaca
✅ macho com 6 meses é bezerro
✅ macho com 18 meses é garrote
✅ macho com 30 meses é touro
✅ macho sem idade é tratado como adulto
✅ vaca com parto há menos de 305 dias está em lactação
✅ vaca com parto há mais de 305 dias está seca
✅ vaca sem parto registrado está seca
✅ lactação não aparece em fazenda de corte
✅ lactação só vale para vaca
✅ fêmea reprodutiva: novilha sim, bezerra não
✅ macho não registra parto
✅ idade em meses completos (ainda não fez 1 mês)
✅ idade em meses completos (fez 1 mês hoje)
✅ idade "8 meses"
✅ idade "2 anos"
✅ idade "1 ano e 3 meses"
✅ peso atual é a última pesagem
✅ ganho desde a pesagem anterior (+25,5 kg em 30 dias)
✅ primeira pesagem não tem ganho
✅ sem pesagens não há peso atual
✅ previsão de parto = cobertura + 283 dias
✅ carência usa o maior prazo (carne 10 dias)
✅ carência no leite é ignorada em fazenda de corte
✅ carência no leite conta em fazenda de leite
✅ carência conta a partir da última aplicação
✅ carência vencida não gera alerta
✅ alerta mostra a carência mais longa ainda ativa
✅ último dia da carência (hoje) ainda está em carência
🎉 TODAS AS REGRAS PASSARAM!
=========================================================
🌾 MINHA FAZENDA - TESTE DE PERSISTÊNCIA (Drizzle + SQLite)
=========================================================
✅ tipo de produção gravado e alterado numa única linha
✅ id do animal é UUID v4 (2beec7de-191e-488d-8da6-644e07d4e1aa)
✅ padrões: fêmea, ativa, nascimento exato
✅ created_at / updated_at preenchidos como Date
✅ animalPorId encontra o animal com os campos mapeados
✅ ja_pariu começa false (sem backfill por idade)
✅ createAnimal grava ja_pariu (vaca comprada já parida)
✅ comprada com ja_pariu é vaca sem cria registrada
✅ cobertura grava a previsão de parto (+283 dias)
✅ parto cria o bezerro com mãe, origem e nascimento preenchidos
✅ bezerro nasce no lote da mãe
✅ parto fecha a cobertura em aberto da vaca
✅ crias = animais com mae_id da vaca
✅ último parto de cada mãe sai do nascimento da cria
✅ fêmea com cria registrada é vaca sem ja_pariu (caso da Mimosa do seed)
✅ relações animal → crias, lote e reproduções
✅ pesagens da mais recente para a mais antiga
✅ tratamento começa sem dias confirmados
✅ marcar dias mantém a lista ordenada
✅ update renova updated_at e preserva created_at
✅ mesmo remédio (sem acento/maiúsculas) traz dose e carências do último uso
✅ remédio nunca usado não preenche nada
✅ lista tratamentos com carência para os alertas
✅ datas gravadas em epoch ms e arrays em JSON
✅ chave estrangeira rejeita tratamento de animal inexistente
✅ lista padrão mostra só ativos; o vendido continua gravado
✅ saída grava status, data e motivo
✅ salvarOrdenha atualiza o registro existente do turno
✅ apagar lote limpa o lote dos animais
✅ apagar a mãe mantém a cria, sem mãe
✅ apagar o animal apaga os tratamentos dele
✅ apagar o animal apaga as reproduções dele
🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!
=========================================================
🔔 MINHA FAZENDA - NOTIFICAÇÕES
=========================================================
✅ horário "HH:mm" convertido
✅ horário inválido rejeitado
✅ data futura vira gatilho de data no canal
✅ data no passado não agenda
✅ gatilho diário com hora e minuto
✅ gatilho semanal com o dia da semana
✅ horário inválido no recorrente gera erro
✅ gatilho devolvido pelo Android volta ao formato de agendamento
✅ gatilho que o módulo não agenda é ignorado
✅ handler registrado (mostra notificação com o app aberto)
✅ canais do Android registrados
✅ permissão ainda não pedida fica pendente
✅ pedido de permissão concedido
✅ canais criados antes do pedido (exigência do Android 13+)
✅ já concedida: não pede de novo
✅ negada de vez: não pede, retorna false
✅ status negada (só pelas configurações do aparelho)
✅ iOS provisória conta como concedida
✅ notificação agendada com o id informado
✅ url e dados vão no conteúdo
✅ data passada retorna null
✅ sem "Alarmes e lembretes" liberado o alarme não é exato
✅ sem alarme exato o agendamento normal continua valendo
✅ pedido negado: retorna false e não reagenda
✅ pedido concedido: retorna true
✅ concedido: reagenda as pendentes para virarem exatas
✅ reagendada com a mesma data, canal e conteúdo
✅ recorrente reagendada no mesmo horário
✅ data vencida não é reagendada (o Android a descartaria)
✅ já liberado: não pede nem reagenda de novo
✅ abertura do app reaplica os agendamentos (permissão mudada fora do app)
✅ data sem hora avisa às 07:00
✅ data com hora avisa na própria hora
✅ só os lembretes futuros do próprio animal são agendados
✅ vínculo guardado com o mesmo id do agendamento
✅ parto vai no canal de reprodução e abre a ficha
✅ dose vai no canal de saúde
✅ reagendar cancela os antigos no aparelho e no banco
✅ saída do animal cancela todos os lembretes dele
✅ lembretes de outro animal continuam
✅ ordenha: um lembrete recorrente por turno
✅ ordenha: diário no horário novo, canal ordenha
✅ ordenha: horário null desliga o lembrete
✅ ordenha: horário inválido gera erro
✅ ordenha: horário inválido não apaga o lembrete anterior
✅ sincronizar remove vínculos sem agendamento no aparelho
✅ lembretes cancelados mesmo depois de o animal sair do banco
✅ toque que abriu o app é entregue uma vez
✅ toque com o app aberto é entregue (ações extras ignoradas)
✅ listener removido no cleanup
🎉 Notificações OK.
```

**Outras verificações**
- `npx tsc --noEmit` (tsconfig do app): sem erros.
- `tsc -p tsconfig.test.json`: continua com os mesmos 8 erros que já existiam antes desta sprint, nenhum nos arquivos novos. Os erros vêm de o `@/database` dos testes não exportar o `useLiveQuery` usado pelos hooks de tela.
- **ESLint: não rodou.** O `eslint-import-resolver-typescript` falha ao carregar o binding nativo do `unrs-resolver` ("Cannot find native binding"). É um problema do `node_modules` desta máquina, não do código. Resolve com reinstalação das dependências.

### Pontos em aberto

1. **`SCHEDULE_EXACT_ALARM` liberada, com risco na publicação.**
   - **Enquanto o usuário não libera "Alarmes e lembretes"** (o padrão em instalações novas): a doc do Android diz que, no Android 12+, o alarme dispara "dentro de 1 hora" do horário. Com Doze ou economia de bateria, ele espera o aparelho sair do Doze. A doc do Expo só diz que pode chegar "later than requested". O front deve oferecer `pedirAlarmeExato()` num momento que faça sentido para o produtor (ex.: ao ligar o lembrete de ordenha).
   - **Política da Google Play:** a doc do Android diz que alarme exato é para quando "a user-facing function requires precisely-timed actions". O `SCHEDULE_EXACT_ALARM` é concedido pelo usuário. O `USE_EXACT_ALARM` (concedido automaticamente) é restrito a apps de alarme e calendário e não foi usado.
   - **Alguns fabricantes** (OEMs) ainda adiam o `setExactAndAllowWhileIdle` em alguns minutos (doc do `NotificationDelivery`).
2. **Limite do iOS:** pelo comportamento conhecido da Apple, o iOS mantém só as 64 notificações locais mais próximas. A doc do Expo não fala desse limite. Para o tamanho atual do rebanho não deve ser problema. Se o app crescer no iPhone, o agendamento precisará priorizar as mais próximas.
3. **Integração pelo front** (não feita, por escopo):
   - `configurarNotificacoes()` e `sincronizarVinculos()` na inicialização do app, depois das migrations;
   - `aoTocarNotificacao(({ url }) => url && router.push(url))` no layout raiz;
   - `pedirPermissaoNotificacoes()` no primeiro tratamento ou cobertura;
   - `cancelarLembretesDoAnimal(id)` na saída do animal;
   - `reagendarLembreteOrdenha(periodo, horarioNotificacao)` ao salvar o horário da ordenha.
4. **Ícone de notificação do Android:** falta um PNG branco com transparência vindo do design.
5. **`calcularLembretes`** fica para a próxima mini sprint. O módulo já recebe o tipo `Lembrete`.

### Resumo da API (`@/services/notificacoes`)

```ts
// Inicialização
configurarNotificacoes(): Promise<void>
sincronizarVinculos(): Promise<void>
notificacoesDisponiveis: boolean                       // false na web

// Permissão
statusPermissaoNotificacoes(): Promise<'concedida' | 'pendente' | 'negada'>
pedirPermissaoNotificacoes(): Promise<boolean>
alarmeExatoPermitido(): Promise<boolean>              // iOS sempre true
pedirAlarmeExato(agora?: Date): Promise<boolean>      // abre "Alarmes e lembretes"; se liberado, reaplica os agendamentos

// Lembretes do animal (contrato do rebanho)
type Lembrete = { id: string; tipo: 'dose' | 'fim_carencia' | 'parto' | 'vacina'; data: Date; titulo: string; animalId: string }
reagendarLembretesDoAnimal(animalId: string, lembretes: Lembrete[], agora?: Date): Promise<string[]>
cancelarLembretesDoAnimal(animalId: string): Promise<void>
HORARIO_PADRAO_LEMBRETE = '07:00'

// Ordenha
reagendarLembreteOrdenha(periodo: 'manha' | 'tarde' | 'noite', horario: string | null): Promise<void>

// Genérico com vínculo no banco
type Vinculo = { entidade: 'animal' | 'ordenha'; entidadeId: string }
substituirNotificacoesDe(vinculo: Vinculo, novas: Omit<NovaNotificacao, 'id'>[], agora?: Date): Promise<string[]>
cancelarNotificacoesDe(vinculo: Vinculo): Promise<void>
notificacoesDe(vinculo: Vinculo)                       // query Drizzle (serve no useLiveQuery)

// Genérico sem vínculo
type Quando = { tipo: 'data'; data: Date } | { tipo: 'diario'; horario: string } | { tipo: 'semanal'; diaSemana: 1..7; horario: string }
type NovaNotificacao = { id?: string; titulo: string; mensagem?: string; quando: Quando; canal: 'ordenha' | 'saude' | 'reproducao'; url?: string; dados?: Record<string, unknown> }
agendarNotificacao(nova: NovaNotificacao, agora?: Date): Promise<string | null>   // null: data passada ou web
cancelarNotificacao(id: string): Promise<void>
cancelarTodasNotificacoes(): Promise<void>
listarNotificacoesAgendadas(): Promise<{ id: string; titulo: string | null; mensagem: string | null; dados: DadosNotificacao }[]>
aoTocarNotificacao(callback: (dados: { url?: string } & Record<string, unknown>) => void): () => void
parseHorario(horario: string): { hora: number; minuto: number } | null
CANAIS                                                 // { ordenha, saude, reproducao }
```
