# App Store + Google Play — Checklist de Lançamento

Status dos itens trabalhados **no repo Next.js**. A coluna "Local" indica onde cada item mora ou precisa ser resolvido.

## ✅ Pronto neste repo

| Item | Por quê | Arquivo |
|---|---|---|
| Política de Privacidade (pt-BR, 11 seções) | Apple + Google exigem URL pública | `src/app/privacidade/page.tsx` |
| Termos de Uso (pt-BR, 13 seções, foro BR) | Apple + Google exigem | `src/app/termos/page.tsx` |
| Auto-exclusão de conta dentro do app | Apple Guideline 5.1.1(v) — email-suporte NÃO é aceito | `src/app/api/user/delete/route.ts`, `src/app/(app)/settings/page.tsx` |
| Exportação de dados (JSON download) | LGPD / GDPR / Apple privacy | `src/app/api/user/export/route.ts` |
| Reporte de conteúdo IA | Google Play [NEW 2025] — GenAI flagging | `src/app/api/ai/report/route.ts`, botão em `meal-result` |
| Disclaimer IA + saúde | Apps de saúde + IA = scrutínio extra | footer landing + meal-result |
| Sign in with Apple (web) | Apple obriga paridade com Google OAuth | `src/app/auth/login/page.tsx`, `signup/page.tsx` |
| Confirmação de idade 18+ no signup | Termos exigem 18+, alinha com idade mínima | `src/app/auth/signup/page.tsx` |
| Error boundary Next.js | "no crashes" (Guideline 2.1) — web | `src/app/error.tsx` |
| Webhook RevenueCat | Sincroniza assinatura mobile → banco | `src/app/api/revenuecat/webhook/route.ts` |
| Migration SQL | Tabela `ai_reports` + colunas de subscription em `profiles` | `supabase/migrations/005_*.sql` |
| Landing com badges App Store + Play | Conversão web → mobile | `src/app/page.tsx#download` |

## ⚠️ Você precisa fazer (burocracia — dias/semanas)

- [ ] **Apple Developer Program** — $99/ano — https://developer.apple.com/programs/enroll/
- [ ] **Google Play Console** — $25 — https://play.google.com/console/signup
- [ ] **CNPJ** + conta bancária + tax forms (W-8BEN pra Apple, tax info pra Google)
- [ ] **Trader status EU** [NEW 2025] em App Store Connect se for vender na UE
- [ ] **Supabase**: rodar `supabase/migrations/005_ai_reports_and_subscription.sql`
- [ ] **Supabase Auth**: habilitar provider **Apple** (Dashboard → Authentication → Providers)
- [ ] **Domínio de email**: `suporte@nulllabs.org` + `privacidade@nulllabs.org` têm que **existir e ser monitorados** — Apple e Google testam
- [ ] **Vercel**: setar `REVENUECAT_WEBHOOK_SECRET` nas env vars
- [ ] **RevenueCat** conta + produtos `salus_monthly` (R$59) e `salus_annual` (R$590), entitlement `pro`, webhook apontando pra `https://<seu-dominio>/api/revenuecat/webhook`

## 📱 App nativo (repo SEPARADO — Expo recomendado)

### Setup inicial
- [ ] `npx create-expo-app@latest salus-mobile --template blank-typescript`
- [ ] `npx expo install react-native-purchases @supabase/purchases-js expo-router`
- [ ] `eas init` e `eas build --platform all --profile production`

### Build tech (atual 2026)
- [ ] iOS: **Xcode 16+** [REQUIRED]
- [ ] iOS: **target iOS 26 SDK** a partir de 28/abr/2026 [NEW 2025]
- [ ] Android: formato **AAB** (não APK) [REQUIRED]
- [ ] Android: **target API 35** (Android 15) [REQUIRED 2025]
- [ ] Android: **Play Billing Library 7.0+** [NEW 2025]
- [ ] Android: **Photo Picker API** (não usar READ_EXTERNAL_STORAGE) [NEW 2025]

### Integrações obrigatórias
- [ ] Apple IAP via RevenueCat (`react-native-purchases`)
- [ ] Google Play Billing via mesma SDK
- [ ] **Sign in with Apple** nativo (ASAuthorizationAppleIDProvider) — [REQUIRED] se tiver Google login
- [ ] `Purchases.logIn(supabaseUserId)` após login — crítico pro webhook casar
- [ ] Botão **"Restore Purchases"** visível no paywall
- [ ] **Deletar conta** chamando `/api/user/delete` (já implementado no web)

### Store listings
- [ ] App name ≤30 chars
- [ ] Subtitle ≤30 chars (Apple)
- [ ] Short description ≤80 chars (Google)
- [ ] Description ≤4000 chars (ambos)
- [ ] Keywords ≤100 chars total (Apple)
- [ ] Screenshots iPhone 6.9" (1290×2796) + 6.5" (1284×2778) — mín 1, ideal 3-5
- [ ] Screenshots Android — mín 2, máx 8 por dispositivo
- [ ] Ícone 1024×1024 (Apple) + 512×512 (Google)
- [ ] Feature graphic 1024×500 (Google)
- [ ] Privacy Nutrition Labels (App Store Connect) — declarar conforme `/privacidade`
- [ ] Data Safety section (Play Console) — mesmo conteúdo
- [ ] Content rating IARC — questionário completo
- [ ] **Demo account** (login Supabase pré-criado) em "Notes for Reviewer"
- [ ] Sem "50% off", "#1 app" ou pricing em screenshots [NEW 2025]

### Compliance específica de conteúdo/saúde
- [ ] Categoria = Health & Fitness (ambos)
- [ ] HealthKit/Health Connect só se realmente usar — justificar uso
- [ ] AI content disclosure na listing (como a IA é usada) [NEW 2025 Apple]
- [ ] Mecanismo in-app de reporte de AI (já implementado: `/api/ai/report`)
- [ ] Accuracy: toda feature nos screenshots tem que existir no build

### Testing
- [ ] Sandbox tester criado no App Store Connect
- [ ] License tester no Google Play Console
- [ ] **14 dias Closed Testing com 12+ testers no Google** [REQUIRED 2025]
- [ ] TestFlight Internal Testing (Apple)

## 🚫 Rejeições mais comuns (evita desde já)

1. **Email-support para deletar conta** → já removido aqui
2. **Faltar Sign in with Apple quando tem Google** → já adicionado no web, fazer igual no iOS
3. **Paywall não mostra preço com clareza** → visual MellowMind já cobre
4. **Usar Stripe/Paddle/link externo pra assinar dentro do app** → já removido
5. **Screenshots com "promoção por tempo limitado"** → cuidado no marketing
6. **App crasha no launch em device real** → testar sempre em iPhone/Android físico, não só simulador
7. **Placeholder text / lorem ipsum** → revisar antes de submeter

## 🎯 Ordem sugerida pra desbloquear

1. **Hoje**: inicia inscrição Apple ($99) + Google ($25). São assíncronas.
2. **Hoje**: cria emails `suporte@` e `privacidade@`.
3. **Esta semana**: cria conta RevenueCat, roda a migration, testa o webhook local.
4. **Próxima semana**: `create-expo-app` e começa o app móvel.
5. **Em paralelo**: faz os screenshots + ícone + feature graphic (pode ser Figma + export).
6. **Quando Apple aprovar inscrição**: configura subscriptions no App Store Connect + Play Console.
7. **TestFlight + Closed Testing** por pelo menos 2 semanas antes de Produção.

---

**Timeline realista do zero ao live**: 3–6 semanas se trabalhar focado.
