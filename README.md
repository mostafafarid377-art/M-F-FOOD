# 🍔 M-F-FOOD — Restaurant Ordering App

A restaurant web app built with **React + TypeScript + Vite + Tailwind CSS**, with
**PostgreSQL via Supabase** as the single source of truth (no Firebase anywhere).

## Constraints & security model

- **No Firebase / Firestore / Firebase Auth** — auth and data are 100% Supabase + PostgreSQL.
- **UUID primary keys** everywhere (`uuid_generate_v4()`).
- **Money is stored as integer minor units (piastres)** — 100 piastres = 1 EGP. No floats.
- **RLS enabled on every exposed table** (see `supabase/migrations`).
- **The frontend is never trusted** with prices, totals, roles, or payment statuses:
  - Orders are created exclusively through the `create_order` Postgres function, which
    re-prices every line from `menu_items`, enforces availability and the minimum order,
    and computes the total — all inside one transaction.
  - Roles default to `customer` and can only be changed by admins
    (`prevent_role_escalation` trigger).
  - Payment status transitions happen server-side; clients can only *read* their own payments.
- **No raw payment-card data** is ever stored — only a gateway `transaction_id`.

## Phases implemented

### Phase 1 — UI & Cart
- `MenuPage` (`src/features/menu/Page.tsx`): 6 categories (Burgers, Pizzas, Salads,
  Pastas, Wraps, Drinks), 6 sample items with images/descriptions/prices in piastres,
  live **search bar** + **category filter**, **Add to Order** buttons, responsive
  **sidebar that collapses into a drawer below 768px**, adaptive navbar with cart
  count and auth state, routing between `/`, `/menu`, `/cart` (+ `/checkout`,
  `/orders`, `/login`, `/register`).
- `CartPage` (`src/features/cart/Page.tsx`): quantity steppers, remove items,
  subtotal & total in **EGP**, checkout button. Cart **persists** via `localStorage`.
- UI kit (`src/components/ui/`): `Button` (primary/secondary/outline/danger/ghost),
  `Card`, `Badge` (status variants).

### Phase 2 — Supabase schema
- `supabase/migrations/20240101_01_create_core_tables.sql`:
  10 tables — `profiles`, `categories`, `menu_items`, `orders`, `order_items`,
  `payments`, `restaurant_settings`, `staff_members`, `table_sessions`, `audit_logs` —
  with RLS policies, indexes on every FK + hot columns, and `updated_at` triggers.
- `supabase/seed.sql`: 6 categories, 6 menu items (piastres), restaurant settings
  (EGP, £, 200 delivery fee, 1000 minimum), table sessions, staff bootstrap, audit samples.
- `.env.example`: required environment variables.

### Phase 3 — Auth & Order creation
- `supabase/migrations/20240102_02_auth_and_order_creation.sql`:
  - `handle_new_user` trigger → auto-creates `profiles` rows (default `customer` role).
  - `create_order(items, delivery_address, table_number)` SECURITY DEFINER RPC —
    server-side pricing, availability checks, minimum-order enforcement, audit log entry.
  - `grant execute` to `authenticated` only.
- Frontend: `AuthProvider` wired to **Supabase Auth** (email/password login, register,
  logout, session refresh, role fetched from `profiles`), `LoginPage` / `RegisterPage`,
  `CheckoutPage` (delivery vs dine-in; calls the RPC with ids + quantities only),
  `OrdersPage` (order history scoped to the signed-in user).

> **Demo mode:** without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` the app runs
> fully locally with bundled sample data and simulated auth/orders — handy for UI
> development. Copy `.env.example` → `.env` to connect a real project.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

### Database setup

1. Create a Supabase project.
2. Apply the migrations (SQL editor, or `supabase db push` with the CLI):
   - `supabase/migrations/20240101_01_create_core_tables.sql`
   - `supabase/migrations/20240102_02_auth_and_order_creation.sql`
3. Run `supabase/seed.sql`.
4. Copy `.env.example` to `.env` and fill in your project URL and anon key.
5. Register a user in the app → a `profiles` row is created automatically.

To make yourself an admin (then manage menu/orders from the dashboard phases):

```sql
update public.profiles set role = 'admin' where id = '<your-user-uuid>';
```

## Project structure

```
src/
  app/
    layout/AppLayout.tsx      # adaptive navbar + footer shell
    providers.tsx             # LayoutProvider, CartProvider, AuthProvider
    router.tsx                # React Router routes
  components/ui/              # Button, Card, Badge
  features/
    home/                     # landing page
    menu/                     # MenuPage + sample data + types
    cart/                     # CartPage
    checkout/                 # CheckoutPage (server-side order creation)
    orders/                   # order history
    auth/                     # LoginPage, RegisterPage
  lib/
    supabase.ts               # client bootstrap + demo-mode detection
    format.ts                 # piastres → EGP formatting
  types/supabase.ts           # row types mirroring the schema
supabase/
  migrations/                 # Phase 2 + Phase 3 SQL
  seed.sql
```
