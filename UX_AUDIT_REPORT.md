# UX_AUDIT_REPORT — Salus (paciente)

> **Stack real:** Next.js 14 web app (não iOS/Swift como no brief). Auditoria foi feita no `src/app` voltado ao paciente. Tudo abaixo é evidência de código, não opinião.

---

## 0. Veredito em 30 segundos

**O núcleo (auth, onboarding, /dashboard, /log, /profile, /settings) está pronto e bom.** O que vaza retenção é a **periferia mockada apresentada como real**: `/plan`, `/learn`, `/shop`, `/grocery`, `/health-data` e `/meal-result` mostram dados hardcoded — vários em **inglês** num app PT-BR. O paciente que clica fora do dashboard descobre em < 60s que metade do app é placeholder. Isso é o killer #1.

**Killer #2:** `/meal-result` ignora a refeição que o usuário acabou de logar e exibe `mockResult`. Loop principal quebrado.

**Killer #3:** zero canal de mensagem in-app com o nutricionista. Após `/aceitar-convite`, o paciente espera conversar e descobre que é só WhatsApp (gated).

---

## 1. Inventário de telas (paciente)

### Reais e funcionais
| Rota | Arquivo | Estado |
|---|---|---|
| `/` (landing) | [src/app/page.tsx](src/app/page.tsx) | ✅ |
| `/auth/login` `/signup` `/forgot-password` | [src/app/auth/](src/app/auth/) | ✅ |
| `/onboarding` | [src/app/onboarding/page.tsx](src/app/onboarding/page.tsx) | ✅ (PDF Opus 4.7 acabei de adicionar) |
| `/aceitar-convite` `/aceitar-convite/confirmar` | [src/app/aceitar-convite/](src/app/aceitar-convite/) | ✅ |
| `/dashboard` | [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx) | ✅ (8 queries em paralelo, goals adaptativas) |
| `/log` | [src/app/(app)/log/page.tsx](src/app/(app)/log/page.tsx) | ✅ (foto/texto/restaurante) |
| `/insights` | [src/app/(app)/insights/page.tsx](src/app/(app)/insights/page.tsx) | ✅ (charts reais 30d) |
| `/profile` | [src/app/(app)/profile/page.tsx](src/app/(app)/profile/page.tsx) | ✅ |
| `/settings` `/settings/whatsapp` | [src/app/(app)/settings/](src/app/(app)/settings/) | ✅ (whatsapp gated por plano) |

### Mock / placeholder apresentado como real
| Rota | Arquivo | Problema | P |
|---|---|---|---|
| `/meal-result` | [src/app/(app)/meal-result/page.tsx#L57-60](src/app/(app)/meal-result/page.tsx#L57-L60) | `mockResult` hardcoded em vez da refeição recém-logada | **P0** |
| `/grocery` | [src/app/(app)/grocery/page.tsx#L26-91](src/app/(app)/grocery/page.tsx#L26-L91) | `MOCK_DATA` em **inglês** ("Mixed Berries", "Salmon") | **P0** |
| `/plan` | [src/app/(app)/plan/page.tsx#L21-30](src/app/(app)/plan/page.tsx#L21-L30) | Mock meals em inglês ("Greek Yogurt Parfait") | **P0** |
| `/learn` | [src/app/(app)/learn/page.tsx#L7-50](src/app/(app)/learn/page.tsx#L7-L50) | Artigos em inglês, sem detalhe clicável | **P0** |
| `/health-data` | [src/app/(app)/health-data/page.tsx#L16-47](src/app/(app)/health-data/page.tsx#L16-L47) | 6 botões "Conectar" → `toast.info("...em breve")` | **P0** |
| `/shop` | [src/app/(app)/shop/page.tsx](src/app/(app)/shop/page.tsx) | Suplementos hardcoded, checkout fake | **P1** |
| `/progress` | [src/app/(app)/progress/page.tsx#L9-28](src/app/(app)/progress/page.tsx#L9-L28) | `weeklyData`/`victories` mockados (BodyTracker é real) | **P1** |

### Não existe (e devia)
| Rota faltando | Justificativa |
|---|---|
| `/chat` ou `/mensagens` | Paciente vincula nutri em `/aceitar-convite` mas não tem nenhum canal in-app — só WhatsApp gated |

---

## 2. Fluxos críticos (taps reais)

### 2.1 Onboarding
1. Signup (3 inputs + termos + role) → 5–6 taps
2. /onboarding role-picker → 1 tap
3. Perfil (5 campos) → 5+ taps
4. Objetivos → 1–8 taps
5. Dieta + alergias → 1–4 taps
6. Exames (manual ou PDF agora) → 0–8 taps
7. Concluir → 1 tap → /dashboard

**Total: 18–35 taps · 45–120s**
- ⚠️ Sem skeleton no bootstrap ([src/app/onboarding/page.tsx:243-247](src/app/onboarding/page.tsx#L243-L247))
- ⚠️ `triggerPersonalizedGoals()` fire-and-forget; falha silencia ([src/app/onboarding/page.tsx:199-207](src/app/onboarding/page.tsx#L199-L207))
- ⚠️ Sem persist em localStorage — refresh = perde tudo
- ⚠️ `res.json().catch(() => ({}))` sem `res.ok` ([src/app/onboarding/page.tsx:163](src/app/onboarding/page.tsx#L163))

### 2.2 Log de refeição via foto/IA
1. /log → "Foto" → 1 tap
2. Capturar/upload → 1–2 taps
3. (opcional) caption → 1 tap
4. "Analisar prato" → 1 tap → ~8–12s espera
5. "Salvar" → 1 tap → ~2s

**Total: 5–6 taps · 12–15s**
- ⚠️ Spinner sem tempo estimado nem feedback progressivo ([src/app/(app)/log/page.tsx:647-659](src/app/(app)/log/page.tsx#L647-L659))
- ⚠️ Sem AbortController em [src/lib/ai-client.ts](src/lib/ai-client.ts) — IA pode travar 2min sem feedback
- ⚠️ Falha sem retry ([src/app/(app)/log/page.tsx:499-512](src/app/(app)/log/page.tsx#L499-L512))
- ⚠️ Fluxo termina, mas redireciona pra /meal-result que mostra MOCK (P0 acima)

### 2.3 Log manual (texto)
**Total: 4–10 taps · 7–12s** — funciona; sem botão "logar igual ontem"

### 2.4 Visualizar progresso diário
**0–1 tap · 3–5s** — bom; faltam: skeleton, indicação de qual fonte de meta está ativa (Wearable/AI/Mifflin), CTA proeminente quando 0 refeições

### 2.5 Conexão com nutricionista
**3 taps · 8–15s** — funciona até vincular. Aí morre. **Nenhuma tela de chat existe.** Risco de churn alto: paciente espera consulta e não tem.

---

## 3. Diagnóstico contra os 8 vetores de retenção

| Vetor | Status | Observação |
|---|---|---|
| **TTV** (< 90s até primeira refeição) | ⚠️ | Hoje: signup + onboarding obrigatório (45-120s) ANTES do primeiro log. Quebra a regra. |
| **Hábito diário** | ⚠️ | Streak existe no dashboard, mas **push web** não está implementado. Nudges via WhatsApp via cron ([src/app/api/cron/whatsapp-nudges](src/app/api/cron/whatsapp-nudges)) — só pra quem ativou WhatsApp. |
| **Feedback loop** | ❌ | `/meal-result` mostra mock = sabotagem do feedback principal. |
| **Personalização percebida** | ⚠️ | Saudação "Olá" sem nome ([src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx)). Sem sugestões baseadas em histórico. |
| **Custo de logging** | ✅ | 5-6 taps OK; falta "logar igual ontem" |
| **Vazio = morte** | ⚠️ | Empty state no /insights sem CTA ([src/app/(app)/insights/page.tsx:92](src/app/(app)/insights/page.tsx#L92)); dashboard quando 0 refeições mostra ScorePill vazio sem CTA forte |
| **Velocidade percebida** | ⚠️ | Loaders mudos em vários pontos; sem skeleton em dashboard/log/onboarding |
| **Confiança nos dados** | ⚠️ | Goals vêm de 3 fontes; user não sabe qual ativa |

---

## 4. Top retention killers — concretos com fix sugerido

> Cada item: prioridade, arquivo:linha, problema, fix em 1 frase.

### P0 — Bloqueia retenção

1. **[P0]** [src/app/(app)/meal-result/page.tsx:57](src/app/(app)/meal-result/page.tsx#L57) — `mockResult` em vez da refeição recém-logada. **Fix:** receber `mealId` via search param, `select * from meals where id=...`, renderizar real.
2. **[P0]** [src/app/(app)/grocery/page.tsx:26](src/app/(app)/grocery/page.tsx#L26) — `MOCK_DATA` em inglês. **Fix curto:** PT-BR + remover do menu até ter backend; **fix longo:** gerar do `/plan` real.
3. **[P0]** [src/app/(app)/plan/page.tsx:21](src/app/(app)/plan/page.tsx#L21) — Meals em inglês. **Fix curto:** PT-BR + badge "Em breve: plano gerado pelo seu nutri"; **longo:** integrar nutri_protocol.
4. **[P0]** [src/app/(app)/learn/page.tsx:7](src/app/(app)/learn/page.tsx#L7) — Artigos em inglês, sem detalhe clicável. **Fix:** PT-BR + remover cards clicáveis até ter rota `/learn/[slug]`.
5. **[P0]** [src/app/(app)/health-data/page.tsx:16-47](src/app/(app)/health-data/page.tsx#L16-L47) — 6 wearables fake. **Fix:** esconder os 5 que não existem, manter só Apple Health com badge "lista de espera"; **ou** remover a página do menu.
6. **[P0]** [src/app/(app)/health-data/page.tsx:49](src/app/(app)/health-data/page.tsx#L49) — `handleSaveLabs` salva em mock. **Fix:** integrar com `lab_results` (já tenho a infra do PDF feita hoje).
7. **[P0]** Nenhum chat in-app com nutri. **Fix curto:** texto claro no `/aceitar-convite/confirmar` "Seu nutri vai te chamar via WhatsApp"; **longo:** rota `/mensagens` lendo `nutri_chats` (a tabela existe em [supabase/migrations/001_initial_schema.sql:206-214](supabase/migrations/001_initial_schema.sql#L206-L214)).
8. **[P0]** [src/app/onboarding/page.tsx:163](src/app/onboarding/page.tsx#L163) — `res.json().catch(() => ({}))` sem `res.ok`. **Fix:** checar `res.ok` antes de parse.
9. **[P0]** Analytics — faltam eventos de retenção. **Fix:** adicionar `onboarding_completed`, `first_meal_logged`, `dashboard_opened_d1`, `dashboard_opened_d7`.
10. **[P0]** [src/app/onboarding/page.tsx:199](src/app/onboarding/page.tsx#L199) — `triggerPersonalizedGoals` silencioso. **Fix:** badge no dashboard "Suas metas estão sendo personalizadas..." com polling.

### P1 — Frustra mas não mata

11. **[P1]** [src/app/(app)/meal-result/page.tsx:130](src/app/(app)/meal-result/page.tsx#L130) — botão "Notas" → `toast.info("em breve")`. **Fix:** esconder o botão.
12. **[P1]** [src/app/(app)/log/page.tsx:303-310](src/app/(app)/log/page.tsx#L303-L310) — `fetch().json()` sem `res.ok`. **Fix:** check.
13. **[P1]** [src/app/(app)/settings/whatsapp/page.tsx:89-93](src/app/(app)/settings/whatsapp/page.tsx#L89-L93) — idem.
14. **[P1]** [src/app/(app)/settings/page.tsx:54](src/app/(app)/settings/page.tsx#L54) — `.catch(() => {})` silencioso. **Fix:** toast.error.
15. **[P1]** [src/app/(app)/log/page.tsx:315](src/app/(app)/log/page.tsx#L315) — erro só visível enquanto modal aberto. **Fix:** persist no state.
16. **[P1]** [src/app/auth/signup/page.tsx:99-101](src/app/auth/signup/page.tsx#L99-L101) — `console.error` sem toast.
17. **[P1]** [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx) — saudação "Olá" sem nome. **Fix:** "Bom dia, {nome}" baseado em `new Date().getHours()`.
18. **[P1]** Sem AbortController em [src/lib/ai-client.ts](src/lib/ai-client.ts). **Fix:** `AbortSignal.timeout(60_000)`.
19. **[P1]** [src/app/(app)/insights/page.tsx:92](src/app/(app)/insights/page.tsx#L92) — empty state sem CTA. **Fix:** botão "Registrar primeira refeição" → /log.
20. **[P1]** Onboarding não persiste em localStorage. **Fix:** salvar `data` a cada step, restaurar no mount.
21. **[P1]** Sem "logar igual ontem" no dashboard.
22. **[P1]** [src/app/(app)/health-data/page.tsx:169-174](src/app/(app)/health-data/page.tsx#L169-L174) — inputs sem `min`/`max`. **Fix:** validação HTML5.

### P2 — Polish

23. **[P2]** [src/app/(app)/dashboard/hydration-quick-log.tsx](src/app/(app)/dashboard/hydration-quick-log.tsx) — sem `toast.success` ao logar água.
24. **[P2]** [src/app/(app)/meal-result/page.tsx:90](src/app/(app)/meal-result/page.tsx#L90) — `saved` state nunca reseta entre refeições.
25. **[P2]** Skeleton em vez de `<Loader2>` solto em /dashboard, /log, /onboarding bootstrap.
26. **[P2]** Indicar fonte da meta no dashboard (Wearable/AI/Mifflin) com badge clicável.
27. **[P2]** Haptic feedback (vibration API) em ações principais.
28. **[P2]** Microcopy mais coloquial PT-BR ("Bora logar essa janta?" em vez de "Registrar refeição").

---

## 5. O que recomendo shippar HOJE

Tier 1 — **2-3h, impacto enorme, zero risco** (sprint hoje, 1 PR, 1 deploy):

- **Fix #1** — `/meal-result` real (lê meal por id; user vê o que acabou de logar)
- **Fix #5+#6** — `/health-data`: esconder wearables fake, plugar form de exames no `lab_results` (a infra do PDF que acabei de fazer)
- **Fix #2-#4** — Tradução PT-BR de `/grocery`, `/plan`, `/learn` + remover botões clicáveis em mocks
- **Fix #8+#12+#13+#14+#16** — `res.ok` checks + toasts em catches silenciosos (10 arquivos, ~5min cada)
- **Fix #17** — Saudação por nome no dashboard
- **Fix #20** — Onboarding draft em localStorage
- **Fix #11** — Esconder botões "em breve"
- **Fix #19** — CTA "registrar primeira refeição" no insights vazio

Tier 2 — **1-2 dias, médio risco** (sprint separado):

- **Fix #7** — `/mensagens` real lendo `nutri_chats` (tabela já existe)
- **Fix #9** — eventos PostHog de retenção (onboarding/first-meal/D1/D7)
- **Fix #10** — UX da personalização de goals (badge + polling)
- **Fix #18** — AbortController + retry em ai-client

Tier 3 — **roadmap, não shippar agora**:

- Sistema de push web (Service Worker + WebPush)
- Plano de refeições gerado de verdade
- Loja com checkout
- Wearables reais (Apple Health Web, Terra)

---

## 6. Próximo passo

Vou parar aqui (como pediu o brief). **Me diga qual tier shippa hoje** — Tier 1 sozinho já elimina o pior do bleed de retenção e cabe num PR/deploy só.

Vou esperar OK antes de tocar em qualquer arquivo.
