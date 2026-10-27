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

// Recommended weekly learning time (keep in sync with app/planner-data.js). NSW guidance suggests about 15 hours a week for primary.
const GROUP: Record<string, string> = { "English": "eng", "Mathematics": "math", "Languages": "lang" };
function recommended(age: number | null, areas: string[]) {
  let stage: string, weekly: number;
  if (age != null && age <= 5) { stage = "Early years"; weekly = 600; }
  else if (age == null || age <= 12) { stage = "Primary"; weekly = 900; }
  else if (age <= 17) { stage = "Secondary"; weekly = 1200; }
  else { stage = "Adult life skills"; weekly = 900; }
  const w: Record<string, number> = {}; let rest = 1; const others: string[] = [];
  for (const a of areas) { const g = GROUP[a]; if (g === "eng") { w[a] = .3; rest -= .3; } else if (g === "math") { w[a] = .2; rest -= .2; } else if (g === "lang") { w[a] = .03; rest -= .03; } else others.push(a); }
  for (const a of others) w[a] = rest / others.length;
  const targets = Object.fromEntries(areas.map((a) => [a, Math.round(weekly * w[a] / 5) * 5]));
  return { stage, weekly, perDay: Math.round(weekly / 5), targets };
}

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

// Models sometimes return arrays as JSON strings, or wrap the object in an extra key. Accept both.
function arr(v: unknown): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("[")) { try { const p = JSON.parse(t); if (Array.isArray(p)) return p; } catch { /* ignore */ } }
    return t ? t.split(/\n+|;\s*/).map((x) => x.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim()).filter(Boolean) : [];
  }
  return [];
}
function obj(v: any): any {
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { return {}; } }
  if (v && typeof v === "object" && !Array.isArray(v) && !("lessons" in v) && !("title" in v) && Object.keys(v).length === 1) return obj(Object.values(v)[0]);
  return v ?? {};
}

function clean(plan: any, areas: string[]) {
  const asStr = (v: unknown, max = 600) => (typeof v === "string" ? v.slice(0, max) : "");
  const days = arr(plan?.days).map(obj).slice(0, 7);
  return {
    title: asStr(plan?.title, 120) || "Weekly plan",
    summary: asStr(plan?.summary, 800),
    focus_goals: arr(plan?.focus_goals).map((g: unknown) => asStr(g, 200)).filter(Boolean).slice(0, 6),
    days: days.map((d: any) => ({
      day: asStr(d?.day, 20),
      regulation: asStr(d?.regulation, 300),
      lessons: arr(d?.lessons ?? d?.activities).map(obj).slice(0, 12).map((l: any) => ({
        title: asStr(l?.title, 120),
        areas: arr(l?.areas).filter((a: unknown) => typeof a === "string" && areas.includes(a)).slice(0, 3),
        minutes: Math.max(3, Math.min(120, Number(l?.minutes) || 10)),
        goal: asStr(l?.goal, 300),
        hook: asStr(l?.hook, 300),
        materials: asStr(l?.materials, 300),
        steps: arr(l?.steps).map((s: unknown) => asStr(s, 300)).filter(Boolean).slice(0, 8),
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

  // Access: free-list emails, admins and subscribers get unlimited AI plans; everyone else gets a free starter allowance
  const { data: access } = await userClient.rpc("my_access");
  const unlimited = !!(access?.comp || access?.subscribed || access?.is_admin);
  const freeAllowance = Number(Deno.env.get("FREE_AI_PLANS") ?? "1");
  if (!unlimited && Number(access?.ai_plans_used ?? 0) >= freeAllowance) {
    return json({ error: "Your free starter plan has been used. Subscribe for unlimited personalised plans, or create a free template plan.", code: "upgrade" }, 402);
  }

  const limit = Number(Deno.env.get("DAILY_PLAN_LIMIT") ?? "10");
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from("generations").select("id", { count: "exact", head: true }).eq("parent_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= limit) return json({ error: `You've generated ${limit} plans in the last 24 hours. Try again tomorrow.` }, 429);

  const fw = FRAMEWORKS[child.state] ?? FRAMEWORKS.WA;
  const age = ageFrom(child.birth_year);
  const rec = recommended(age, fw.areas);
  const adjusted = child.time_mode === "adjusted" && Number(child.minutes_per_day) > 0;
  const minutes = adjusted ? Number(child.minutes_per_day) : rec.perDay;
  const targets = adjusted ? null : rec.targets;

  const system = `You write home education lesson plans for Australian parents of autistic, nonverbal and other special-needs children.
Principles: interest-led (use the child's favourite things as the hook in nearly every lesson), regulation before learning, communication in every lesson (respect AAC, signs, gestalt scripts as real language), short realistic sessions, real life counts as learning (shops, cooking, outings), success is participation.
Write in plain Australian English for a tired parent: short sentences, concrete steps, no jargon. Never use the child's interests in a way that mocks them. Keep it safe: adult supervision for water, heat, knives and outings.`;

  const interests: string[] = (child.interests || []).length ? child.interests : ["their favourite things"];
  const profile = `Child profile
- Name: ${child.name}
- Age: ${age ?? "unknown"}
- State: ${child.state}; framework: ${fw.name}; regulator: ${fw.regulator}
- Support level: ${SUPPORT[child.support_level] ?? child.support_level}
- Communication: ${child.communication || "not stated"}
- Interests: ${interests.join(", ")}
- Sensory notes: ${child.sensory_notes || "none"}
- Parent's goals: ${child.goals || "none"}
- Learning time: about ${minutes} minutes a day${adjusted ? ` (reduced by the parent: ${child.time_reason || "no reason given"})` : ` (recommended for ${rec.stage.toLowerCase()} age)`}
${focus ? `- Focus this week: ${String(focus).slice(0, 300)}` : ""}
${extra ? `- Extra notes from parent: ${String(extra).slice(0, 500)}` : ""}`;

  const str = { type: "string" };
  const lessonSchema = {
    type: "object",
    properties: {
      title: str,
      areas: { type: "array", items: { type: "string", enum: fw.areas }, minItems: 1, maxItems: 3 },
      minutes: { type: "integer" },
      goal: { ...str, description: "One observable skill" },
      hook: { ...str, description: "How the child's interest is used" },
      materials: str,
      steps: { type: "array", items: str, minItems: 3, maxItems: 5 },
      communication: { ...str, description: "Phrase, sign or AAC word to model" },
      adjustments: str,
      evidence: { ...str, description: "What to photo, video or record" },
    },
    required: ["title", "areas", "minutes", "goal", "hook", "steps", "communication", "adjustments", "evidence"],
  };
  const daySchema = { type: "object", properties: { lessons: { type: "array", items: lessonSchema, minItems: 2, description: "Every lesson and hands-on activity for the day, in order" }, regulation: { ...str, description: "One short sensory or movement suggestion for the day" } }, required: ["lessons", "regulation"] };
  const overviewSchema = { type: "object", properties: { title: str, summary: { ...str, description: "Two sentences" }, focus_goals: { type: "array", items: str, minItems: 3, maxItems: 5 } }, required: ["title", "summary", "focus_goals"] };

  const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5";
  // Calls the model and checks the result. Tries the tool twice, then once more asking for plain JSON text with extra room.
  async function callTool(prompt: string, name: string, schema: unknown, maxTokens: number, ok: (v: any) => boolean = () => true) {
    let lastGood: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const plain = attempt === 1;
      let resp: Response;
      try { resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: AbortSignal.timeout(150_000),
        headers: { "x-api-key": apiKey!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model, max_tokens: maxTokens, system,
          ...(plain ? {} : {
            tools: [{ name, description: "Save the result. Always call this tool exactly once with the complete result.", input_schema: schema }],
            tool_choice: { type: "auto" },
          }),
          messages: [{ role: "user", content: plain
            ? `${prompt}\n\nReply with only one JSON object (no other text) matching this JSON schema:\n${JSON.stringify(schema)}`
            : `${prompt}\n\nReply by calling the ${name} tool once with the complete result. Do not reply with text.` }],
        }),
      }); } catch (e) { console.error(`${name} request timed out or failed (attempt ${attempt + 1})`, String(e)); continue; }
      if (!resp.ok) { console.error("Anthropic error", resp.status, (await resp.text()).slice(0, 500)); continue; }
      const out = await resp.json();
      const use = (out.content ?? []).find((c: any) => c.type === "tool_use");
      let result: any = use?.input ?? null;
      if (!result) {
        const text = (out.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
        try { result = extractJson(text); } catch { /* none */ }
      }
      if (result && ok(obj(result))) return result;
      if (result) lastGood = result;
      console.error(`Incomplete ${name} (attempt ${attempt + 1}${plain ? ", plain JSON" : ""})`, "stop:", out.stop_reason, "usage:", JSON.stringify(out.usage ?? {}),
        "keys:", result ? Object.keys(obj(result)).join(",") : "none", "sample:", JSON.stringify(out.content ?? []).slice(0, 400));
    }
    if (lastGood) return lastGood;
    throw new Error("planner failed");
  }

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const dayTargets = targets ? Object.entries(targets).map(([a, m]) => `${a} ${Math.round(m / 5)}`).join("; ") : null;
  const dayPrompt = (i: number) => `${profile}

Write ${DAYS[i]}'s lessons for the week starting ${week_start} (day ${i + 1} of 5).
- Lessons should add up to about ${minutes} minutes.
- Mix short focused lessons sized to the child's attention span with longer hands-on learning (cooking, shopping trips, swimming, gardening, music, art, life skills) that counts toward the time. For high support learners most of the time is hands-on.
- Feature these interests most today, so the week has variety: ${interests[i % interests.length]}${interests.length > 1 ? `, ${interests[(i + 1) % interests.length]}` : ""}.
- Day themes to avoid repeating across the week: Monday home and routines, Tuesday community and shopping, Wednesday science and nature, Thursday arts and music, Friday fun day and outings.
${dayTargets ? `- Minutes to aim for today in each learning area (a lesson's minutes are shared between its areas): ${dayTargets}.` : `- Cover several learning areas today, with the most time on ${fw.areas[0]} and ${fw.areas[1]}.`}
- Each lesson lists 1 to 3 learning areas. Pitch goals at the child's real level, not their age.
- Keep text short: one-sentence steps, 3-5 steps per lesson.`;
  const overviewPrompt = `${profile}

Give this week's plan (starting ${week_start}) a short title, a two-sentence summary for the parent, and 3-5 focus goals for the week, written as observable skills at the child's real level.`;

  // Writing a week takes a few minutes, longer than a browser request can wait.
  // So: create a job, reply straight away, and finish the plan in the background. The app checks the job until it's done.
  const { data: job, error: jobErr } = await admin.from("plan_jobs").insert({ parent_id: user.id, child_id, week_start }).select("id").single();
  if (jobErr || !job) { console.error("Job create failed", jobErr); return json({ error: "Couldn't start the planner. Please try again." }, 500); }
  const setJob = (fields: Record<string, unknown>) => admin.from("plan_jobs").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", job.id);

  async function work() {
    try {
      let done = 0;
      const tick = async <T>(p: Promise<T>) => { const v = await p; done++; await setJob({ progress: done }); return v; };
      const [overview, ...dayResults] = await Promise.all([
        callTool(overviewPrompt, "save_overview", overviewSchema, 1000).catch(() => ({})),
        ...DAYS.map((_, i) => tick(callTool(dayPrompt(i), "save_day", daySchema, 12000, (d) => arr(d?.lessons ?? d?.activities).length > 0).catch((e) => { console.error(`${DAYS[i]} failed`, String(e)); return {}; }))),
      ]);
      const plan = clean({ ...obj(overview), days: dayResults.map((d, i) => ({ day: DAYS[i], ...obj(d) })) }, fw.areas);
      if (!plan.days.some((d: any) => d.lessons.length)) {
        console.error("Empty plan; sample day output:", JSON.stringify(dayResults[0]).slice(0, 800));
        await setJob({ status: "failed", error: "The plan came back empty. Please try again." });
        return;
      }
      await admin.from("generations").insert({ parent_id: user!.id });
      const { data: saved, error: saveErr } = await admin.from("plans").insert({
        parent_id: user!.id, child_id, week_start, title: plan.title, content: { ...plan, framework: fw.name, areas: fw.areas, targets, daily_minutes: minutes }, source: "ai",
      }).select("id").single();
      if (saveErr || !saved) { console.error("Save failed", saveErr); await setJob({ status: "failed", error: "Couldn't save the plan. Please try again." }); return; }
      await setJob({ status: "done", plan_id: saved.id, progress: 5 });
    } catch (e) {
      console.error("Generation failed", e);
      await setJob({ status: "failed", error: "The lesson planner had a problem. Please try again in a minute." });
    }
  }
  // @ts-ignore EdgeRuntime is provided by Supabase
  EdgeRuntime.waitUntil(work());
  return json({ job_id: job.id }, 202);
});
