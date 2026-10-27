/* Spectrum Home Ed: state-by-state home education guides.
   Researched from official department and regulator pages on 28 October 2026. Rules change, so every guide links its sources.
   Each step: id, phase ("start" = registering, "year" = ongoing), title, body, app (which app feature helps), recurring (for yearly steps).
   app keys: pack = registration pack, plans = weekly plans, time = learning time tracking, evidence = photos and records, report = progress report. */
(function () {
  const VERIFIED = "28 October 2026";
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const D = s => (s ? new Date(s + "T00:00:00") : null);
  // Next anniversary of a date that is on or after today (minus a grace window)
  const nextYearly = (start, monthsAfter = 12) => { const today = new Date(); today.setHours(0, 0, 0, 0); let d = addMonths(start, monthsAfter); while (d < addDays(today, -30)) d = addMonths(d, 12); return d; };
  const dec31 = () => { const t = new Date(); return new Date(t.getFullYear(), 11, 31); };
  const nov1 = () => { const t = new Date(); const d = new Date(t.getFullYear(), 10, 1); return d < addDays(t, -30) ? new Date(t.getFullYear() + 1, 10, 1) : d; };

  const G = {
    WA: {
      name: "Western Australia",
      authority: "Department of Education WA, through your education regional office and a home education moderator",
      contact: [["Find your regional office", "https://www.education.wa.edu.au/contact"]],
      dates: { reg_date: "Date on your certificate of registration" },
      overview: "You register with your local education regional office. You're given a home education moderator, who meets with you within 3 months, then once a year, to look at your education program and your child's progress.",
      steps: [
        { id: "wa-school", phase: "start", title: "If your child is at school, talk to the school first", body: "Registering for home education ends your child's school enrolment. If the school is outside your local intake area, your child may not be able to go back. Home-educated children can't use school-based services such as school psychologists, education assistants or therapy, so plan other supports (for example through the NDIS)." },
        { id: "wa-register", phase: "start", title: "Register with your education regional office", body: "Ask your regional office for the registration form. You'll need an email address and phone number, your WA address, and proof of your child's identity and date of birth (such as a birth certificate or passport), plus court orders or guardianship papers if they apply. If your child is leaving a WA school, register within 14 days of leaving. For a new school year, register by the last Friday in February. You'll receive a certificate of registration and the name of your moderator." },
        { id: "wa-program", phase: "start", title: "Write your education program", app: "pack", body: "The moderator reviews how your program is tailored to your child. You choose the approach and how it's presented, as long as it meets the registration requirements. Pitch it at your child's real level. Spectrum Home Ed maps lessons to the Western Australian Curriculum learning areas, which makes the coverage easy to show." },
        { id: "wa-first", phase: "start", title: "Book your first evaluation meeting (within 3 months)", body: "Contact your moderator to schedule the first meeting within 3 months of registration. It's held where your child usually learns, or another place you agree on. Your child is welcome to join, but doesn't have to." },
        { id: "wa-evidence", phase: "year", title: "Keep examples of learning as you go", app: "evidence", body: "Moderators look at work samples, portfolios, photos, written records or your own explanations of your child's progress. Short, regular records are easier than gathering everything before a meeting." },
        { id: "wa-annual", phase: "year", recurring: true, title: "Annual evaluation meeting", app: "report", body: "Due within 12 months of your registration date, every year. Book it at least 21 days before it's due. Bring your education program and examples of learning. The moderator talks with you about your child's strengths, interests, goals and progress, and their wellbeing: social and emotional support, social interaction and community involvement, physical activity and health." },
        { id: "wa-details", phase: "year", title: "Keep your contact details up to date", body: "Tell your regional office if your address, email or phone number changes." }
      ],
      deadlines(c) {
        const r = D(c.reg_date); if (!r) return [];
        const out = [{ step: "wa-first", title: "First evaluation meeting due", due: addMonths(r, 3) }];
        const a = nextYearly(r); out.push({ step: "wa-annual", title: "Book your annual evaluation meeting", due: addDays(a, -21), cycleStart: addMonths(a, -12) }, { step: "wa-annual", title: "Annual evaluation meeting due", due: a, cycleStart: addMonths(a, -12) });
        return out;
      },
      sources: [
        ["Register for home education", "https://www.education.wa.edu.au/register-for-home-education"],
        ["Home educator responsibilities and registration", "https://www.education.wa.edu.au/home-educator-responsibilities-and-registration"],
        ["What to expect at your evaluation meeting", "https://www.education.wa.edu.au/what-to-expect-at-your-home-education-evaluation-meeting"]
      ]
    },

    NSW: {
      name: "New South Wales",
      authority: "NSW Education Standards Authority (NESA), Home Schooling",
      contact: [["Phone 02 8340 8510", "tel:+61283408510"], ["homeschooling@det.nsw.edu.au", "mailto:homeschooling@det.nsw.edu.au"], ["Applying to register", "https://www.nsw.gov.au/education-and-training/home-schooling/applying-to-register"]],
      dates: { reg_date: "Registration start date (on your certificate)", reg_end: "Registration end date (on your certificate)" },
      overview: "You apply through the Home Schooling Parent Portal. An Authorised Person visits to talk through your educational program (your child isn't assessed). Registration lasts up to 2 years, and first registrations are usually shorter. Renewals look at records of what you actually taught.",
      steps: [
        { id: "nsw-program", phase: "start", title: "Prepare your educational program", app: "pack", body: "Base it on the NESA syllabuses, adjusted for your child's needs. From Kindergarten to Year 6 it covers English, Mathematics, Science and Technology, HSIE, Creative Arts and PDHPE. In Years 7 to 10 it covers English, Mathematics, Science and HSIE, plus two more from different key learning areas. Show your child's learning needs and how you'll meet them, how time is allocated to learning, how you'll record progress, and your learning space and resources." },
        { id: "nsw-apply", phase: "start", title: "Apply through the Home Schooling Parent Portal", body: "Apply any time of year. Applications for children with disability or additional learning needs are accepted. It usually takes about 7 weeks, and up to 12. Apply about 3 months before you want to start." },
        { id: "nsw-visit", phase: "start", title: "Authorised Person visit", body: "An Authorised Person visits your home to discuss your program and look at your planning materials. They don't test your child. They recommend whether to register and for how long." },
        { id: "nsw-records", phase: "year", title: "Keep records of what you teach", app: "evidence", body: "Keep your planning, records of learning activities, and how you track progress and achievement. At renewal, the Authorised Person reviews the program as it was actually taught, not just the plan." },
        { id: "nsw-renew", phase: "year", title: "Apply to renew (3 months before it ends)", app: "report", body: "Use the renewal application. NESA advises applying 3 months before your registration ends. If you were given a short first period, that may be early in the period." },
        { id: "nsw-changes", phase: "year", title: "Tell NESA about changes", body: "Let NESA know about changes such as a new address or contact details." }
      ],
      deadlines(c) { const e = D(c.reg_end); return e ? [{ step: "nsw-renew", title: "Apply to renew registration", due: addMonths(e, -3) }, { step: null, title: "Registration ends", due: e, info: true }] : []; },
      sources: [
        ["Registration at a glance", "https://www.nsw.gov.au/education-and-training/home-schooling/registration-guidelines/registration-at-a-glance"],
        ["Application and assessment process", "https://www.nsw.gov.au/nesa/regulation/home-schooling/registration-guidelines/application-and-assessment-process"]
      ]
    },

    VIC: {
      name: "Victoria",
      authority: "Victorian Registration and Qualifications Authority (VRQA), Home Schooling",
      contact: [["Phone 03 9637 2806", "tel:+61396372806"], ["home.schooling@education.vic.gov.au", "mailto:home.schooling@education.vic.gov.au"], ["VRQA home education", "https://www2.vrqa.vic.gov.au/home-education"]],
      dates: { reg_date: "Date registration was approved" },
      overview: "You email an application form and a learning plan to the VRQA, who decide within 28 days of a complete application. Each year you confirm you're continuing. Up to 10% of families are selected for a review each year.",
      steps: [
        { id: "vic-plan", phase: "start", title: "Write a learning plan", app: "pack", body: "Every application needs one. Include your child's details, where learning happens, your general schedule, and how you'll record learning. Then describe your program by subject or by activity, showing how it substantially covers the 8 learning areas, with specific resources (not just \"books\" or \"the internet\"). A section on your child's needs is optional: keep it to a general comment, with no medical details. You can apply for an exemption from some learning areas, and disability is a recognised reason, but not from all 8." },
        { id: "vic-apply", phase: "start", title: "Email your application", body: "Fill in the VRQA application form and email it with your evidence documents and the learning plan, as separate PDFs, to home.schooling@education.vic.gov.au. Send copies, not originals. Assessment takes up to 28 days once your application is complete. Home education can start from approval or a future date you choose." },
        { id: "vic-records", phase: "year", title: "Keep records in case you're reviewed", app: "evidence", body: "If selected, you'll be told and can choose a desktop review (email evidence) or a phone or video meeting. Have ready: an overview of your approach, your child's interests and needs, your program by learning area or activity, and evidence such as work samples, photos, journals or activity records. The review checks your program, not your child's results." },
        { id: "vic-confirm", phase: "year", recurring: true, title: "Confirm your registration each year", body: "Towards the end of each year, the VRQA emails you for each child. Choose to continue or cancel." },
        { id: "vic-changes", phase: "year", title: "Tell the VRQA about changes", body: "Let them know if your child's name, the responsible parent, your contact details or your home schooling address change." }
      ],
      deadlines() { const d = nov1(); return [{ step: "vic-confirm", title: "Watch for the VRQA's yearly confirmation email", due: d, cycleStart: addMonths(d, -6), soft: true }]; },
      sources: [
        ["Register to home educate", "https://www2.vrqa.vic.gov.au/register-home-educate"],
        ["Develop a learning plan", "https://www2.vrqa.vic.gov.au/develop-home-education-learning-plan"],
        ["Understand home education reviews", "https://www2.vrqa.vic.gov.au/understand-home-education-reviews"]
      ]
    },

    QLD: {
      name: "Queensland",
      authority: "Queensland Home Education (QHE), Department of Education",
      contact: [["Phone 1800 677 176", "tel:1800677176"], ["homeeducation@qed.qld.gov.au", "mailto:homeeducation@qed.qld.gov.au"], ["Registration", "https://education.qld.gov.au/schools-educators/other-education/home-education/registration"]],
      dates: { reg_date: "Registration date (on your registration letter)" },
      overview: "You apply with a summary of your educational program and are provisionally registered as soon as you lodge it, so you can start straight away. Each year you send a report on your child's progress plus an updated program summary.",
      steps: [
        { id: "qld-school", phase: "start", title: "Check school enrolment", body: "Your child can't be enrolled at a school and registered for home education at the same time. If they're enrolled, talk to the principal first." },
        { id: "qld-summary", phase: "start", title: "Write your educational program summary", app: "pack", body: "Outline your child's learning for the coming year: their needs and background, your goals, planned learning activities, how you'll track progress, and how your learning environment supports their wellbeing. It doesn't need to list everything. QHE's templates are optional." },
        { id: "qld-apply", phase: "start", title: "Lodge your application", body: "Use the Application for Registration for Home Education (online, or the Word form by email or post). Attach copies of your child's birth certificate and Medicare card, any court orders, and your program summary. You're provisionally registered once you lodge it. QHE has 90 days to decide." },
        { id: "qld-records", phase: "year", title: "Keep records for your report", app: "evidence", body: "Your yearly report has to describe your child's progress, so keep notes, photos and samples as you go." },
        { id: "qld-report", phase: "year", recurring: true, title: "Send your yearly report", app: "report", body: "A link arrives in the 9th month of registration, and the report is due by the 10th month. The exact date is in your registration letter, and it can't be extended. Send the approved form, a written report on your child's progress, and an updated program summary for next year. The online form needs a computer or tablet, not a phone." },
        { id: "qld-changes", phase: "year", title: "Tell QHE if you move", body: "Notify QHE within 28 days if your child's usual home address changes." }
      ],
      deadlines(c) { const r = D(c.reg_date); if (!r) return []; const due = nextYearly(r, 10); return [{ step: "qld-report", title: "Report link arrives (about now)", due: addMonths(due, -1), cycleStart: addMonths(due, -12), soft: true }, { step: "qld-report", title: "Yearly report due (check your letter for the exact date)", due, cycleStart: addMonths(due, -12) }]; },
      sources: [
        ["Registration", "https://education.qld.gov.au/schools-educators/other-education/home-education/registration"],
        ["Reporting", "https://education.qld.gov.au/schools-educators/other-education/home-education/reports"]
      ]
    },

    SA: {
      name: "South Australia",
      authority: "Home Education unit, Department for Education",
      contact: [["Phone 08 8226 1327 (best on Mondays and Fridays)", "tel:+61882261327"], ["Education.HomeEducation@sa.gov.au", "mailto:Education.HomeEducation@sa.gov.au"], ["Home education in SA", "https://www.sa.gov.au/topics/education-skills-and-learning/schools/alternative-schooling/home-education"]],
      dates: { reg_date: "Exemption start date", reg_end: "Exemption end date" },
      overview: "In South Australia, home education is an exemption from school. Your child must be enrolled at a school when you apply. A home education officer visits, and exemptions are usually granted for 12 months, then reviewed each year.",
      steps: [
        { id: "sa-apply", phase: "start", title: "Request and complete the application", body: "Your child must be 6 to 17 and enrolled at a South Australian school. Email the Home Education unit for the application. Everyone with parental responsibility needs to consent. Include the birth certificate and any court orders or parenting plans. Incomplete applications are declined after 14 days. While you wait, you can ask the school principal for a 4-week exemption." },
        { id: "sa-program", phase: "start", title: "Write a 12-month learning program", app: "pack", body: "Cover all 8 learning areas of the Australian Curriculum. Set 3 learning goals, list topics, activities and resources for each area, and describe how you'll monitor progress, your learning environment, and planned social interaction. Programs can be individualised and combine functional life skills, therapy goals and academic goals. A therapist's or doctor's report is requested to confirm a diagnosis or health needs." },
        { id: "sa-visit", phase: "start", title: "Home visit", body: "A home education officer visits during school terms, in business hours, and your child needs to be there. Assessment usually takes 4 to 5 weeks. The officer recommends, and the Minister's delegate decides." },
        { id: "sa-records", phase: "year", title: "Keep evidence of learning", app: "evidence", body: "Your yearly review needs evidence of learning. Literacy and numeracy evidence is looked at first." },
        { id: "sa-review", phase: "year", recurring: true, title: "Annual review, before your exemption ends", app: "report", body: "Send the review form with evidence of learning and goals for the next 12 months, then have a review meeting at home before the expiry date. If the form is incomplete, or you can't be reached within 7 days after expiry, the exemption isn't renewed." },
        { id: "sa-changes", phase: "year", title: "Report changes within 14 days", body: "Tell the Home Education unit in writing about changes to your address, contact details, school or education arrangements." }
      ],
      deadlines(c) { const e = D(c.reg_end); return e ? [{ step: "sa-review", title: "Send your review form (well before expiry)", due: addDays(e, -42), cycleStart: addMonths(e, -12) }, { step: null, title: "Exemption ends", due: e, info: true }] : []; },
      sources: [
        ["Home education (SA Government)", "https://www.sa.gov.au/topics/education-skills-and-learning/schools/alternative-schooling/home-education"],
        ["Guide to home education in South Australia (PDF)", "https://www.education.sa.gov.au/docs/sa.gov/guide-to-home-education-in-south-australia.pdf"]
      ]
    },

    TAS: {
      name: "Tasmania",
      authority: "Office of the Education Registrar (OER)",
      contact: [["Office of the Education Registrar", "https://oer.tas.gov.au/"], ["Apply for home education", "https://service.tas.gov.au/services/education-and-skills/schools/apply-for-home-education"]],
      caution: "We couldn't read every page of the Registrar's website, so some details here come from the Registrar's published standards and from home education support groups. Please confirm them with the Office of the Education Registrar.",
      dates: { reg_date: "Registration start date", reg_end: "Registration end date" },
      overview: "You must register with the Office of the Education Registrar. Each child needs a Home Education Summary and Program (HESP), and a registration officer meets your child. When you renew, the HESP also summarises the past year.",
      steps: [
        { id: "tas-hesp", phase: "start", title: "Write a Home Education Summary and Program (HESP)", app: "pack", body: "One for each child, with a bold heading for each of the Registrar's standards: Diverse Learning Needs (if relevant), Research, Pedagogy, Literacy, Numeracy, Range of Learning Areas, Wellbeing, Interpersonal Skills, Future Directions (age 13 and over) and Evaluation. Give enough detail for the registration officer to understand your program." },
        { id: "tas-apply", phase: "start", title: "Apply to the Registrar", body: "One application per family, naming each child. Include a certified copy of each child's birth certificate, proof of Tasmanian residence, any court orders, a HESP for each child, and how you'll record learning and progress. Support groups report that provisional registration usually comes within 1 to 2 weeks." },
        { id: "tas-visit", phase: "start", title: "Meet your registration officer", body: "A registration officer needs to see your child, at home, another place you choose, or by video." },
        { id: "tas-records", phase: "year", title: "Keep records of what you teach", app: "evidence", body: "Your renewal compares what you planned with what you delivered, so keep notes and samples as you go." },
        { id: "tas-renew", phase: "year", recurring: true, title: "Renew with an updated HESP", app: "report", body: "Reapply before registration ends, with an updated HESP for each child that includes a summary and evaluation of the previous year." }
      ],
      deadlines(c) { const e = D(c.reg_end); return e ? [{ step: "tas-renew", title: "Start your renewal and updated HESP", due: addMonths(e, -2), cycleStart: addMonths(e, -12) }, { step: null, title: "Registration ends", due: e, info: true }] : []; },
      sources: [
        ["Apply for home education (Service Tasmania)", "https://service.tas.gov.au/services/education-and-skills/schools/apply-for-home-education"],
        ["HESP requirements and standards (OER, PDF)", "https://oer.tas.gov.au/wp-content/uploads/2017/11/Home-Education-Summary-and-Program-Requirements-and-Standards-Oct-2017-OER-005-V2.pdf"],
        ["Tasmania registration and reporting (Simply Homeschool)", "https://simplyhomeschool.com.au/support/registration-and-reporting/tas/"]
      ]
    },

    ACT: {
      name: "Australian Capital Territory",
      authority: "ACT Education Directorate, Home Education team",
      contact: [["HomeEd@act.gov.au", "mailto:HomeEd@act.gov.au"], ["Home education in the ACT", "https://www.act.gov.au/education-and-training/find-a-school-and-enrol/home-education-home-schooling"]],
      dates: { reg_date: "Start date on your Registration Certificate", reg_end: "Registration end date" },
      overview: "You apply online and can start once a complete application is in. Within 3 months you send a Statement of Intent and have a short online meeting. Each year you send a Home Education Report by 31 December. There are no home visits.",
      steps: [
        { id: "act-apply", phase: "start", title: "Apply online", body: "Your child must be 6 to 17 and live in the ACT. Attach certified copies of their birth certificate or passport, proof of ACT residence (driver's licence, rental agreement or utility bill), and a Medicare card or court orders if your name isn't on the birth certificate. A doctor, pharmacist or JP can certify them, but family can't. You can start once you've submitted a complete application. The aim is to respond within 28 days." },
        { id: "act-soi", phase: "start", title: "Statement of Intent and online meeting (within 3 months)", app: "pack", body: "Send your Statement of Intent within 3 months of the start date on your Registration Certificate. You'll also be invited to an online review meeting of about 30 minutes in that time." },
        { id: "act-records", phase: "year", title: "Keep records of learning", app: "evidence", body: "There are no home visits, but you may be asked for photos or videos of your learning space. Keep notes and samples for your yearly report." },
        { id: "act-report", phase: "year", recurring: true, title: "Home Education Report by 31 December", app: "report", body: "Send a Home Education Report for each registered child by 31 December every year, online or by email." },
        { id: "act-renew", phase: "year", title: "Renew at least 3 months before expiry", body: "Registration lasts up to 2 years. To renew, send proof of responsibility for your child, a Written Statement and a Home Education Report." }
      ],
      deadlines(c) {
        const out = []; const r = D(c.reg_date), e = D(c.reg_end);
        if (r) out.push({ step: "act-soi", title: "Send your Statement of Intent", due: addMonths(r, 3) });
        const d = dec31(); out.push({ step: "act-report", title: "Home Education Report due", due: d, cycleStart: new Date(d.getFullYear(), 0, 1) });
        if (e) out.push({ step: "act-renew", title: "Apply to renew registration", due: addMonths(e, -3) });
        return out;
      },
      sources: [["Home education (ACT Government)", "https://www.act.gov.au/education-and-training/find-a-school-and-enrol/home-education-home-schooling"]]
    },

    NT: {
      name: "Northern Territory",
      authority: "NT Department of Education, Home Education",
      contact: [["Phone 08 8944 9214", "tel:+61889449214"], ["homeeducation.doe@education.nt.gov.au", "mailto:homeeducation.doe@education.nt.gov.au"], ["Home education in the NT", "https://nt.gov.au/learning/primary-and-secondary-students/home-education"]],
      dates: { reg_date: "Date approved" },
      overview: "You apply online with a teaching, learning and assessment plan. Your child stays at school until you're approved. Approval lasts one school year, so you reapply every year.",
      steps: [
        { id: "nt-plan", phase: "start", title: "Write a teaching, learning and assessment plan", app: "pack", body: "Use the plan for your child's year level. If you use a commercial curriculum, combine it into one PDF. If you write your own, or mix, also complete the self-developed curriculum plan." },
        { id: "nt-apply", phase: "start", title: "Apply online", body: "Submit the online application with your documents. Your child must stay enrolled and attending school until you're approved. Assessment can take up to 4 weeks." },
        { id: "nt-records", phase: "year", title: "Keep records of learning", app: "evidence", body: "Keep notes and samples. They'll help with next year's application." },
        { id: "nt-reapply", phase: "year", recurring: true, title: "Reapply for next year", app: "pack", body: "Approval is for one school year. Continuing families have a deadline late in the year (in the past it has been in November for Transition to Year 10). Check the current date with the department." }
      ],
      deadlines() { const d = nov1(); return [{ step: "nt-reapply", title: "Reapply for next year (check this year's deadline)", due: d, cycleStart: addMonths(d, -6), soft: true }]; },
      sources: [["Home education (NT Government)", "https://nt.gov.au/learning/primary-and-secondary-students/home-education"]]
    }
  };

  // Upcoming deadlines for a child, skipping steps already ticked (for recurring steps, ticked in this cycle)
  function deadlines(child) {
    const g = G[child.state]; if (!g) return [];
    const done = child.checklist || {};
    return g.deadlines(child).filter(d => {
      if (!d.step) return true;
      const t = done[d.step]; if (!t) return true;
      return d.cycleStart ? new Date(t) < d.cycleStart : false;
    }).sort((a, b) => a.due - b.due);
  }
  function progress(child) {
    const g = G[child.state]; if (!g) return { done: 0, total: 0 };
    const done = child.checklist || {};
    const start = g.steps.filter(s => s.phase === "start");
    return { done: start.filter(s => done[s.id]).length, total: start.length };
  }
  window.SHE_GUIDES = G; window.SHE_GUIDE_VERIFIED = VERIFIED;
  window.SHE_deadlines = deadlines; window.SHE_guideProgress = progress;
})();
