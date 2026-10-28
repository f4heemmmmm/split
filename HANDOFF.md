# Split: Handoff

Last updated: 28 Oct 2026

A small website for splitting group trip costs (JB trips with Faheem, Lin Hui, Qing Wen and Desmond). Live at **split.faheemkamel.com**, hosted on **Vercel**, data in **Supabase**. Code goes in **github.com/f4heemmmmm/split**.

## 1. Status

| Item | State |
|---|---|
| Expense data for Trips 1 to 4 | Done. Full list in section 6, checked by script against the current page |
| Static page of the list | Done. Published as the "JB Trip Payments" artifact on claude.ai (view only, no editing) |
| GitHub repo `f4heemmmmm/split` | Created by Faheem, empty |
| App code | Not started. Spec in sections 3 to 5 |
| Supabase project | Not created |
| Vercel project and domain | Not set up |

**Blockers seen so far**
- Claude's cloud session can read the repo but **can't push** to it. The Claude GitHub App isn't installed on `f4heemmmmm/split`. Fix: install it at https://github.com/apps/claude/installations/select_target, or push from your own machine.
- The local clone should go in `~/Documents/GitHub/split`. Claude hasn't been given access to that folder yet.

## 2. Decisions made

| Question | Decision |
|---|---|
| What it is | A working split app, not just a static list: add expenses, split them, see who owes whom, record payments |
| Who edits | **Only Faheem**, behind a passcode. Everyone else opens the link and can only view |
| Storage | **Supabase** (Postgres) |
| Hosting | **Vercel**, deployed from the GitHub repo |
| Address | **split.faheemkamel.com** (subdomain; the portfolio at faheemkamel.com stays as is) |
| Display currency | SGD, 2 decimal places |
| People | Faheem, Lin Hui, Qing Wen, Desmond |

## 3. What the app does

**Anyone with the link (view only)**
- Home: **Settle up** list ("Desmond pays Faheem 334.70"), each person's net balance, and a list of trips with totals.
- Trip page: table of every expense with **Item, Paid by, Total**, plus a column for each person's share in SGD. Leave a cell blank if that person isn't part of the expense. Dim the payer's own share, since they don't owe themselves. Add a footer row with each person's total for the trip.
- Payments page: the list of recorded payments.

**Faheem only (after entering the passcode)**
- Add, edit and delete expenses: item, trip, paid by, amount, currency (SGD or MYR), Grab ride yes/no, and split.
  - **Split equally** between ticked people (all 4 ticked by default).
  - **Custom amounts** per person. The total is the sum of the amounts.
  - Show a live preview of each person's share in SGD.
- Add, edit and delete trips (name, MYR per 1 SGD rate). Deleting a trip deletes its expenses, after an in-page confirm.
- Record a payment (from, to, amount in SGD, optional note). Each Settle up line gets a **Mark paid** button that records that exact payment.
- Add a person or rename one.
- Sign out.

**Display rules (carry over from the current page)**
- Item names in Title Case ("Grab To CIQ", "Bus Fare Back").
- Grab rides sit **at the bottom** of each trip, with the item name and amount in **green**.
- Exchange rates are **not shown** on public pages. They appear only in the edit forms.
- Each payer has a color chip: Faheem blue, Lin Hui orange, Qing Wen purple, Desmond gold. Don't use green for a person, since green means Grab.
- Item, Paid by and Each owes use the same font and the same size.
- Works on a phone (about 400px wide). Wide tables scroll sideways inside their own box. Light and dark mode.

## 4. How the money works

- Each trip has a rate: **MYR per 1 SGD**. MYR amounts become SGD by dividing by the trip's rate.
- Equal split: share = amount / number of ticked people. The payer is included if ticked.
- Custom split: each person's share is entered in the expense's currency.
- Rounding: keep full precision in the maths and round only for display, half up to 2dp. In JS use `Math.round((x + Math.sign(x) * 1e-9) * 100) / 100`. Without the tiny nudge, 37.18 / 4 = 9.295 shows as 9.29 instead of 9.30.
- Balance per person = (what they paid, in SGD) - (their shares, in SGD) + (payments they sent) - (payments they received). Positive means they get money back.
- Settle up: convert balances to whole cents. Repeatedly match the biggest debtor with the biggest creditor for the smaller of the two amounts. Ignore anything at 1 cent or less, which is rounding noise.

## 5. Build plan

**Stack**: Next.js 15 (App Router, TypeScript, server actions), React 19, `@supabase/supabase-js` v2, plain CSS (no Tailwind needed), font Figtree via `next/font/google`.

**Security**
- The browser never talks to Supabase. All reads and writes run on the server with the **service role (secret) key**.
- Turn on Row Level Security on every table and add **no policies**. The anon key can then do nothing.
- Passcode: env `ADMIN_PASSCODE`. Compare it timing-safe (SHA-256 both sides, then `timingSafeEqual`). On success set an httpOnly, secure, `sameSite=lax` cookie `split_admin` = HMAC-SHA256(key = passcode, msg = "split-admin-v1"), valid 90 days. Changing the passcode signs everyone out.
- Every server action that writes checks the cookie first.

**Environment variables (Vercel and `.env.local`)**

| Name | Value |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key (`sb_secret_...` or the legacy service_role key). Server only, never `NEXT_PUBLIC_` |
| `ADMIN_PASSCODE` | Faheem's passcode |

**Files**
```
app/layout.tsx              header: "Split", links Trips / Payments, Sign in or Sign out
app/globals.css             color tokens (light + dark), tables, chips, forms
app/page.tsx                settle up, balances, trip list
app/trips/[id]/page.tsx     expense table for one trip
app/trips/new/page.tsx      new trip (admin)
app/trips/[id]/edit/page.tsx
app/trips/[id]/expenses/new/page.tsx
app/expenses/[id]/edit/page.tsx
app/payments/page.tsx       list + record form (admin)
app/login/page.tsx          passcode form
app/actions.ts              server actions: login, logout, saveExpense, deleteExpense,
                            saveTrip, deleteTrip, savePayment, deletePayment, savePerson
components/ExpenseForm.tsx  client component, useActionState, equal/custom toggle, live preview
components/ConfirmButton.tsx two-step delete button
lib/supabase.ts             server-only client (persistSession: false)
lib/auth.ts                 isAdmin, checkPasscode, set/clear cookie
lib/data.ts                 types + getAll() (people, trips, expenses, payments in parallel)
lib/money.ts                toSgd, shares, round2, balances, settle
supabase/schema.sql
supabase/seed.sql
```
- Every page uses `export const dynamic = "force-dynamic"`. After each write, call `revalidatePath("/", "layout")`.
- In Next 15, `params` is a Promise: `const { id } = await params`.
- Call `redirect()` outside any try/catch.
- Postgres `numeric` comes back as a JSON number. Wrap it in `Number()` anyway.

**Database schema** (`supabase/schema.sql`)
```sql
create table people (
  id text primary key,
  name text not null,
  color text not null,            -- blue | orange | purple | gold | teal | pink
  sort_order int not null default 0
);

create table trips (
  id bigint generated by default as identity primary key,
  name text not null,
  rate numeric(8,4) not null default 3.1,   -- MYR per 1 SGD
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table expenses (
  id bigint generated by default as identity primary key,
  trip_id bigint not null references trips(id) on delete cascade,
  item text not null,
  paid_by text not null references people(id),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('SGD','MYR')),
  split_type text not null check (split_type in ('equal','custom')),
  participants text[] not null default '{}',  -- used when split_type = 'equal'
  shares jsonb not null default '{}',         -- used when split_type = 'custom': {"faheem": 15, ...} in the expense currency
  is_grab boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table payments (
  id bigint generated by default as identity primary key,
  from_person text not null references people(id),
  to_person text not null references people(id),
  amount numeric(12,2) not null check (amount > 0),  -- SGD
  note text,
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);

alter table people enable row level security;
alter table trips enable row level security;
alter table expenses enable row level security;
alter table payments enable row level security;
```

**Setup steps**
1. Supabase: create a project, open the SQL editor, run `schema.sql`, then `seed.sql` (section 7). Copy the project URL and the secret key.
2. Clone: `git clone https://github.com/f4heemmmmm/split.git ~/Documents/GitHub/split`
3. Build the app per this file, add `.env.local`, then `npm run dev`. Check that the Trip 3 table shows Yeon Cafe as Qing Wen 13.30, Faheem 14.90, Desmond 12.02, and that Settle up matches section 6.
4. Push to `main`.
5. Vercel: Add New Project, import `f4heemmmmm/split`, add the 3 env vars, then Deploy.
6. Domain: in the Vercel project go to Settings, Domains, and add `split.faheemkamel.com`.
   - If faheemkamel.com already uses Vercel's nameservers, this is automatic.
   - Otherwise add a DNS record at the registrar: **CNAME** `split` pointing to `cname.vercel-dns.com`. Wait for Vercel to show it as valid (HTTPS is automatic).
7. Open the site, sign in with the passcode, and test one add, edit and delete.

## 6. Current data (source of truth)

Amounts are as entered. Shares are what each person's part comes to in SGD; the payer's own share is included. All of these match the current "JB Trip Payments" page.

### Trip 1 (1 SGD = 3.05 MYR)

| Item | Paid by | Amount | Grab | Split | Faheem | Lin Hui | Qing Wen | Desmond |
|---|---|---|---|---|---:|---:|---:|---:|
| Breakfast | Faheem | 27 MYR |  | equal, all 4 | 2.21 | 2.21 | 2.21 | 2.21 |
| Photobooth | Faheem | 50 MYR |  | equal, all 4 | 4.10 | 4.10 | 4.10 | 4.10 |
| Massage | Faheem | 484 MYR |  | equal, all 4 | 39.67 | 39.67 | 39.67 | 39.67 |
| Chagee | Faheem | 60 MYR |  | equal, all 4 | 4.92 | 4.92 | 4.92 | 4.92 |
| Tufting | Faheem | 360 MYR |  | equal, all 4 | 29.51 | 29.51 | 29.51 | 29.51 |
| Haidilao | Lin Hui | 654 MYR |  | equal, all 4 | 53.61 | 53.61 | 53.61 | 53.61 |
| Bus Fare Back | Lin Hui | 12 MYR |  | equal, all 4 | 0.98 | 0.98 | 0.98 | 0.98 |
| Grab To Breakfast | Faheem | 8 MYR | yes | equal, all 4 | 0.66 | 0.66 | 0.66 | 0.66 |
| Grab To Massage | Faheem | 9 MYR | yes | equal, all 4 | 0.74 | 0.74 | 0.74 | 0.74 |
| Grab To Nimmies | Faheem | 7 MYR | yes | equal, all 4 | 0.57 | 0.57 | 0.57 | 0.57 |
| Grab To Escape Room | Faheem | 30 MYR | yes | equal, all 4 | 2.46 | 2.46 | 2.46 | 2.46 |
| Grab To CIQ | Faheem | 30 MYR | yes | equal, all 4 | 2.46 | 2.46 | 2.46 | 2.46 |

### Trip 2 (1 SGD = 3.1 MYR)

| Item | Paid by | Amount | Grab | Split | Faheem | Lin Hui | Qing Wen | Desmond |
|---|---|---|---|---|---:|---:|---:|---:|
| Durian | Faheem | 162 MYR |  | equal, all 4 | 13.06 | 13.06 | 13.06 | 13.06 |
| DTF | Faheem | 320 MYR |  | equal, all 4 | 25.81 | 25.81 | 25.81 | 25.81 |
| Bowling | Faheem | 68 MYR |  | equal, all 4 | 5.48 | 5.48 | 5.48 | 5.48 |
| Karaoke | Qing Wen | 60 MYR |  | equal, all 4 | 4.84 | 4.84 | 4.84 | 4.84 |
| Chagee | Qing Wen | 59.6 SGD |  | equal, all 4 | 14.90 | 14.90 | 14.90 | 14.90 |
| Bus Fare Back | Lin Hui | 12 MYR |  | equal, all 4 | 0.97 | 0.97 | 0.97 | 0.97 |
| Nasi Lemak | Qing Wen | 48 MYR |  | custom: Lin Hui 10, Qing Wen 10, Faheem 15, Desmond 13 | 4.84 | 3.23 | 3.23 | 4.19 |
| Nasi Lemak (Faheem's Dabao) | Qing Wen | 10 MYR |  | custom: Faheem 10 | 3.23 |  |  |  |
| Grab To Nasi Lemak | Faheem | 16 MYR | yes | equal, all 4 | 1.29 | 1.29 | 1.29 | 1.29 |
| Grab To Mid Valley | Faheem | 8 MYR | yes | equal, all 4 | 0.65 | 0.65 | 0.65 | 0.65 |
| Grab To Tufting | Faheem | 24 MYR | yes | equal, all 4 | 1.94 | 1.94 | 1.94 | 1.94 |
| Grab To Daiman | Faheem | 36 MYR | yes | equal, all 4 | 2.90 | 2.90 | 2.90 | 2.90 |
| Grab To Nasi Lemak | Faheem | 15 MYR | yes | equal, all 4 | 1.21 | 1.21 | 1.21 | 1.21 |
| Grab To CIQ | Faheem | 24 MYR | yes | equal, all 4 | 1.94 | 1.94 | 1.94 | 1.94 |

### Trip 3 (1 SGD = 3.12 MYR)

| Item | Paid by | Amount | Grab | Split | Faheem | Lin Hui | Qing Wen | Desmond |
|---|---|---|---|---|---:|---:|---:|---:|
| Bowling | Faheem | 20 SGD |  | equal, all 4 | 5.00 | 5.00 | 5.00 | 5.00 |
| Founders Cafe | Qing Wen | 64.6 SGD |  | equal, all 4 | 16.15 | 16.15 | 16.15 | 16.15 |
| Bowl | Qing Wen | 19 SGD |  | equal, all 4 | 4.75 | 4.75 | 4.75 | 4.75 |
| Massage | Qing Wen | 100.24 SGD |  | equal, all 4 | 25.06 | 25.06 | 25.06 | 25.06 |
| Bus Fare Back | Lin Hui | 12 MYR |  | equal, all 4 | 0.96 | 0.96 | 0.96 | 0.96 |
| Yeon Cafe | Lin Hui | 150 MYR |  | custom: Qing Wen 41.5, Faheem 46.5, Desmond 37.5, Lin Hui 24.5 | 14.90 | 7.85 | 13.30 | 12.02 |
| Teh Tarik | Faheem | 27 MYR |  | custom: Desmond 27 |  |  |  | 8.65 |
| Grab To Founders | Faheem | 4 SGD | yes | equal, all 4 | 1.00 | 1.00 | 1.00 | 1.00 |
| Grab To Tufting | Faheem | 6 SGD | yes | equal, all 4 | 1.50 | 1.50 | 1.50 | 1.50 |
| Grab To Daiman | Faheem | 8 SGD | yes | equal, all 4 | 2.00 | 2.00 | 2.00 | 2.00 |
| Grab To Massage | Faheem | 6 SGD | yes | equal, all 4 | 1.50 | 1.50 | 1.50 | 1.50 |
| Grab To CIQ | Faheem | 3 SGD | yes | equal, all 4 | 0.75 | 0.75 | 0.75 | 0.75 |

### Trip 4 And Others (1 SGD = 3.12 MYR, rate assumed (only used for the 12 MYR bus fare))

| Item | Paid by | Amount | Grab | Split | Faheem | Lin Hui | Qing Wen | Desmond |
|---|---|---|---|---|---:|---:|---:|---:|
| Karaoke | Faheem | 20 SGD |  | equal, all 4 | 5.00 | 5.00 | 5.00 | 5.00 |
| Lok Lok 1 | Faheem | 25 SGD |  | equal, all 4 | 6.25 | 6.25 | 6.25 | 6.25 |
| Lok Lok 2 | Faheem | 26 SGD |  | equal, all 4 | 6.50 | 6.50 | 6.50 | 6.50 |
| Chagee | Faheem | 18 SGD |  | equal, all 4 | 4.50 | 4.50 | 4.50 | 4.50 |
| Massage | Faheem | 114 SGD |  | equal, all 4 | 28.50 | 28.50 | 28.50 | 28.50 |
| Chagee (Faheem And Desmond) | Faheem | 9 SGD |  | custom: Faheem 4.5, Desmond 4.5 | 4.50 |  |  | 4.50 |
| We Time | Qing Wen | 15.33 SGD |  | equal, all 4 | 3.83 | 3.83 | 3.83 | 3.83 |
| Bowling | Qing Wen | 37.18 SGD |  | equal, all 4 | 9.30 | 9.30 | 9.30 | 9.30 |
| K Fry | Qing Wen | 47 SGD |  | equal, all 4 | 11.75 | 11.75 | 11.75 | 11.75 |
| Bus Fare Back | Lin Hui | 12 MYR |  | equal, all 4 | 0.96 | 0.96 | 0.96 | 0.96 |
| Grab To CIQ | Faheem | 6.56 SGD | yes | equal, all 4 | 1.64 | 1.64 | 1.64 | 1.64 |
| Grab To We Time | Faheem | 2.63 SGD | yes | equal, all 4 | 0.66 | 0.66 | 0.66 | 0.66 |
| Grab To Lok Lok | Faheem | 2.95 SGD | yes | equal, all 4 | 0.74 | 0.74 | 0.74 | 0.74 |
| Grab To Tufting | Faheem | 4 SGD | yes | equal, all 4 | 1.00 | 1.00 | 1.00 | 1.00 |
| Grab To Daiman | Faheem | 4.25 SGD | yes | equal, all 4 | 1.06 | 1.06 | 1.06 | 1.06 |
| Grab To K Fry | Faheem | 1.6 SGD | yes | equal, all 4 | 0.40 | 0.40 | 0.40 | 0.40 |
| Grab To Massage 1 | Faheem | 2.95 SGD | yes | equal, all 4 | 0.74 | 0.74 | 0.74 | 0.74 |
| Grab To Massage 2 | Faheem | 2.3 SGD | yes | equal, all 4 | 0.58 | 0.58 | 0.58 | 0.58 |


**Balances before any payments** (+ gets money back, - owes)

| Person | Balance (SGD) |
|---|---:|
| Faheem | 474.77 |
| Lin Hui | -92.01 |
| Qing Wen | 5.55 |
| Desmond | -388.30 |

**Settle up** (fewest payments)

- Desmond pays Faheem 388.30
- Lin Hui pays Faheem 86.47
- Lin Hui pays Qing Wen 5.54

Lin Hui pays Qing Wen 5.54 while Qing Wen's balance shows 5.55. That 1 cent gap comes from rounding each balance separately and is expected.

**Notes on the data**
- Trip 4 had no exchange rate given. 3.12 is assumed, and it only affects the 12 MYR bus fare (0.96 each). Confirm with the group.
- Trip 2 Chagee was given as "14.90 each", so it is stored as 59.60 SGD split by 4.
- Trip 3 Founders Cafe (64.60), Bowl (19) and Massage (100.24) are SGD totals paid by Qing Wen.
- The bus fare back on Trips 2 and 4 is assumed to be 12 MYR, the same as Trips 1 and 3.
- Uneven splits: Trip 2 Nasi Lemak and Faheem's dabao (Qing Wen paid), Trip 3 Yeon Cafe (Lin Hui paid), Trip 3 Teh Tarik (Desmond only, Faheem paid), Trip 4 Chagee (Faheem and Desmond only, Faheem paid).
- No payments have been recorded yet.

## 7. Seed data (`supabase/seed.sql`)

Run this after `schema.sql`. Rows are in display order. Grab rides are flagged with `is_grab` and sorted to the bottom by the app.

```sql
insert into people (id, name, color, sort_order) values
  ('faheem','Faheem','blue',1),('linhui','Lin Hui','orange',2),('qingwen','Qing Wen','purple',3),('desmond','Desmond','gold',4);

insert into trips (id, name, rate, sort_order) values
  (1, 'Trip 1', 3.05, 1),
  (2, 'Trip 2', 3.1, 2),
  (3, 'Trip 3', 3.12, 3),
  (4, 'Trip 4 And Others', 3.12, 4);
select setval(pg_get_serial_sequence('trips','id'), 4);

insert into expenses (trip_id, item, paid_by, amount, currency, split_type, participants, shares, is_grab, sort_order) values
  (1, 'Breakfast', 'faheem', 27, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 1),
  (1, 'Photobooth', 'faheem', 50, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 2),
  (1, 'Massage', 'faheem', 484, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 3),
  (1, 'Chagee', 'faheem', 60, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 4),
  (1, 'Tufting', 'faheem', 360, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 5),
  (1, 'Haidilao', 'linhui', 654, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 6),
  (1, 'Bus Fare Back', 'linhui', 12, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 7),
  (1, 'Grab To Breakfast', 'faheem', 8, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 8),
  (1, 'Grab To Massage', 'faheem', 9, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 9),
  (1, 'Grab To Nimmies', 'faheem', 7, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 10),
  (1, 'Grab To Escape Room', 'faheem', 30, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 11),
  (1, 'Grab To CIQ', 'faheem', 30, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 12),
  (2, 'Durian', 'faheem', 162, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 13),
  (2, 'DTF', 'faheem', 320, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 14),
  (2, 'Bowling', 'faheem', 68, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 15),
  (2, 'Karaoke', 'qingwen', 60, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 16),
  (2, 'Chagee', 'qingwen', 59.6, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 17),
  (2, 'Bus Fare Back', 'linhui', 12, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 18),
  (2, 'Nasi Lemak', 'qingwen', 48, 'MYR', 'custom', '{}', '{"linhui":10,"qingwen":10,"faheem":15,"desmond":13}'::jsonb, false, 19),
  (2, 'Nasi Lemak (Faheem''s Dabao)', 'qingwen', 10, 'MYR', 'custom', '{}', '{"faheem":10}'::jsonb, false, 20),
  (2, 'Grab To Nasi Lemak', 'faheem', 16, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 21),
  (2, 'Grab To Mid Valley', 'faheem', 8, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 22),
  (2, 'Grab To Tufting', 'faheem', 24, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 23),
  (2, 'Grab To Daiman', 'faheem', 36, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 24),
  (2, 'Grab To Nasi Lemak', 'faheem', 15, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 25),
  (2, 'Grab To CIQ', 'faheem', 24, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 26),
  (3, 'Bowling', 'faheem', 20, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 27),
  (3, 'Founders Cafe', 'qingwen', 64.6, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 28),
  (3, 'Bowl', 'qingwen', 19, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 29),
  (3, 'Massage', 'qingwen', 100.24, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 30),
  (3, 'Bus Fare Back', 'linhui', 12, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 31),
  (3, 'Yeon Cafe', 'linhui', 150, 'MYR', 'custom', '{}', '{"qingwen":41.5,"faheem":46.5,"desmond":37.5,"linhui":24.5}'::jsonb, false, 32),
  (3, 'Teh Tarik', 'faheem', 27, 'MYR', 'custom', '{}', '{"desmond":27}'::jsonb, false, 33),
  (3, 'Grab To Founders', 'faheem', 4, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 34),
  (3, 'Grab To Tufting', 'faheem', 6, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 35),
  (3, 'Grab To Daiman', 'faheem', 8, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 36),
  (3, 'Grab To Massage', 'faheem', 6, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 37),
  (3, 'Grab To CIQ', 'faheem', 3, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 38),
  (4, 'Karaoke', 'faheem', 20, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 39),
  (4, 'Lok Lok 1', 'faheem', 25, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 40),
  (4, 'Lok Lok 2', 'faheem', 26, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 41),
  (4, 'Chagee', 'faheem', 18, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 42),
  (4, 'Massage', 'faheem', 114, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 43),
  (4, 'Chagee (Faheem And Desmond)', 'faheem', 9, 'SGD', 'custom', '{}', '{"faheem":4.5,"desmond":4.5}'::jsonb, false, 44),
  (4, 'We Time', 'qingwen', 15.33, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 45),
  (4, 'Bowling', 'qingwen', 37.18, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 46),
  (4, 'K Fry', 'qingwen', 47, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 47),
  (4, 'Bus Fare Back', 'linhui', 12, 'MYR', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, false, 48),
  (4, 'Grab To CIQ', 'faheem', 6.56, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 49),
  (4, 'Grab To We Time', 'faheem', 2.63, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 50),
  (4, 'Grab To Lok Lok', 'faheem', 2.95, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 51),
  (4, 'Grab To Tufting', 'faheem', 4, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 52),
  (4, 'Grab To Daiman', 'faheem', 4.25, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 53),
  (4, 'Grab To K Fry', 'faheem', 1.6, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 54),
  (4, 'Grab To Massage 1', 'faheem', 2.95, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 55),
  (4, 'Grab To Massage 2', 'faheem', 2.3, 'SGD', 'equal', array['faheem','linhui','qingwen','desmond'], '{}'::jsonb, true, 56);
```
