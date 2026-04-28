# Cloudflare Setup — Salus / NullLabs

Este doc é **playbook de painel**. Cloudflare é configurado no dashboard deles, não em código. O Next.js continua hospedado na Vercel — o Cloudflare entra na frente como CDN/WAF/DNS.

## O que você ganha com Cloudflare na frente da Vercel

- **DDoS protection** automático (camada 3/4 + 7)
- **WAF** (Web Application Firewall) — regras OWASP, rate limiting global
- **Cache de assets estáticos** com hit rate alto
- **DNS rápido** (resposta global em ms)
- **Bot Fight Mode** — bloqueia scrapers de IA, DDoS de bots
- **Analytics** complementar ao PostHog (server-side, sem JS)
- **Turnstile** (CAPTCHA invisível) opcional pra signup

## Pré-requisito

Você já é dono de `nulllabs.org`. O domínio precisa apontar **nameservers** pro Cloudflare. Migração leva ~24h.

---

## Fase 1 — Adicionar o domínio (15 min)

1. Conta grátis em https://dash.cloudflare.com/sign-up
2. **Add a Site** → digite `nulllabs.org` → escolha plano **Free**
3. Cloudflare escaneia DNS atual e te mostra os registros existentes. Confirme.
4. Cloudflare te dá 2 nameservers (ex: `meera.ns.cloudflare.com`, `walt.ns.cloudflare.com`)
5. **No registrador onde comprou o domínio** (Registro.br, GoDaddy, etc): troca os nameservers pelos do Cloudflare
6. Aguarda propagação (~24h, mas geralmente <1h). Cloudflare avisa por e-mail quando ativar.

## Fase 2 — DNS records pra Vercel (5 min)

Dentro de **DNS → Records** no Cloudflare:

| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| A | `@` (apex) | `76.76.21.21` (IP da Vercel) | 🟠 Proxied |
| CNAME | `salus` | `cname.vercel-dns.com` | 🟠 Proxied |
| CNAME | `www` | `cname.vercel-dns.com` | 🟠 Proxied |

**Importante:** O ícone laranja 🟠 (proxied) é o que liga o Cloudflare na frente. Se você deixar cinza (DNS-only), o tráfego vai direto pra Vercel sem o Cloudflare ver nada.

Na Vercel:
- **Project → Settings → Domains** → adicione `salus.nulllabs.org` e `nulllabs.org`
- Vercel emite SSL automático

**Conflito de SSL Cloudflare ↔ Vercel:** o padrão "Flexible" do Cloudflare quebra. No Cloudflare → **SSL/TLS → Overview**, escolha **"Full (strict)"**. Isso faz o Cloudflare validar o cert da Vercel ponta-a-ponta.

## Fase 3 — Otimizações de produção (15 min)

### Speed → Optimization
- **Brotli compression**: ON
- **Auto Minify**: JS + CSS + HTML ON
- **Early Hints**: ON
- **HTTP/3 (QUIC)**: ON

### Caching → Configuration
- **Browser Cache TTL**: Respect Existing Headers (Vercel já manda corretos)
- **Caching Level**: Standard
- **Always Online**: ON (servir cache se Vercel cair)

### SSL/TLS → Edge Certificates
- **Minimum TLS Version**: 1.2
- **Always Use HTTPS**: ON
- **Automatic HTTPS Rewrites**: ON
- **HSTS**: ON (Max Age 6 months, includeSubDomains, preload — só liga depois que confirmar que tudo funciona em HTTPS)

### Security → Bots
- **Bot Fight Mode**: ON

### Security → WAF
- **Managed Rules**: ative o ruleset **Cloudflare Managed**
- Custom rule sugerida: bloqueia paths de admin de outras stacks
  ```
  (http.request.uri.path contains "/wp-admin") or
  (http.request.uri.path contains "/.env") or
  (http.request.uri.path contains "/.git/")
  ```
  → Action: Block

### Rules → Page Rules (free tier dá 3)
1. `salus.nulllabs.org/api/*` → Cache Level: Bypass (rotas Next.js dinâmicas, nunca cacheia)
2. `salus.nulllabs.org/_next/static/*` → Edge Cache TTL: 1 month (assets imutáveis)
3. `salus.nulllabs.org/*.json` → Cache Level: Standard

## Fase 4 — Headers de segurança (5 min)

Em **Rules → Transform Rules → Modify Response Header**, crie a regra global:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=(self)` |

(Os Edge Functions já mandam alguns desses; aqui é cinto + suspensório.)

## Fase 5 — Turnstile (opcional, recomendado pra signup)

Cloudflare Turnstile = CAPTCHA invisível, grátis. Substitui reCAPTCHA.

1. **Turnstile** no painel → **Add site** → site_key gerado
2. Em `.env.local`:
   ```
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAA...
   ```
3. Quer que eu codifique a integração? Avisa em uma rodada futura.

---

## Como confirmar que está funcionando

Depois de 24h após trocar nameservers:

```bash
# Confirma que está atrás do Cloudflare (espera CF-Ray header)
curl -I https://salus.nulllabs.org/ | grep -i "cf-\|server"
# Server: cloudflare
# CF-Ray: 8f...

# Confirma SSL Full strict (cert original da Vercel passa direto)
echo | openssl s_client -connect salus.nulllabs.org:443 2>/dev/null | grep "subject="
```

## O que NÃO recomendo

- ❌ Cloudflare Pages como host (você já tem Vercel — duplicação)
- ❌ Cloudflare Workers no caminho de auth Supabase (cookie complicado)
- ❌ Cloudflare R2 pra fotos (Supabase Storage já basta no estágio atual)
- ❌ Argo Smart Routing pago — só compensa com tráfego alto

---

## TL;DR — fluxo mínimo pra ativar hoje

1. Cria conta Cloudflare grátis
2. Adiciona `nulllabs.org`
3. Troca nameservers no registrador (única ação fora do Cloudflare)
4. Aponta `salus` CNAME pra `cname.vercel-dns.com` (proxied 🟠)
5. SSL Full (strict)
6. Bot Fight Mode ON
7. Always Use HTTPS ON

Tudo isso é setup único de ~30min. Você está 80% protegido.
