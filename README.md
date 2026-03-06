# Reclaimed Marketplace

A simple Etsy/Vinted-style marketplace for reclaimed materials and architectural salvage. Sellers can be **reclamation yards** or **individuals**. Buyers can browse by location, category and condition, and pay on-platform with Stripe Connect.

## Stack

- **Next.js 16** (App Router), TypeScript, Tailwind CSS
- **Prisma** + PostgreSQL
- **NextAuth v5** (credentials)
- **Stripe Connect** (seller payouts, platform fee)
- **Vercel Blob** (listing images)

## Setup

1. **Clone and install**

   ```bash
   cd reclaimed-marketplace
   npm install
   ```

2. **Database**

   - Create a PostgreSQL database (local or e.g. Vercel Postgres, Supabase).
   - Copy `.env.example` to `.env` and set `DATABASE_URL` (required at runtime; Prisma 7 uses `@prisma/adapter-pg` with this URL).
   - Run migrations (when DB is available):

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

3. **Environment variables**

   - `DATABASE_URL` – PostgreSQL connection string
   - `NEXTAUTH_SECRET` – e.g. `openssl rand -base64 32`
   - `NEXTAUTH_URL` – e.g. `http://localhost:3000`
   - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` – from Stripe Dashboard (enable Connect)
   - `BLOB_READ_WRITE_TOKEN` – from Vercel project → Storage → Blob

4. **Stripe webhook**

   - In Stripe Dashboard → Developers → Webhooks, add endpoint:  
     `https://your-domain.com/api/stripe/webhooks`
   - Event: `checkout.session.completed`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Features

- **Auth**: Sign up, sign in (email/password), seller type onboarding (individual / reclamation yard)
- **Stripe Connect**: Sellers complete Express onboarding; platform fee on each sale
- **Listings**: Multi-step flow (photos, title, price, condition, category, location), draft/publish
- **Discovery**: Home, search with filters (category, condition, postcode, seller type), listing and seller pages
- **Checkout**: Stripe Checkout; webhook creates Order and marks listing sold

## Scripts

- `npm run dev` – development server
- `npm run build` – Prisma generate + Next build
- `npm run db:generate` – generate Prisma client
- `npm run db:migrate` – run migrations
- `npm run db:seed` – seed categories
