// Spectrum Home Ed: generate a personalised weekly lesson plan with Claude.
// Deploy: Supabase dashboard > Edge Functions > Deploy a new function > name "generate-plan" > paste this file.
// Secrets needed (Edge Functions > Secrets): ANTHROPIC_API_KEY. Optional: ANTHROPIC_MODEL, DAILY_PLAN_LIMIT.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Learning areas by state. Keep in sync with app/frameworks.js.
const FRAMEWORKS: Record<string, { name: string; regulator: string; areas: string[] }> = {
  WA: { name: "Western Australian Curriculum", regulator: "Department of Education WA (home education moderator)", areas: ["English", "Mathematics", "Science", "HASS", "Health and Physical Education", "The Arts", "Technologies", "Languages"] },
  NSW: { name: "NSW syllabuses (NESA)", regulator: "NSW Education Standards Authority (NESA)", areas: ["English", "Mathematics", "Science and Technology", "HSIE", "Creative Arts", "PDHPE", "Languages"] },
  VIC: { name: "Victorian Curriculum 2.0", regulator: "Victorian Registration and Qualifications Authority (VRQA)", areas: ["English", "Mathematics", "Science", "Humanities", "Health and Physical Education", "The Arts", "Technologies", "Languages"] },
  QLD: { name: "Australian Curriculum v9 (as used in Queensland)", regulator: "Home Education Unit, Queensland Department of Education", areas: ["English", "Mathematics", "Science", "HASS", "Health and Physical Education", "The Arts", "Technologies", "Languages"] },
  SA: { name: "Australian Curriculum v9", regulator: "Department for Education SA (home education exemption)", areas: ["English", "Mathematics", "Science", "HASS", "Health and Physical Education", "The Arts", "Technologies", "Languages"] },
  TAS: { name: "Australian Curriculum v9", regulator: "Office of the Education Registrar, Tasmania", areas: ["English", "Mathematics", "Science", "HASS", "Health and Physical Education", "The Arts", "Technologies", "Languages"] },
  ACT: { name: "Australian Curriculum v9", regulator: "ACT Education Directorate (home education liaison)", areas: ["English", "Mathematics", "Science", "HASS", "Health and Physical Education", "The Arts", "Technologies", "Languages"] },
  NT: { name: "Australian Curriculum v9", regulator: "NT Department of Education", areas: ["English", "Mathematics", "Science", "HASS", "Health and Physical Education", "The Arts", "Technologies", "Languages"] },
};

const SUPPORT: Record<string, string> = {
  high: "High support needs: likely nonverbal or minimally speaking, may need hand-over-hand help, very short attention windows. Lessons 5-10 minutes, functional and sensory-friendly.",
  moderate: "Moderate support needs: some functional communication, follows short visual routines. Lessons 10-15 minutes with visual supports.",
  low: "Low support needs: communicates in sentences, can follow multi-step instructions with support. Lessons 15-25 minutes.",
  advanced: "Advanced learner on the spectrum: may be working at or above year level in some areas, needs interest-led depth and social/emotional support. Lessons 20-40 minutes.",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function ageFrom(birthYear?: number | null) {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in model reply");
  return JSON.parse(text.slice(start, end + 1));
}

function clean(plan: any, areas: string[]) {
  const asStr = (v: unknown, max = 600) => (typeof v === "string" ? v.slice(0, max) : "");
  const days = Array.isArray(plan?.days) ? plan.days.slice(0, 7) : [];
  return {
    title: asStr(plan?.title, 120) || "Weekly plan",
    summary: asStr(plan?.summary, 800),
    focus_goals: (Array.isArray(plan?.focus_goals) ? plan.focus_goals : []).map((g: unknown) => asStr(g, 200)).filter(Boolean).slice(0, 6),
    days: days.map((d: any) => ({
      day: asStr(d?.day, 20),
      regulation: asStr(d?.regulation, 300),
      lessons: (Array.isArray(d?.lessons) ? d.lessons : []).slice(0, 6).map((l: any) => ({
        title: asStr(l?.title, 120),
        areas: (Array.isArray(l?.areas) ? l.areas : []).filter((a: unknown) => typeof a === "string" && areas.includes(a)).slice(0, 3),
        minutes: Math.max(3, Math.min(60, Number(l?.minutes) || 10)),
        goal: asStr(l?.goal, 300),
        hook: asStr(l?.hook, 300),
        materials: asStr(l?.materials, 300),
        steps: (Array.isArray(l?.steps) ? l.steps : []).map((s: unknown) => asStr(s, 300)).filter(Boolean).slice(0, 8),
        communication: asStr(l?.communication, 300),
        adjustments: asStr(l?.adjustments, 300),
        evidence: asStr(l?.evidence, 200),
      })),
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "The lesson planner isn't set up yet (missing ANTHROPIC_API_KEY secret)." }, 500);

  const url = Deno.env.get("SUPABASE_URL")!;
  // Works with both the legacy keys and the newer publishable/secret keys
  const firstKey = (name: string) => { try { const v = JSON.parse(Deno.env.get(name) ?? "{}"); return Array.isArray(v) ? v[0] : Object.values(v)[0]; } catch { return undefined; } };
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || (firstKey("SUPABASE_PUBLISHABLE_KEYS") as string);
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (firstKey("SUPABASE_SECRET_KEYS") as string);
  if (!anon || !service) return json({ error: "Server keys are missing. Check the function's environment." }, 500);
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(url, service);

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Please sign in again." }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const { child_id, week_start, focus, extra } = body ?? {};
  if (!child_id || !/^\d{4}-\d{2}-\d{2}$/.test(week_start ?? "")) return json({ error: "Choose a child and a week." }, 400);

  const { data: child, error: childErr } = await userClient.from("children").select("*").eq("id", child_id).single();
  if (childErr || !child) return json({ error: "Child not found." }, 404);

  const limit = Number(Deno.env.get("DAILY_PLAN_LIMIT") ?? "10");
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from("generations").select("id", { count: "exact", head: true }).eq("parent_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= limit) return json({ error: `You've generated ${limit} plans in the last 24 hours. Try again tomorrow.` }, 429);

  const fw = FRAMEWORKS[child.state] ?? FRAMEWORKS.WA;
  const age = ageFrom(child.birth_year);
  const minutes = Number(child.minutes_per_day) || 60;

  const system = `You write home education lesson plans for Australian parents of autistic, nonverbal and other special-needs children.
Principles: interest-led (use the child's favourite things as the hook in nearly every lesson), regulation before learning, communication in every lesson (respect AAC, signs, gestalt scripts as real language), short realistic sessions, real life counts as learning (shops, cooking, outings), success is participation.
Write in plain Australian English for a tired parent: short sentences, concrete steps, no jargon. Never use the child's interests in a way that mocks them. Keep it safe: adult supervision for water, heat, knives and outings.
Return ONLY valid JSON, no markdown.`;

  const user_prompt = `Child profile
- Name: ${child.name}
- Age: ${age ?? "unknown"}
- State: ${child.state}; framework: ${fw.name}; regulator: ${fw.regulator}
- Support level: ${SUPPORT[child.support_level] ?? child.support_level}
- Communication: ${child.communication || "not stated"}
- Interests: ${(child.interests || []).join(", ") || "not stated"}
- Sensory notes: ${child.sensory_notes || "none"}
- Parent's goals: ${child.goals || "none"}
- Structured learning time per day: about ${minutes} minutes
${focus ? `- Focus this week: ${String(focus).slice(0, 300)}` : ""}
${extra ? `- Extra notes from parent: ${String(extra).slice(0, 500)}` : ""}

Write a Monday to Friday plan for the week starting ${week_start}.
- Fit each day's lessons into about ${minutes} minutes in total.
- Across the week, cover every one of these learning areas at least once, using these exact names: ${fw.areas.join("; ")}.
- Each lesson lists 1 to 3 of those learning areas.
- Pitch goals at the child's real level, not their age.

JSON shape:
{"title": string, "summary": string (2 sentences), "focus_goals": [string, 3-5 items],
 "days": [{"day": "Monday", "regulation": string (one sensory or movement suggestion for the day),
   "lessons": [{"title": string, "areas": [string], "minutes": number, "goal": string (one observable skill), "hook": string, "materials": string,
     "steps": [string, 3-6 items], "communication": string (phrase, sign or AAC word to model), "adjustments": string, "evidence": string (what to photo, video or record)}]}]}`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
      max_tokens: 12000,
      system,
      messages: [{ role: "user", content: user_prompt }],
    }),
  });
  if (!resp.ok) {
    console.error("Anthropic error", resp.status, await resp.text());
    return json({ error: "The lesson planner is busy. Please try again in a minute." }, 502);
  }
  const out = await resp.json();
  const text = (out.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");

  let plan;
  try { plan = clean(extractJson(text), fw.areas); }
  catch (e) { console.error("Parse error", e, text.slice(0, 500)); return json({ error: "The plan came back in the wrong format. Please try again." }, 502); }
  if (!plan.days.length) return json({ error: "The plan came back empty. Please try again." }, 502);

  await admin.from("generations").insert({ parent_id: user.id });

  const { data: saved, error: saveErr } = await userClient.from("plans").insert({
    child_id, week_start, title: plan.title, content: { ...plan, framework: fw.name, areas: fw.areas }, source: "ai",
  }).select().single();
  if (saveErr) return json({ error: "Couldn't save the plan: " + saveErr.message }, 500);

  return json({ plan: saved });
});
