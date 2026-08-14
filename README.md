# Personal Finance App

Personal finance web app built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, Supabase Postgres, Recharts, and Zod.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Recharts
- Zod

## Main Features

- Email/password signup and login
- Forgot password and reset password
- Protected app routes
- Dashboard overview
- Transactions with CSV/XLS/XLSX import
- Expense analysis
- Income tracking
- Savings tracking and savings goal progress
- Live inflation, policy-rate and FX market overview
- Embedded TradingView stock and ETF market data
- Live residential property price trends and mortgage calculator
- Settings and categories

## Environment Variables

Create `.env.development.local` for local development and point it at the development Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-publishable-key"
NEXT_PUBLIC_SITE_URL="http://localhost:5173"
```

The file is ignored by Git. Local development and Vercel Preview must never use the production Supabase project.

Stocks and ETFs are displayed through official TradingView widgets, so no stock API key is required. Keep the built-in TradingView attribution visible. Inflation, policy rates and FX load from their public providers; unavailable providers produce an unavailable state rather than sample market values.

Use this environment split in Vercel:

| Variable | Production | Preview |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase URL | Development Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production publishable key | Development publishable key |
| `NEXT_PUBLIC_SITE_URL` | Production app URL | Not set; Vercel supplies the deployment URL |

For production, `NEXT_PUBLIC_SITE_URL` should be the real deployed URL, for example:

```env
NEXT_PUBLIC_SITE_URL="https://your-app-name.vercel.app"
```

## Supabase Setup

1. Create a Supabase project.
2. Open `Authentication > Providers`.
3. Enable `Email`.
4. Open `Project Settings > API`.
5. Copy:
   - Project URL
   - Publishable key
6. Open `SQL Editor`.
7. Run:
   - [supabase/schema.sql](</C:/Users/bjarturbg/OneDrive - Public Administration/Desktop/Finance app/supabase/schema.sql>)
   - [supabase/savings-buckets-update.sql](</C:/Users/bjarturbg/OneDrive - Public Administration/Desktop/Finance app/supabase/savings-buckets-update.sql>)

Existing databases must also rerun `supabase/bills-update.sql` after pulling the monthly bills update. The migration keeps paid historical months, assigns unscoped legacy bills to the current month, and does not copy them into future months.

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploying To Vercel

### 1. Put the project in Git

This folder is currently not a Git repository, so start there.

```bash
git init
git add .
git commit -m "Initial commit"
```

Then create a GitHub repository and push the code:

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git branch -M main
git push -u origin main
```

### 2. Import into Vercel

1. Go to [Vercel](https://vercel.com).
2. Click `Add New... > Project`.
3. Import your GitHub repository.
4. Let Vercel detect `Next.js`.

### 3. Add Environment Variables in Vercel

Add these variables in the Vercel project settings using the environment split above:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Set `NEXT_PUBLIC_SITE_URL` for Production only, for example:

```env
NEXT_PUBLIC_SITE_URL="https://your-app-name.vercel.app"
```

### 4. Deploy

Use the default settings:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`

Then click `Deploy`.

### 5. Update Supabase Auth URLs

Configure both Supabase projects under `Authentication > URL Configuration`:

1. Production project: set `Site URL` to the production Vercel URL and allow `https://your-app-name.vercel.app/**`.
2. Development project: set `Site URL` to `http://localhost:5173`.
3. Development project: allow `http://localhost:5173/**`.
4. Development project: allow `https://*-your-vercel-team-slug.vercel.app/**` for Preview deployments.

### 6. Test Production

Test these flows on the deployed site:

- Signup
- Login
- Logout
- Forgot password
- Reset password
- Dashboard load
- Transactions load
- CSV import
- Expense page
- Savings page

## Notes

- The app uses only the Supabase publishable key in the browser.
- Do not put a Supabase secret key in `NEXT_PUBLIC_...` variables.
- Row Level Security protects user-owned data in Supabase.
- This workspace is slow for local production builds because it lives in OneDrive on Windows, so Vercel is the better place to verify the real production build.
