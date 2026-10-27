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

  window.SHE_demoPlan = function (child, weekStart, focus) {
    const fw = window.SHE_FRAMEWORKS[child.state] || window.SHE_FRAMEWORKS.WA;
    const sup = window.SHE_SUPPORT[child.support_level] || window.SHE_SUPPORT.moderate;
    const interests = (child.interests && child.interests.length) ? child.interests : ["favourite things"];
    const perDay = Math.max(2, Math.min(5, Math.round((child.minutes_per_day || 60) / sup.lessonMin)));
    const areas = fw.areas.slice();
    let ai = 0, ii = 0; const used = {};
    const fill = (s, I) => s.replace(/\{I\}/g, I);
    const days = DAYS.map((day, d) => {
      const lessons = [];
      for (let k = 0; k < perDay; k++) {
        const area = areas[ai % areas.length]; ai++;
        const g = GROUP[area] || "eng"; used[g] = (used[g] || 0) + 1;
        const list = T[g]; const t = list[(used[g] - 1) % list.length];
        const I = interests[ii % interests.length]; ii++;
        lessons.push({
          title: fill(t.title, I).replace(/^./, c => c.toUpperCase()),
          areas: [area],
          minutes: sup.lessonMin, goal: t.goal, hook: fill(t.hook, I), materials: "",
          steps: t.steps.map(s => fill(s, I)), communication: t.communication,
          adjustments: "Keep it short, offer breaks, stop while it's still fun", evidence: t.evidence
        });
      }
      return { day, regulation: REG[d], lessons };
    });
    return {
      title: `${child.name}'s week: ${interests.slice(0, 2).join(" and ")}`,
      summary: `A ${DAYS.length}-day plan built around ${interests.slice(0, 3).join(", ")}, covering every ${fw.name} learning area. This is a template plan. Subscribers get a fully personalised plan written by our AI planner.`,
      focus_goals: [focus || "Communicate wants and needs", "Join in short shared activities", "Build daily living routines"],
      days, framework: fw.name, areas: fw.areas
    };
  };
})();
