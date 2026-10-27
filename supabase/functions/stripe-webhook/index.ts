// Spectrum Home Ed: keep the subscriptions table in sync with Stripe.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICES.
// Settings: turn OFF "Verify JWT with legacy secret" (Stripe calls this; the Stripe signature is checked instead).
// Stripe events to send: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
import Stripe from "npm:stripe@22.6.2";
import { createClient } from "jsr:@supabase/supabase-js@2";

function firstKey(name: string) {
  try { const v = JSON.parse(Deno.env.get(name) ?? "{}"); return (Array.isArray(v) ? v[0] : Object.values(v)[0]) as string | undefined; } catch { return undefined; }
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { httpClient: Stripe.createFetchHttpClient() });
const crypto = Stripe.createSubtleCryptoProvider();
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || firstKey("SUPABASE_SECRET_KEYS")!);

function planFor(priceId?: string) {
  try {
    const prices: Record<string, string> = JSON.parse(Deno.env.get("STRIPE_PRICES") ?? "{}");
    const key = Object.keys(prices).find((k) => prices[k] === priceId);
    return key ? key.split("_")[0] : null; // "family" or "plus"
  } catch { return null; }
}

async function save(sub: any, fallbackUserId?: string | null) {
  const userId = sub.metadata?.user_id || fallbackUserId;
  if (!userId) { console.error("No user id on subscription", sub.id); return; }
  const item = sub.items?.data?.[0];
  const end = item?.current_period_end ?? sub.current_period_end;
  const { error } = await admin.from("subscriptions").upsert({
    user_id: userId,
    status: sub.status,
    plan: planFor(item?.price?.id),
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    stripe_subscription_id: sub.id,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("Save failed", error);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: any;
  try { event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, crypto); }
  catch (e) { console.error("Bad signature", e); return new Response("Bad signature", { status: 400 }); }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
          await save(sub, s.client_reference_id || s.metadata?.user_id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await save(event.data.object);
        break;
    }
  } catch (e) {
    console.error("Webhook handling failed", e);
    return new Response("Handler error", { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
