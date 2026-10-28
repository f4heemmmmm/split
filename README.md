# Split

Splits group trip costs and shows who owes whom. Anyone with the link can view. Only the owner can add, edit or delete, after entering a passcode.

Next.js 15 (App Router), React 19, Supabase, plain CSS. Full spec in [HANDOFF.md](HANDOFF.md).

## Setup

1. **Supabase.** Create a project. In the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`. Copy the project URL and the secret key (Project Settings, API Keys).
2. **Env.** Copy `.env.example` to `.env.local` and fill in:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`)
   - `ADMIN_PASSCODE`
3. **Run.**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000. Sign in with the passcode to edit.

## Deploy

1. Import the repo in Vercel and add the same 3 env vars.
2. In the Vercel project, go to Settings, Domains and add `split.faheemkamel.com`. If the domain's DNS is not on Vercel, add a CNAME `split` pointing to `cname.vercel-dns.com` at the registrar.

## How it works

- The browser never talks to Supabase. All reads and writes run on the server with the secret key. RLS is on with no policies, so the public anon key can do nothing.
- MYR amounts are converted with each trip's rate (MYR per 1 SGD). Maths keeps full precision and rounds half up to 2dp only for display.
- Settle up matches the biggest debtor with the biggest creditor until everyone is within 1 cent.
- Changing `ADMIN_PASSCODE` signs everyone out.

## Files

```
app/            pages, server actions (app/actions.ts), styles
components/     ExpenseForm, ConfirmButton, ActionForm, TripForm, Chip
lib/money.ts    toSgd, shares, round2, balances, settle
lib/data.ts     types and getAll()
lib/auth.ts     passcode check and admin cookie
supabase/       schema.sql, seed.sql
```
