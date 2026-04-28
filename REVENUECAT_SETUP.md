# RevenueCat — Setup Guide

Billing is **mobile-only**: iOS via StoreKit IAP, Android via Google Play Billing, unified by RevenueCat. This Next.js web app has **no checkout**. It only receives the RC webhook to sync `profiles.subscription_status`.

## 1. RevenueCat dashboard

1. Create project at https://app.revenuecat.com/
2. Add iOS app + Android app
3. Create **Entitlement** `pro` (single entitlement gates every paid feature)
4. Create **Products** — one per platform per SKU:
   - `salus_monthly` — R$ 59 / month
   - `salus_annual` — R$ 590 / year
5. Create **Offering** `default` with both products, attach entitlement `pro`
6. **Integrations → Webhooks**: point at `https://<your-domain>/api/revenuecat/webhook` with Authorization header `Bearer <REVENUECAT_WEBHOOK_SECRET>`

## 2. Apple + Google

- **App Store Connect**: create the subscription group + products with matching IDs (`salus_monthly`, `salus_annual`). Fill tax, banking, agreements.
- **Google Play Console**: create subscriptions with matching IDs. Fill merchant account.
- In RC, link each product to its App Store / Play Console SKU.

## 3. Supabase migration

Add these columns to `profiles` if not already there:

```sql
alter table profiles
  add column if not exists revenuecat_app_user_id text,
  add column if not exists subscription_status text default 'free',
  add column if not exists subscription_product_id text,
  add column if not exists subscription_expires_at timestamptz;
```

## 4. Environment variables

In `.env.local` and Vercel:

```
REVENUECAT_WEBHOOK_SECRET=<random string, same as RC dashboard>
REVENUECAT_SECRET_API_KEY=<optional, for server-side REST lookups>
```

## 5. Native app (separate repo — Expo recommended)

```bash
npx create-expo-app salus-mobile
cd salus-mobile
npx expo install react-native-purchases @supabase/supabase-js
```

In the app, after Supabase login:

```ts
import Purchases from 'react-native-purchases'

Purchases.configure({ apiKey: Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY })
await Purchases.logIn(supabaseUser.id)   // critical — links RC user to Supabase id
```

Build the paywall UI matching the MellowMind design (annual + monthly selector, continue button, restore purchases, terms, privacy).

```ts
const offerings = await Purchases.getOfferings()
await Purchases.purchasePackage(offerings.current.annual) // or monthly
```

`Purchases.restorePurchases()` wires the Restore button.

## 6. Webhook contract

This repo handles these RC events:

| Event | Action |
|---|---|
| `INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `UNCANCELLATION` | `subscription_status = 'premium'` + store product + expiry |
| `CANCELLATION`, `EXPIRATION`, `SUBSCRIPTION_PAUSED` | `subscription_status = 'free'` |

All other events return `200 { handled: false }`.

## 7. App Store review notes

- Apple requires you to provide a test account and a way to verify the IAP flow works. Create a Sandbox tester in App Store Connect.
- If any web page mentions subscription price, **do not** link to it from inside the iOS app (anti-steering rule 3.1.3). Keep the paywall copy in-app self-contained.
- First review usually takes 24–48h. Have screenshots ready (6.7", 6.5", 5.5" iPhone; 12.9" iPad).
