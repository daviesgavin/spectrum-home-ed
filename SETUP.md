# Spectrum Home Ed: connecting the family app

The family app lives at `spectrumhomeed.com/app/`. Until it's connected it runs in **demo mode** (data saved on the device, template plans). These steps switch on real accounts and the AI lesson planner. Allow about 20 minutes.

## 1. Create the Supabase project
1. Go to supabase.com, sign in, click **New project**.
2. Name it `spectrum-home-ed`, choose region **Sydney**, set a database password (store it in your password manager).

## 2. Create the database
1. Open **SQL Editor → New query**.
2. Paste everything in `supabase/schema.sql` and click **Run**. You should see "Success".

## 3. Set up sign-in emails
1. **Authentication → URL Configuration**:
   - Site URL: `https://spectrumhomeed.com/app/`
   - Redirect URLs: add `https://spectrumhomeed.com/app/`
2. **Authentication → Sign In / Providers → Email**: leave **Confirm email** on.
3. Later, before launch: **Authentication → SMTP** to send from your own address (Supabase's built-in email is rate limited).

## 4. Add the lesson planner
1. Get an API key from console.anthropic.com (**API Keys → Create key**). Add a spending limit under **Billing**.
2. In Supabase: **Edge Functions → Secrets → Add new secret**: name `ANTHROPIC_API_KEY`, value = your key.
3. **Edge Functions → Deploy a new function → Via editor**, name it `generate-plan`, replace the sample code with everything in `supabase/functions/generate-plan/index.ts`, click **Deploy**.
4. Optional secrets: `DAILY_PLAN_LIMIT` (default 10 plans per family per day), `ANTHROPIC_MODEL`.

## 5. Connect the app
In Supabase: **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `app/config.js`:

```js
window.SHE_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "eyJ..."
};
```

The anon key is designed to be public; the database rules stop anyone seeing another family's data. **Never** put the service role key or the Anthropic key in this file.

## Costs to expect
- Supabase free tier covers early families; Pro is about US$25/month when you outgrow it.
- Each AI weekly plan costs a few cents in Anthropic usage.
