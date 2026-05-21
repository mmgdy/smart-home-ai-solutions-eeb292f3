# Switch Supabase Project

Use this when moving the app to a Supabase project under a different account.

## 1. Create the new Supabase project

Create a new project in the new Supabase account. From Project Settings > API, copy:

- Project URL
- anon/public publishable key
- project ref, which is the subdomain in `https://PROJECT_REF.supabase.co`

## 2. Update local app env

Edit `.env`:

```sh
VITE_SUPABASE_PROJECT_ID="your-new-project-ref"
VITE_SUPABASE_PUBLISHABLE_KEY="your-new-anon-publishable-key"
VITE_SUPABASE_URL="https://your-new-project-ref.supabase.co"
```

Also update `supabase/config.toml`:

```toml
project_id = "your-new-project-ref"
```

## 3. Apply database migrations

Install or use the Supabase CLI, then authenticate with the new account:

```sh
npx supabase login
npx supabase link --project-ref your-new-project-ref
npx supabase db push
```

The migrations in `supabase/migrations` create the app tables, RLS policies, and storage buckets used by the frontend and edge functions.

## 4. Deploy edge functions

Deploy every function in `supabase/functions`:

```sh
npx supabase functions deploy paysky-checkout
npx supabase functions deploy smart-home-consultant
npx supabase functions deploy import-products
npx supabase functions deploy enhance-products
npx supabase functions deploy analyze-floor-plan
npx supabase functions deploy update-prices-amazon
npx supabase functions deploy admin-auth
npx supabase functions deploy send-order-notification
npx supabase functions deploy market-sync
npx supabase functions deploy scrape-product
npx supabase functions deploy internalize-product-images
```

## 5. Add function secrets

In the new Supabase project, add any secrets used by the edge functions. The project automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, but third-party integrations still need their own values:

```sh
LOVABLE_API_KEY
HUGGINGFACE_API_KEY
PERPLEXITY_API_KEY
PAYSKY_MERCHANT_ID
PAYSKY_TERMINAL_ID
PAYSKY_SECRET_KEY
RESEND_API_KEY
GROQ_API_KEY
```

## 6. Update deployed app env vars

Wherever the website is hosted, update these environment variables to the new values:

```sh
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

Then redeploy the frontend.

## Notes

- Existing customer/order/product data will not move unless you export it from the old project. Without access to the old Supabase account, only the schema and seed data present in migrations can be recreated.
- Auth users from the old Supabase project also cannot be moved without access to the old project.
- `.env` contains live project credentials and should stay out of git.
