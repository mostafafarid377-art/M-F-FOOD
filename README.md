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

### Deploying to GitHub Pages

After merging the deployment workflow into `main`, go to **Settings → Pages**
for the repository and select **GitHub Actions** as the build and deployment
source. The workflow builds on pushes to `main` and publishes the `dist` folder.
The Pages build uses hash routes (for example `/#/menu`) so refreshes work on
GitHub's static hosting.

The `.env` file is local and is not uploaded to GitHub. To use Supabase on the
published site, add repository Actions variables named `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions →
Variables**, then re-run the deployment workflow. These values are public in
the browser build: use only the project URL and public anon key, never a
service-role or secret key. Without both values, the deployed app uses demo mode.

## Phase 4 — Dashboard and kitchen display

Phase 4 uses the existing database; it does not reset, seed, or replace any
records. Before production, back up the database and test the migration on a
separate Supabase project. Run only the new
`supabase/migrations/20240103_03_admin_kitchen.sql` **after** the first two
migrations. Do not re-run `seed.sql` on a database with real users: its staff
bootstrap can promote existing profiles.

- `/admin` is for admins and active managers. It includes the overview, menu,
  orders, and (admins only) staff sections. Categories may be deleted; items
  in a deleted category become uncategorized. Item prices are entered in EGP
  and saved as integer piastres. Image fields accept a URL or `/images/` path.
- `/kitchen` is for admins, active managers, and active chefs. It listens for
  order changes via Supabase Realtime, reloads on reconnection, and reconciles
  every 20 seconds when events are missed. “New” means pending; “Delayed”
  means 20 minutes since order creation, not a configurable SLA.
- Database status `confirmed` is displayed as **Accepted** in management.
  Pending → Accepted → Preparing → Ready → Completed is enforced by
  `transition_order` with a row lock and expected-current-status check.
  Chefs can advance through Ready; only managers/admins can complete or cancel
  pending, accepted, or preparing orders. Payments are separate and untouched.
- The overview’s “Today's sales” is **completed order value**, based on the
  completion update time and the browser's local date. It is not paid revenue.
- Order notes are displayed when present. The existing schema has no modifier
  or modifier-option tables, so modifiers cannot be managed or displayed.
  Existing orders have no retroactive status history; new orders and future
  changes get history entries. Menu/staff changes and status changes are audited.
- RLS denies direct client writes to orders/order items. The existing customer
  `create_order` RPC still creates and prices them. Server functions and RLS,
  rather than route visibility, enforce management permissions.

### Initial roles and Realtime setup

1. Have each person register normally. Find their **user UUID** in Supabase
   Authentication → Users. Do not use the publishable key as an admin key.
2. In the SQL Editor, using a trusted administrator connection, assign the first
   administrator (replace the UUID locally):

   ```sql
   update public.profiles set role = 'admin' where id = '<admin-user-uuid>';
   ```

3. To assign a manager or chef, use the registered user's UUID and the desired
   `manager` or `chef` role (do not apply this to your admin account):

   ```sql
   begin;
   update public.profiles set role = 'staff' where id = '<staff-user-uuid>';
   insert into public.staff_members (profile_id, role, is_active)
   values ('<staff-user-uuid>', 'chef', true)
   on conflict (profile_id) do update set role = excluded.role, is_active = true;
   commit;
   ```

   An admin may subsequently change or deactivate an existing staff record in
   the Staff tab. The profile must also be `staff`; server and cashier do not
   receive dashboard or kitchen access. Customers cannot assign themselves roles.
4. The migration adds `orders` to the `supabase_realtime` publication if it
   exists. Verify it in Supabase → Database → Replication (or create/configure
   the publication if your project does not have it). Sign out/in after changing
   roles, then use separate admin, chef, and customer sessions to test.
5. For GitHub Pages, merge/deploy the code as usual and ensure the public URL and
   publishable key are set as Actions variables. Apply the migration separately;
   deploying frontend code does **not** migrate Supabase.

Run `npm test` for the isolated PGlite SQL/RLS tests and mocked client tests;
run `npm run typecheck` and `npm run build`. PGlite substitutes Supabase Auth and
is not a substitute for testing real RLS, Realtime delivery, or reconnection on
your Supabase project. Verify those with separate customer, manager, chef and
admin accounts before using the dashboard in production.
