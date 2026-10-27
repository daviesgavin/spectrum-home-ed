// Spectrum Home Ed: start a Stripe Checkout for a plan, or open the Stripe customer portal.
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICES (JSON: {"family_month":"price_...","family_year":"price_...","plus_month":"price_...","plus_year":"price_..."})
// Settings: turn OFF "Verify JWT with legacy secret" (this function checks the signed-in user itself).
import Stripe from "npm:stripe@22.6.2";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const APP_URL = Deno.env.get("APP_URL") ?? "https://spectrumhomeed.com/app/";

function firstKey(name: string) {
  try { const v = JSON.parse(Deno.env.get(name) ?? "{}"); return (Array.isArray(v) ? v[0] : Object.values(v)[0]) as string | undefined; } catch { return undefined; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) return json({ error: "Payments aren't set up yet." }, 500);
  const stripe = new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() });
  let prices: Record<string, string> = {};
  try { prices = JSON.parse(Deno.env.get("STRIPE_PRICES") ?? "{}"); } catch { /* empty */ }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || firstKey("SUPABASE_PUBLISHABLE_KEYS")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || firstKey("SUPABASE_SECRET_KEYS")!;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const admin = createClient(url, service);

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Please sign in again." }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const { data: sub } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();

  try {
    // Delete the whole account: cancel Stripe, remove photos and videos, then the user (database rows cascade).
    if (body.action === "delete_account") {
      const email = (user.email ?? "").toLowerCase();
      if (String(body.confirm_email ?? "").trim().toLowerCase() !== email) return json({ error: "Type your email address exactly to confirm." }, 400);
      if (email === "daviesgavin@hotmail.com") return json({ error: "The owner account can't be deleted from the app." }, 403);
      if (sub?.stripe_subscription_id && ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(sub.status)) {
        try { await stripe.subscriptions.cancel(sub.stripe_subscription_id); }
        catch (e: any) { if (e?.code !== "resource_missing") { console.error("Cancel failed", e); return json({ error: "Couldn't cancel your subscription. Please try again, or email hello@spectrumhomeed.com." }, 502); } }
      }
      // Files: everything under this user's folder in the evidence bucket
      const bucket = admin.storage.from("evidence");
      const paths: string[] = [];
      const { data: rows } = await admin.from("evidence").select("path").eq("parent_id", user.id);
      (rows ?? []).forEach((r: any) => paths.push(r.path));
      const { data: folders } = await bucket.list(user.id, { limit: 1000 });
      for (const f of folders ?? []) {
        const { data: files } = await bucket.list(`${user.id}/${f.name}`, { limit: 1000 });
        (files ?? []).forEach((x: any) => paths.push(`${user.id}/${f.name}/${x.name}`));
      }
      const unique = [...new Set(paths)];
      for (let i = 0; i < unique.length; i += 100) {
        const { error } = await bucket.remove(unique.slice(i, i + 100));
        if (error) { console.error("File delete failed", error); return json({ error: "Couldn't delete your photos and videos. Please try again." }, 500); }
      }
      await admin.from("comp_access").delete().eq("email", email);
      await admin.from("admins").delete().eq("email", email);
      const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
      if (delErr) { console.error("User delete failed", delErr); return json({ error: "Couldn't delete your account. Please email hello@spectrumhomeed.com." }, 500); }
      console.log("Account deleted", user.id, `${unique.length} files`);
      return json({ deleted: true });
    }

    if (body.action === "portal") {
      if (!sub?.stripe_customer_id) return json({ error: "No subscription found for this account." }, 404);
      const portal = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${APP_URL}#/billing` });
      return json({ url: portal.url });
    }

    const price = prices[body.plan];
    if (!price) return json({ error: "Choose a plan." }, 400);
    if (sub && ["active", "trialing", "past_due"].includes(sub.status)) {
      return json({ error: "You already have a subscription. Use Manage subscription to change it." }, 409);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      ...(sub?.stripe_customer_id ? { customer: sub.stripe_customer_id } : { customer_email: user.email }),
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      success_url: `${APP_URL}#/billing?status=success`,
      cancel_url: `${APP_URL}#/billing?status=cancelled`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("Stripe error", e);
    return json({ error: "Payment service error. Please try again." }, 502);
  }
});
