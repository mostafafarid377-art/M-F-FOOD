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

## Phase 5 — Tables, deliveries and live tracking

**Deployment order:** back up the database and test in a separate Supabase
project first. Apply `supabase/migrations/20240104_04_tables_delivery.sql` after
Phases 1–4, then deploy the frontend. The migration does not delete existing
orders, payments or legacy `table_sessions`. It imports the latest legacy row
per table number into `restaurant_tables`; legacy `checked_out` is mapped to
`cleaning`, and no historical session is fabricated. An imported `occupied`
table with no open session must be reviewed and reset by an admin. Do not run
`seed.sql` again on a populated project.

### Tables

- Open `/tables` as an admin, active manager, server or cashier. Only admins
  create/edit/deactivate tables. Staff open and close sessions; a unique partial
  index prevents more than one open session per table. A session cannot close
  while its linked orders are unfinished. Closing makes the table available.
- New dine-in orders using the table number attach to its open session. Older
  dine-in orders for that same table may be attached with their full order UUID.
  Existing checkout still accepts a table number when no session is configured.
- Sessions and links are separate from the old `table_sessions` records. They
  store opening/closing times; the table screen totals non-cancelled orders.

### Dispatch and drivers

- At `/delivery-admin`, admins/managers see delivery orders, assign/reassign a
  driver before pickup, and may cancel a delivery. An active driver may hold
  only one active delivery. Kitchen status remains the original order status;
  a driver can pick up only when the kitchen marks the order **Ready**. Marking
  delivered atomically completes the order. An undelivered Phase 5 delivery
  cannot be completed through the old order-status button.
- Drivers must register normally. In the delivery dashboard, an administrator
  adds the registered user's **Auth user UUID**, display name and optional
  contact phone. Driver access comes from an active driver record, not from a
  client-supplied role. Reassignment is restricted once pickup has started.
- At `/driver`, the assigned driver sees only their active deliveries and may
  open a navigation service. After pickup they mark **on the way**, explicitly
  start GPS sharing, and keep the page open. Browser geolocation requires HTTPS,
  device support and permission. Location is sent approximately every 15 seconds
  when moving 20 metres, or at most every 60 seconds while stationary; the server
  also throttles updates. Background browser/device suspension can stop updates.
  Completion, cancellation, page closure or user action stops sharing. The server
  rejects updates after the assignment ends, even if a client is offline.
- Only the most recent GPS point is stored per active delivery. It is deleted
  on reassignment, cancellation or delivery. Customer and driver locations are
  protected by RLS and ownership-checked RPCs; a driver can only publish to their
  own active delivery. Browser GPS cannot prove that a device's coordinates have
  not been spoofed, so do not treat them as proof of physical presence.

### Customer map and routing

- The customer opens **My Orders → Track delivery**, and can choose a destination
  on the map or explicitly use their current location. The admin enters verified
  restaurant latitude/longitude in the delivery dashboard. Neither location is
  guessed. Driver contact and GPS are shown only for the customer's own active
  delivery; GPS appears after the driver starts sharing. An update older than
  two minutes is labelled stale. Realtime subscriptions reconnect and all views
  periodically reconcile in case events are missed.
- Leaflet uses OpenStreetMap tiles; no map API key is required. OpenStreetMap's
  tile servers receive requests revealing the viewed area. Follow their usage
  policy or configure a suitable tile provider before high-volume production.
- Route lines and ETA are **not invented**. Optionally set `VITE_ROUTING_URL`
  to an HTTPS OSRM-compatible server (for GitHub Pages, an Actions repository
  variable), then rebuild. The customer must enable routing explicitly: the
  browser sends the current driver and destination coordinates to that service.
  The service must support CORS and an OSRM `/route/v1/driving/...` endpoint.
  Without a configured service, or if the request fails or GPS is stale, no
  route or ETA is shown. Do not put secret API keys in `VITE_` variables.
- The Phase 5 screens include an English/Arabic toggle and RTL layout. The
  pre-existing customer/admin screens are not fully translated.

### Realtime and validation checklist

The migration adds the Phase 5 tables to `supabase_realtime` when that
publication exists. Verify Supabase Database → Replication for `orders`,
`restaurant_tables`, `dining_sessions`, `dining_session_orders`,
`delivery_jobs`, `delivery_locations`, `delivery_destinations`,
`delivery_drivers` and `restaurant_geo`. Realtime must be enabled on the
project; polling is only a reconciliation fallback.

Run `npm test`, `npm run typecheck` and `npm run build`. The automated SQL tests
use PGlite with a simulated Auth context, and UI tests mock geolocation and
Realtime. **They do not verify a real Supabase project, GPS device, map tile
provider or routing service.** Before production, use separate customer,
driver, manager and unrelated-user sessions on real devices: test checkout,
assignment/reassignment, GPS permission and movement, live map updates,
disconnection/reconnection, stale locations, cancellation, delivery completion,
and attempts to read or update another customer's/driver's data. Test
concurrent session opening and review the project's actual RLS/grants as well.
