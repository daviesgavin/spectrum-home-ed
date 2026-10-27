// Learning areas by state (keep in sync with supabase/functions/generate-plan/index.ts)
window.SHE_FRAMEWORKS = {
  WA:  { label: "Western Australia", name: "Western Australian Curriculum", areas: ["English","Mathematics","Science","HASS","Health and Physical Education","The Arts","Technologies","Languages"] },
  NSW: { label: "New South Wales", name: "NSW syllabuses (NESA)", areas: ["English","Mathematics","Science and Technology","HSIE","Creative Arts","PDHPE","Languages"] },
  VIC: { label: "Victoria", name: "Victorian Curriculum 2.0", areas: ["English","Mathematics","Science","Humanities","Health and Physical Education","The Arts","Technologies","Languages"] },
  QLD: { label: "Queensland", name: "Australian Curriculum v9", areas: ["English","Mathematics","Science","HASS","Health and Physical Education","The Arts","Technologies","Languages"] },
  SA:  { label: "South Australia", name: "Australian Curriculum v9", areas: ["English","Mathematics","Science","HASS","Health and Physical Education","The Arts","Technologies","Languages"] },
  TAS: { label: "Tasmania", name: "Australian Curriculum v9", areas: ["English","Mathematics","Science","HASS","Health and Physical Education","The Arts","Technologies","Languages"] },
  ACT: { label: "ACT", name: "Australian Curriculum v9", areas: ["English","Mathematics","Science","HASS","Health and Physical Education","The Arts","Technologies","Languages"] },
  NT:  { label: "Northern Territory", name: "Australian Curriculum v9", areas: ["English","Mathematics","Science","HASS","Health and Physical Education","The Arts","Technologies","Languages"] }
};

window.SHE_SUPPORT = {
  high:     { label: "High support", blurb: "Nonverbal or minimally speaking, needs a lot of hands-on help, short attention windows.", lessonMin: 8 },
  moderate: { label: "Moderate support", blurb: "Some functional communication, follows short picture routines.", lessonMin: 12 },
  low:      { label: "Low support", blurb: "Talks in sentences, follows multi-step instructions with support.", lessonMin: 20 },
  advanced: { label: "Advanced", blurb: "At or above year level in some areas, needs depth and social support.", lessonMin: 30 }
};

// Demo planner: builds a sensible week from templates when the AI planner isn't connected.
(function () {
  // Generic area keys map each state's area names to a template group
  const GROUP = {
    "English":"eng","Mathematics":"math","Science":"sci","Science and Technology":"sci","HASS":"hass","HSIE":"hass","Humanities":"hass",
    "Health and Physical Education":"hpe","PDHPE":"hpe","The Arts":"arts","Creative Arts":"arts","Technologies":"tech","Languages":"lang"
  };
  const T = {
    eng: [
      { title: "{I} choice board", goal: "Chooses between 2–4 pictures to ask for something", hook: "Pictures of {I}", steps: ["Show 2 pictures, one of them {I}","Wait 5–10 seconds","Honour any choice straight away","Add a picture when 2 is easy"], communication: "\"I want…\"", evidence: "Short video of a choice" },
      { title: "Shared story about {I}", goal: "Points to pictures and joins in a repeated line", hook: "A homemade photo book about {I}", steps: ["Read one page at a time","Pause before the repeated line","Point to the picture together","Finish with \"the end!\""], communication: "\"The end!\"", evidence: "Photo of the book, H/P/I" }
    ],
    math: [
      { title: "Counting with {I}", goal: "Counts objects into a container with support", hook: "Small items linked to {I}", steps: ["Count together, touching each one","Drop each into a tin for the sound","Finish with the number and \"all done\""], communication: "Count aloud or on AAC", evidence: "H/P/I and the number reached" },
      { title: "Sorting {I} things", goal: "Sorts objects into 2 groups by colour or type", hook: "Toys or pictures of {I}", steps: ["Show one of each group","Hand one item at a time","Help, then fade help","Celebrate the full sort"], communication: "\"Same!\" / \"Different!\"", evidence: "Photo of the finished sort" }
    ],
    sci: [
      { title: "Water and {I}", goal: "Notices sink or float, wet or dry", hook: "Bath or tub play with {I} toys", steps: ["Drop items in one at a time","Say what happened","Sort into sink and float"], communication: "\"Uh oh, sink!\"", evidence: "Photo of the experiment" },
      { title: "Senses walk", goal: "Explores textures, sounds and smells outdoors", hook: "Bring a {I} toy along", steps: ["Walk a short loop","Stop at 3 things to touch or hear","Name each one together"], communication: "\"Soft\", \"loud\", \"wow\"", evidence: "Photos of 3 things found" }
    ],
    hass: [
      { title: "Community trip", goal: "Visits a shop or park and finds one thing", hook: "Find something to do with {I}", steps: ["Look at a photo of the place first","Go at a quiet time","Find one item together","Leave before overload"], communication: "\"Let's go!\" / \"Home time\"", evidence: "Photo at the place" },
      { title: "Me and my family", goal: "Recognises family members and places in photos", hook: "Photos of family doing {I}", steps: ["Look at photos together","Name each person","Match photo to person in the room"], communication: "Names or signs for family", evidence: "H/P/I" }
    ],
    hpe: [
      { title: "Hand washing routine", goal: "Completes more steps of hand washing with pictures", hook: "Sing a {I} song for 20 seconds", steps: ["Picture strip at the sink","Point to each step","Fade help from the last step"], communication: "\"Wash hands\"", evidence: "H/P/I per step" },
      { title: "Move and calm", goal: "Uses a movement or calm-down choice when needed", hook: "{I} music", steps: ["Offer swing, jump or squeeze","Do it together","Finish with a calm activity"], communication: "\"I need a break\"", evidence: "Note which choice helped" }
    ],
    arts: [
      { title: "{I} music and rhythm", goal: "Joins in a song by moving, vocalising or filling a pause", hook: "Songs or jingles about {I}", steps: ["Play the song","Pause before the last word","Wait for any response","Finish it with excitement"], communication: "Song lines as language", evidence: "Short video" },
      { title: "{I} craft", goal: "Uses glue, stickers or paint to make something", hook: "Pictures of {I} to stick on", steps: ["Lay out 3 materials","Model one step","Child chooses where things go"], communication: "\"More glue!\" / \"Finished\"", evidence: "Photo of the artwork" }
    ],
    tech: [
      { title: "Cause and effect with {I}", goal: "Presses a button or taps a screen to make something happen", hook: "A {I} video or sound", steps: ["Show the button","Press together","Wait for the child to press","Play the reward straight away"], communication: "\"Again!\"", evidence: "H/P/I" },
      { title: "Picture recipe snack", goal: "Follows picture steps to make a simple snack", hook: "A snack linked to {I}", steps: ["Show the picture steps","Do one step at a time","Adult handles anything hot or sharp","Eat together"], communication: "\"Yum\" / \"All done\"", evidence: "Photo strip of each step" }
    ],
    lang: [
      { title: "Key word signs", goal: "Sees and copies 2–3 Auslan key word signs", hook: "Signs for {I}, more and finished", steps: ["Model the sign in real moments","Hand-over-hand only if welcomed","Celebrate any attempt"], communication: "Auslan key word signs", evidence: "Tally of signs seen or used" }
    ]
  };
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
  const REG = ["Swing or trampoline before the first lesson","Pool or bath play mid-morning","Walk outside between lessons","Quiet time with headphones after lunch","Beach, park or favourite outing"];
  // Longer hands-on learning that counts toward the week's hours
  const PRACTICAL = [
    { title: "Community outing", groups: ["hass","eng"], minutes: 60, goal: "Takes part in a short trip to a shop, library or park", hook: "Somewhere linked to {I}", steps: ["Look at a photo of the place first","Go at a quiet time","Find one thing together","Model a phrase for each step","Leave before overload"], communication: "\"Let's go!\" / \"Home time\"", evidence: "Photo at the place" },
    { title: "Cooking together", groups: ["math","tech","hpe"], minutes: 30, goal: "Helps with 3 steps of a simple recipe", hook: "A snack linked to {I}", steps: ["Show picture steps","Count and pour together","Stir, spread or mix","Adult handles heat and knives","Eat together"], communication: "\"More\" / \"Yum\" / \"All done\"", evidence: "Photo strip of the steps" },
    { title: "Swimming and movement", groups: ["hpe"], minutes: 45, goal: "Builds water confidence and gross motor skills", hook: "{I} songs or toys in the pool", steps: ["Warm up with a favourite song","Practise one water skill","Free play","Calm down and dry off"], communication: "\"Again!\" / \"Finished\"", evidence: "Note the skill practised" },
    { title: "Music and art time", groups: ["arts","eng"], minutes: 30, goal: "Creates or joins in with music or art", hook: "{I} music or pictures", steps: ["Choose music or art from 2 options","Make something together","Show someone the result"], communication: "\"My turn\" / \"Look!\"", evidence: "Photo or short video" },
    { title: "Garden and nature", groups: ["sci","hpe"], minutes: 30, goal: "Explores plants, water, insects or weather", hook: "Find things linked to {I}", steps: ["Water plants or dig","Look for 3 living things","Talk about what you found"], communication: "\"Look!\" / \"Wet\" / \"Dirty\"", evidence: "Photos of what you found" },
    { title: "Hands-on science", groups: ["sci","math"], minutes: 30, goal: "Explores a simple experiment and notices what changes", hook: "Use {I} toys or pictures in the experiment", steps: ["Set up ice, water, magnets or bubbles","Guess together what will happen","Try it and watch","Say or show what changed"], communication: "\"Wow!\" / \"Again!\" / \"Gone!\"", evidence: "Photo or short video" },
    { title: "Home skills routine", groups: ["hpe","math","tech"], minutes: 20, goal: "Does more steps of a daily routine with less help", hook: "Favourite {I} music while working", steps: ["Show the picture routine","Do each step together","Fade help from the last step","Celebrate finishing"], communication: "\"Done!\"", evidence: "H/P/I per step" }
  ];
  const areaFor = (g, areas) => areas.find(a => GROUP[a] === g);

  // Recommended weekly learning time, based on published guidance (NSW suggests about 15 hours a week for primary)
  window.SHE_recommendedTime = function (age, areas) {
    let stage, weekly;
    if (age != null && age <= 5) { stage = "Early years"; weekly = 600; }
    else if (age == null || age <= 12) { stage = "Primary"; weekly = 900; }
    else if (age <= 17) { stage = "Secondary"; weekly = 1200; }
    else { stage = "Adult life skills"; weekly = 900; }
    const weights = {}; let rest = 1, others = [];
    areas.forEach(a => { const g = GROUP[a]; if (g === "eng") { weights[a] = .30; rest -= .30; } else if (g === "math") { weights[a] = .20; rest -= .20; } else if (g === "lang") { weights[a] = .03; rest -= .03; } else others.push(a); });
    others.forEach(a => weights[a] = rest / others.length);
    const targets = Object.fromEntries(areas.map(a => [a, Math.round(weekly * weights[a] / 5) * 5]));
    return { stage, weeklyMinutes: weekly, perDay: Math.round(weekly / 5), targets };
  };
  window.SHE_dailyMinutes = function (child) {
    const age = child.birth_year ? new Date().getFullYear() - child.birth_year : null;
    const fw = window.SHE_FRAMEWORKS[child.state] || window.SHE_FRAMEWORKS.WA;
    const rec = window.SHE_recommendedTime(age, fw.areas);
    return child.time_mode === "adjusted" && child.minutes_per_day ? child.minutes_per_day : rec.perDay;
  };

  window.SHE_demoPlan = function (child, weekStart, focus) {
    const fw = window.SHE_FRAMEWORKS[child.state] || window.SHE_FRAMEWORKS.WA;
    const sup = window.SHE_SUPPORT[child.support_level] || window.SHE_SUPPORT.moderate;
    const age = child.birth_year ? new Date().getFullYear() - child.birth_year : null;
    const rec = window.SHE_recommendedTime(age, fw.areas);
    const daily = window.SHE_dailyMinutes(child);
    const interests = (child.interests && child.interests.length) ? child.interests : ["favourite things"];
    const focused = Math.max(2, Math.min(5, Math.round(daily * 0.4 / sup.lessonMin)));
    const areas = fw.areas.slice();
    let ai = 0, ii = 0; const used = {}, got = {};
    const fill = (s, I) => s.replace(/\{I\}/g, I);
    const days = DAYS.map((day, d) => {
      const lessons = []; let total = 0; const dayUsed = new Set();
      for (let k = 0; k < focused; k++) {
        const area = areas[ai % areas.length]; ai++;
        const g = GROUP[area] || "eng"; used[g] = (used[g] || 0) + 1;
        const list = T[g]; const t = list[(used[g] - 1) % list.length];
        const I = interests[ii % interests.length]; ii++;
        lessons.push({ title: fill(t.title, I).replace(/^./, c => c.toUpperCase()), areas: [area], minutes: sup.lessonMin, goal: t.goal, hook: fill(t.hook, I), materials: "",
          steps: t.steps.map(s => fill(s, I)), communication: t.communication, adjustments: "Keep it short, offer breaks, stop while it's still fun", evidence: t.evidence });
        total += sup.lessonMin; got[area] = (got[area] || 0) + sup.lessonMin;
      }
      let guard = 0;
      while (total < daily - 10 && guard++ < 6) {
        // pick the hands-on activity that best fills the learning areas furthest behind their weekly target
        const deficit = a => (rec.targets[a] || 0) - (got[a] || 0);
        const p = PRACTICAL.slice().sort((x, y) => {
          const sx = x.groups.map(g => areaFor(g, areas)).filter(Boolean).reduce((n, a) => n + deficit(a), 0) / x.groups.length - (dayUsed.has(x.title) ? 1e4 : 0);
          const sy = y.groups.map(g => areaFor(g, areas)).filter(Boolean).reduce((n, a) => n + deficit(a), 0) / y.groups.length - (dayUsed.has(y.title) ? 1e4 : 0);
          return sy - sx; })[0];
        dayUsed.add(p.title);
        const I = interests[ii % interests.length]; ii++;
        const mins = Math.min(p.minutes, Math.max(15, daily - total));
        const pa = [...new Set(p.groups.map(g => areaFor(g, areas)).filter(Boolean))];
        lessons.push({ title: p.title, areas: pa, minutes: mins, goal: p.goal, hook: fill(p.hook, I), materials: "", steps: p.steps.slice(), communication: p.communication,
          adjustments: "Hands-on learning counts toward the day's hours. Break it up as needed.", evidence: p.evidence });
        total += mins; pa.forEach(a => got[a] = (got[a] || 0) + mins / pa.length);
      }
      return { day, regulation: REG[d], lessons };
    });
    return {
      title: `${child.name}'s week: ${interests.slice(0, 2).join(" and ")}`,
      summary: `A ${DAYS.length}-day plan built around ${interests.slice(0, 3).join(", ")}, covering every ${fw.name} learning area with about ${Math.round(daily / 6) / 10} hours of learning a day. This is a template plan. Subscribers get a fully personalised plan written by our AI planner.`,
      focus_goals: [focus || "Communicate wants and needs", "Join in short shared activities", "Build daily living routines"],
      days, framework: fw.name, areas: fw.areas, targets: child.time_mode === "adjusted" ? null : rec.targets, daily_minutes: daily
    };
  };
})();
