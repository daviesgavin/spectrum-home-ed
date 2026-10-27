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

// What each state's written program should contain. Researched from official pages, 28 Oct 2026 (see app/state-guides.js for sources).
const COMMON_AREAS = "For each learning area: what we'll work on this year at the child's level, example activities linked to their interests, and specific resources.";
const PROGRAM_DOCS: Record<string, { doc: string; sections: [string, string][] }> = {
  WA: { doc: "education program", sections: [
    ["About my child", "Strengths, interests, how they communicate and learn best, current level in literacy and numeracy (general terms)."],
    ["Goals for this year", "3 to 5 observable goals."],
    ["Learning areas", `Cover each Western Australian Curriculum learning area. ${COMMON_AREAS}`],
    ["How learning is adjusted", "Adjustments for sensory, communication and regulation needs; how lessons are kept short and interest-led."],
    ["Wellbeing, social interaction and physical activity", "Social and emotional support, social interaction and community involvement, physical activity and health."],
    ["Learning routine and time", "Typical week, recommended learning time, where learning happens."],
    ["Recording and evaluating progress", "How progress is recorded and reviewed, evidence kept for the moderator."]] },
  NSW: { doc: "educational program", sections: [
    ["My child's learning needs", "Strengths, interests, needs and how the program addresses them."],
    ["Educational program by key learning area", `Based on the NESA syllabuses, adjusted to the child's level. Use the key learning areas for their stage (K-6: English, Mathematics, Science and Technology, HSIE, Creative Arts, PDHPE). ${COMMON_AREAS}`],
    ["Time allocated to learning", "Weekly schedule and approximate time per key learning area."],
    ["Recording progress and achievement", "The system for recording progress and achievement."],
    ["Learning environment and resources", "Where learning happens and resources available."]] },
  VIC: { doc: "learning plan", sections: [
    ["Child details", "Name and date of birth (leave a [date of birth] placeholder)."],
    ["Overview", "Where learning takes place, general schedule, how learning outcomes are recorded, any learning area exemptions being considered."],
    ["Considering my child's needs", "Optional: a brief, general summary of needs, strengths and supports. No medical information."],
    ["Learning plan by learning area", `Show how the program substantially addresses all 8 learning areas: English, Mathematics, Humanities and social sciences, Sciences, Health and physical education, The arts, Languages, ICT and design and technology. ${COMMON_AREAS}`]] },
  QLD: { doc: "educational program summary", sections: [
    ["My child's needs and background", "Strengths, interests, communication, learning history in general terms."],
    ["Goals for the year", "3 to 5 goals."],
    ["Planned learning activities", `${COMMON_AREAS}`],
    ["How I will track progress", "Records, evidence and review."],
    ["Learning environment and wellbeing", "How the learning environment supports wellbeing, regulation and social connection."]] },
  SA: { doc: "12-month learning program", sections: [
    ["About my child", "Strengths, interests, needs in general terms."],
    ["Three learning goals", "Exactly 3 goals for the next 12 months, which can combine functional life skills, therapy and academic goals."],
    ["Learning areas", `All 8 Australian Curriculum learning areas. ${COMMON_AREAS}`],
    ["Monitoring and assessment", "How progress is monitored and assessed, with literacy and numeracy evidence."],
    ["Learning environment", "Primarily at home; describe the space and routine."],
    ["Social interaction", "Planned social interaction, adapted to the child."]] },
  TAS: { doc: "Home Education Summary and Program (HESP)", sections: [
    ["Diverse Learning Needs", "The child's learning needs and how the program responds."],
    ["Research", "How the parent has researched home education approaches and the child's needs."],
    ["Pedagogy", "The teaching approach and why it suits the child."],
    ["Literacy", "Literacy plan at the child's level, including communication."],
    ["Numeracy", "Numeracy plan at the child's level."],
    ["Range of Learning Areas", `${COMMON_AREAS}`],
    ["Wellbeing", "Physical, emotional and sensory wellbeing."],
    ["Interpersonal Skills", "Social and interpersonal skill development."],
    ["Future Directions", "Only if the child is 13 or over; otherwise write 'Not applicable (under 13)'."],
    ["Evaluation", "How the program and progress will be evaluated."]] },
  ACT: { doc: "Statement of Intent draft", sections: [
    ["About my child", "Strengths, interests, needs."],
    ["Goals", "3 to 5 goals."],
    ["Learning program", `By learning area. ${COMMON_AREAS}`],
    ["Learning environment, routine and social connection", "Where, when, and community activities."],
    ["Recording and reviewing progress", "How progress is recorded for the yearly report."]] },
  NT: { doc: "teaching, learning and assessment plan draft", sections: [
    ["About my child", "Strengths, interests, needs."],
    ["Teaching and learning by learning area", `${COMMON_AREAS}`],
    ["Assessment", "How learning will be assessed and recorded."],
    ["Learning environment and routine", "Where, when and how."]] },
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
        teach: asStr(l?.teach, 1200),
        key_words: arr(l?.key_words).map((w: unknown) => asStr(w, 40)).filter(Boolean).slice(0, 6),
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
  const { child_id, week_start, focus, extra, kind, answers, year, facts, from, to, ws } = body ?? {};
  const isProgram = kind === "program", isYear = kind === "year", isReport = kind === "report", isSheet = kind === "worksheet";
  if (isSheet && (!ws?.subject || !String(ws?.topic ?? "").trim())) return json({ error: "Choose a subject and a topic." }, 400);
  if (isReport && (!/^\d{4}-\d{2}-\d{2}$/.test(from ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(to ?? "") || !facts)) return json({ error: "Choose a period with some records first." }, 400);
  if (!child_id || (!isProgram && !isYear && !isReport && !isSheet && !/^\d{4}-\d{2}-\d{2}$/.test(week_start ?? ""))) return json({ error: "Choose a child and a week." }, 400);
  if (isYear && !(Number(year) >= 2020 && Number(year) <= 2100)) return json({ error: "Choose a year." }, 400);

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
  // Weekly plans follow the year plan's term theme and focus, when there is one
  let termNote = "";
  if (!isProgram && !isYear && !isReport && !isSheet && week_start) {
    const wy = Number(week_start.slice(0, 4)), wm = Number(week_start.slice(5, 7));
    const ti = wm <= 4 ? 0 : wm <= 6 ? 1 : wm <= 9 ? 2 : 3;
    const { data: yp } = await userClient.from("year_plans").select("content").eq("child_id", child_id).eq("year", wy).maybeSingle();
    const t = yp?.content?.terms?.[ti];
    if (t) termNote = `- This term (Term ${ti + 1}) theme: ${String(t.theme ?? "").slice(0, 200)}
- Term goals: ${(Array.isArray(t.goals) ? t.goals : []).slice(0, 6).join("; ").slice(0, 600)}
- Term focus by learning area: ${Object.entries(t.areas ?? {}).map(([k, v]) => `${k}: ${v}`).join("; ").slice(0, 1200)}
Build this week's lessons around the term theme and goals.`;
  }
  const profile = `Child profile
- Name: ${child.name}
- Age: ${age ?? "unknown"}
- State: ${child.state}; framework: ${fw.name}; regulator: ${fw.regulator}
- Support level: ${SUPPORT[child.support_level] ?? child.support_level}
- Communication: ${child.communication || "not stated"}
- Interests: ${interests.join(", ")}
- Sensory notes: ${child.sensory_notes || "none"}
- Parent's goals: ${child.goals || "none"}
- Working level by subject: ${Object.keys(child.levels ?? {}).length ? Object.entries(child.levels).map(([k, v]) => `${k}: ${v}`).join("; ") : "not set (judge from age and support level)"}
- Learning time: about ${minutes} minutes a day${adjusted ? ` (reduced by the parent: ${child.time_reason || "no reason given"})` : ` (recommended for ${rec.stage.toLowerCase()} age)`}
${focus ? `- Focus this week: ${String(focus).slice(0, 300)}` : ""}
${extra ? `- Extra notes from parent: ${String(extra).slice(0, 500)}` : ""}
${termNote}`;

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
      teach: { ...str, description: "For low support and advanced learners: a short explanation of the content (3-5 sentences) the parent can read aloud or the child can read. Otherwise an empty string." },
      key_words: { type: "array", items: str, maxItems: 6, description: "Key vocabulary for the lesson, or empty" },
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

  // ---------- Worksheet: printable practice for any subject, level and topic ----------
  if (isSheet) {
    const subj = String(ws.subject).slice(0, 80), lvl = String(ws.level || child.levels?.[ws.subject] || "").slice(0, 60), topic = String(ws.topic).slice(0, 200);
    const n = Math.max(3, Math.min(20, Number(ws.count) || (child.support_level === "high" ? 4 : child.support_level === "moderate" ? 6 : 10)));
    const sPrompt = `${profile}

Make a printable worksheet.
- Subject: ${subj} (${fw.name})
- Level: ${lvl || `judge from age ${age ?? "unknown"} and support level`}
- Topic: ${topic}
${ws.lesson ? `- It goes with this lesson: ${String(ws.lesson).slice(0, 800)}` : ""}
- About ${n} questions or tasks in total.

Rules:
- Match the curriculum content for this subject at this level, adjusted to the child. Theme the questions around the child's interests.
- High support: very few words, one task per item, lots of visual items using emoji (counting, matching, circling), no long reading. Moderate: short sentences, visual supports, choice items. Low support and advanced: proper school-style work, including written answers, problem solving and some challenge items.
- Item types: "choice" (circle the answer: prompt + 2-4 options), "write" (short written answer), "count" (prompt + a visual of repeated emoji to count), "match" (pairs to join: left and right), "draw" (draw or label something), "fill" (a sentence with ___ to fill).
- Every item needs a correct answer for the answer key (for "draw" give what a good answer includes).
- Include a short "teach" box (2-5 sentences explaining the idea, in child-friendly words) and up to 6 key words.
- Plain Australian English, metric units, Australian money, places and examples. Respectful and encouraging.`;
    const itemSchema = { type: "object", properties: { type: { type: "string", enum: ["choice", "write", "count", "match", "draw", "fill"] }, prompt: { type: "string" }, options: { type: "array", items: { type: "string" } }, visual: { type: "string" }, pairs: { type: "array", items: { type: "object", properties: { left: { type: "string" }, right: { type: "string" } }, required: ["left", "right"] } }, answer: { type: "string" } }, required: ["type", "prompt", "answer"] };
    const sSchema = { type: "object", properties: { title: { type: "string" }, intro: { type: "string" }, teach: { type: "string" }, key_words: { type: "array", items: { type: "string" } }, sections: { type: "array", minItems: 1, maxItems: 4, items: { type: "object", properties: { heading: { type: "string" }, items: { type: "array", items: itemSchema } }, required: ["heading", "items"] } } }, required: ["title", "sections"] };
    const { data: job, error: jobErr } = await admin.from("plan_jobs").insert({ parent_id: user.id, child_id, week_start: new Date().toISOString().slice(0, 10) }).select("id").single();
    if (jobErr || !job) return json({ error: "Couldn't start writing. Please try again." }, 500);
    const setJob = (f: Record<string, unknown>) => admin.from("plan_jobs").update({ ...f, updated_at: new Date().toISOString() }).eq("id", job.id);
    const t = (v: unknown, m: number) => String(v ?? "").slice(0, m);
    const work = async () => {
      try {
        const out = obj(await callTool(sPrompt, "save_worksheet", sSchema, 8000, (d) => arr(d?.sections).some((x: any) => arr(obj(x)?.items).length)));
        const sections = arr(out.sections).map(obj).slice(0, 4).map((x: any) => ({ heading: t(x.heading, 120), items: arr(x.items).map(obj).slice(0, 25).map((it: any) => ({
          type: ["choice", "write", "count", "match", "draw", "fill"].includes(it.type) ? it.type : "write", prompt: t(it.prompt, 500),
          options: arr(it.options).map((o: unknown) => t(o, 120)).slice(0, 5), visual: t(it.visual, 200),
          pairs: arr(it.pairs).map(obj).map((pp: any) => ({ left: t(pp.left, 120), right: t(pp.right, 120) })).slice(0, 8), answer: t(it.answer, 400),
        })).filter((it: any) => it.prompt) })).filter((x: any) => x.items.length);
        if (!sections.length) { await setJob({ status: "failed", error: "The worksheet came back empty. Please try again." }); return; }
        await admin.from("generations").insert({ parent_id: user!.id });
        const content = { title: t(out.title, 120) || topic, intro: t(out.intro, 400), teach: t(out.teach, 1500), key_words: arr(out.key_words).map((w: unknown) => t(w, 40)).slice(0, 6), sections };
        const { data: saved, error } = await admin.from("worksheets").insert({ parent_id: user!.id, child_id, plan_id: ws.plan_id || null, lesson_key: ws.lesson_key || null, subject: subj, level: lvl || null, topic, content }).select("id").single();
        if (error || !saved) { console.error("Worksheet save failed", error); await setJob({ status: "failed", error: "Couldn't save the worksheet. Please try again." }); return; }
        await setJob({ status: "done", worksheet_id: saved.id, progress: 5 });
      } catch (e) { console.error("Worksheet failed", e); await setJob({ status: "failed", error: "The writer had a problem. Please try again in a minute." }); }
    };
    // @ts-ignore EdgeRuntime is provided by Supabase
    EdgeRuntime.waitUntil(work());
    return json({ job_id: job.id }, 202);
  }

  // ---------- Progress report: a written summary from the family's own records ----------
  if (isReport) {
    const rPrompt = `${profile}

Write ${child.name}'s home education progress report for ${from} to ${to}, for the parent to give to ${fw.regulator}.
Use ONLY these records from the family's app. Don't invent results, test scores or events. If a learning area has few records, say so honestly and briefly.

${String(facts).slice(0, 12000)}

Sections, in this order, with these exact headings:
1. Overview: 2 or 3 short paragraphs on the period: what we focused on, how ${child.name} engaged, the biggest wins.
2. Progress by learning area: for each learning area with records, 2 to 4 sentences on what was covered and what changed (for example more lessons done independently). Start each area on a new line with the area name and a colon.
3. Communication and independence: how communication and independence grew, using the help levels (full help, prompted, independent).
4. Wellbeing and social interaction: regulation, community outings and social contact shown in the records.
5. Next steps: 3 to 5 bullet points for the next period.

Write as the parent, first person, plain Australian English, respectful and neuro-affirming. Short paragraphs, "- " bullets, no markdown headings or bold.`;
    const rSchema = { type: "object", properties: { sections: { type: "array", minItems: 5, items: { type: "object", properties: { heading: { type: "string" }, body: { type: "string" } }, required: ["heading", "body"] } } }, required: ["sections"] };
    const { data: job, error: jobErr } = await admin.from("plan_jobs").insert({ parent_id: user.id, child_id, week_start: to }).select("id").single();
    if (jobErr || !job) return json({ error: "Couldn't start writing. Please try again." }, 500);
    const setJob = (f: Record<string, unknown>) => admin.from("plan_jobs").update({ ...f, updated_at: new Date().toISOString() }).eq("id", job.id);
    const work = async () => {
      try {
        const out = obj(await callTool(rPrompt, "save_report", rSchema, 8000, (d) => arr(d?.sections).length >= 3));
        const sections = arr(out.sections).map(obj).map((x: any) => ({ heading: String(x.heading ?? "").slice(0, 120), body: String(x.body ?? "").slice(0, 8000) })).filter((x: any) => x.heading && x.body);
        if (!sections.length) { await setJob({ status: "failed", error: "The report came back empty. Please try again." }); return; }
        await admin.from("generations").insert({ parent_id: user!.id });
        const { data: saved, error } = await admin.from("reports").insert({ parent_id: user!.id, child_id, period_start: from, period_end: to, content: { sections } }).select("id").single();
        if (error || !saved) { console.error("Report save failed", error); await setJob({ status: "failed", error: "Couldn't save the report. Please try again." }); return; }
        await setJob({ status: "done", report_id: saved.id, progress: 5 });
      } catch (e) { console.error("Report failed", e); await setJob({ status: "failed", error: "The writer had a problem. Please try again in a minute." }); }
    };
    // @ts-ignore EdgeRuntime is provided by Supabase
    EdgeRuntime.waitUntil(work());
    return json({ job_id: job.id }, 202);
  }

  // ---------- Year plan: 4 terms, each with a theme, goals and a focus per learning area ----------
  if (isYear) {
    const { data: prog } = await userClient.from("programs").select("content").eq("child_id", child_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const progGoals = (prog?.content?.sections ?? []).find((x: any) => /goal/i.test(x.heading))?.body ?? "";
    const yPrompt = `${profile}

Plan ${child.name}'s home education year for ${year}, as 4 school terms of about 10 weeks.
${progGoals ? `Goals from the parent's registration program:\n${String(progGoals).slice(0, 1200)}\n` : ""}${extra ? `Parent's notes for the year: ${String(extra).slice(0, 600)}\n` : ""}
For each term give:
- theme: a short, fun theme built on one or two of the child's interests (vary across the year)
- goals: 3 or 4 observable goals at the child's real level, building on the previous term
- areas: a one-sentence focus for every learning area: ${fw.areas.join(", ")}
- activities: 3 to 5 hands-on or community activities (outings, cooking, swimming, projects)
Also give the year a short title and a two-sentence summary for the parent. Keep everything short and concrete. Use respectful, neuro-affirming language.`;
    const areaProps = Object.fromEntries(fw.areas.map((ar) => [ar, { type: "string" }]));
    const ySchema = { type: "object", properties: { title: { type: "string" }, summary: { type: "string" }, terms: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", properties: { theme: { type: "string" }, goals: { type: "array", items: { type: "string" } }, areas: { type: "object", properties: areaProps }, activities: { type: "array", items: { type: "string" } } }, required: ["theme", "goals", "areas", "activities"] } } }, required: ["title", "terms"] };
    const { data: job, error: jobErr } = await admin.from("plan_jobs").insert({ parent_id: user.id, child_id, week_start: `${year}-01-01` }).select("id").single();
    if (jobErr || !job) return json({ error: "Couldn't start writing. Please try again." }, 500);
    const setJob = (f: Record<string, unknown>) => admin.from("plan_jobs").update({ ...f, updated_at: new Date().toISOString() }).eq("id", job.id);
    const work = async () => {
      try {
        const out = obj(await callTool(yPrompt, "save_year", ySchema, 10000, (d) => arr(d?.terms).length >= 4));
        const terms = arr(out.terms).map(obj).slice(0, 4).map((t: any, i: number) => ({
          term: i + 1, theme: String(t.theme ?? "").slice(0, 200),
          goals: arr(t.goals).map((g: unknown) => String(g).slice(0, 200)).filter(Boolean).slice(0, 6),
          areas: Object.fromEntries(fw.areas.map((ar) => [ar, String(obj(t.areas)?.[ar] ?? "").slice(0, 300)])),
          activities: arr(t.activities).map((g: unknown) => String(g).slice(0, 200)).filter(Boolean).slice(0, 8),
        }));
        if (terms.length < 4) { await setJob({ status: "failed", error: "The year plan came back incomplete. Please try again." }); return; }
        await admin.from("generations").insert({ parent_id: user!.id });
        const content = { title: String(out.title ?? `${child.name}'s ${year}`).slice(0, 120), summary: String(out.summary ?? "").slice(0, 600), terms, areas: fw.areas };
        const { data: saved, error } = await admin.from("year_plans").upsert({ parent_id: user!.id, child_id, year: Number(year), content, updated_at: new Date().toISOString() }, { onConflict: "child_id,year" }).select("id").single();
        if (error || !saved) { console.error("Year save failed", error); await setJob({ status: "failed", error: "Couldn't save the year plan. Please try again." }); return; }
        await setJob({ status: "done", year_plan_id: saved.id, progress: 5 });
      } catch (e) { console.error("Year failed", e); await setJob({ status: "failed", error: "The writer had a problem. Please try again in a minute." }); }
    };
    // @ts-ignore EdgeRuntime is provided by Supabase
    EdgeRuntime.waitUntil(work());
    return json({ job_id: job.id }, 202);
  }

  // ---------- Registration pack: the written education program each state asks for ----------
  if (isProgram) {
    const spec = PROGRAM_DOCS[child.state] ?? PROGRAM_DOCS.WA;
    const a = (k: string) => String(answers?.[k] ?? "").slice(0, 600);
    const areaHours = Object.entries(rec.targets).map(([ar, m]) => `${ar} about ${Math.round(Number(m) / 60 * 10) / 10} h`).join("; ");
    const progPrompt = `${profile}

Write ${child.name}'s ${spec.doc} for home education registration in ${({ WA: "Western Australia", NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", SA: "South Australia", TAS: "Tasmania", ACT: "the ACT", NT: "the Northern Territory" } as Record<string, string>)[child.state] ?? child.state}, for the year starting ${a("start") || "now"}.
Regulator: ${fw.regulator}. Learning areas to cover: ${fw.areas.join(", ")}.
Recommended learning time: about ${Math.round(minutes * 5 / 60)} hours a week (${areaHours}), made up of short focused lessons plus hands-on learning such as cooking, shopping, swimming, gardening and life skills.

Parent's answers:
- Where learning will mostly happen: ${a("where") || "at home"}
- Typical week and routine: ${a("routine") || "not stated"}
- Resources, programs and places they'll use: ${a("resources") || "not stated"}
- Social and community activities: ${a("social") || "not stated"}
- Therapies and supports (general): ${a("supports") || "not stated"}
- Anything else: ${a("other") || "none"}

Write these sections, in this order, using exactly these headings:
${spec.sections.map((x, i) => `${i + 1}. ${x[0]}: ${x[1]}`).join("\n")}

Rules:
- Write as the parent, in first person ("I", "we"), in plain Australian English. Short paragraphs and "- " bullet points. No markdown headings, bold or tables inside a section.
- Pitch goals at ${child.name}'s real level, not their age. Use their interests as the hook.
- Use respectful, neuro-affirming language. Treat communication (AAC, signs, gestures, scripts) as real communication.
- Name specific resources and activities, not just "books" or "the internet". Only list resources the parent mentioned or common free Australian ones (library, local pool, ABC Kids, Auslan Signbank).
- Keep medical detail out: describe needs in general terms only.
- Don't invent facts about the family. Where something is unknown, write a short line the parent can fill in, in square brackets.
- Mention that weekly plans, learning time by area, progress records, notes, photos and videos are kept in the Spectrum Home Ed app.`;
    const progSchema = { type: "object", properties: { sections: { type: "array", minItems: spec.sections.length, items: { type: "object", properties: { heading: { type: "string" }, body: { type: "string" } }, required: ["heading", "body"] } } }, required: ["sections"] };
    const { data: job, error: jobErr } = await admin.from("plan_jobs").insert({ parent_id: user.id, child_id, week_start: new Date().toISOString().slice(0, 10) }).select("id").single();
    if (jobErr || !job) return json({ error: "Couldn't start writing. Please try again." }, 500);
    const setJob = (f: Record<string, unknown>) => admin.from("plan_jobs").update({ ...f, updated_at: new Date().toISOString() }).eq("id", job.id);
    const work = async () => {
      try {
        const out = obj(await callTool(progPrompt, "save_program", progSchema, 12000, (d) => arr(d?.sections).length >= 3));
        const sections = arr(out.sections).map(obj).map((x: any) => ({ heading: String(x.heading ?? "").slice(0, 120), body: String(x.body ?? "").slice(0, 6000) })).filter((x: any) => x.heading && x.body);
        if (!sections.length) { await setJob({ status: "failed", error: "The program came back empty. Please try again." }); return; }
        await admin.from("generations").insert({ parent_id: user!.id });
        const { data: saved, error } = await admin.from("programs").insert({ parent_id: user!.id, child_id, state: child.state, title: `${child.name}'s ${spec.doc}`, content: { doc_name: spec.doc, sections, answers } }).select("id").single();
        if (error || !saved) { console.error("Program save failed", error); await setJob({ status: "failed", error: "Couldn't save the program. Please try again." }); return; }
        await setJob({ status: "done", program_id: saved.id, progress: 5 });
      } catch (e) { console.error("Program failed", e); await setJob({ status: "failed", error: "The writer had a problem. Please try again in a minute." }); }
    };
    // @ts-ignore EdgeRuntime is provided by Supabase
    EdgeRuntime.waitUntil(work());
    return json({ job_id: job.id }, 202);
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
- Keep text short: one-sentence steps, 3-5 steps per lesson.
- Use the child's working level for each subject when it's set. For low support and advanced learners, include real curriculum content: a short "teach" explanation and key words, like a good school lesson (for example how the water cycle works, place value, mapping our local area).`;
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
