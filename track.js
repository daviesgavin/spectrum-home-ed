// Spectrum Home Ed visit counter. No cookies, no IP addresses stored.
// Location is estimated from the device time zone (e.g. Australia/Perth -> Perth, Australia).
(function () {
  try {
    if (localStorage.getItem("she-no-track") === "1") return;
    var URL_ = "https://tisidhzgcntvsybzwhog.supabase.co/rest/v1/visits";
    var KEY = "sb_publishable_QouTA8MfAX-zLpK1xADbqQ_HIzL4LQK";
    var vid = localStorage.getItem("she-vid");
    if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("she-vid", vid); }
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    var parts = tz.split("/"), region = parts[0] || "", place = (parts[parts.length - 1] || "").replace(/_/g, " ");
    var COUNTRY = { "Australia": "Australia", "Pacific/Auckland": "New Zealand", "Europe/London": "United Kingdom", "Europe/Dublin": "Ireland",
      "America/New_York": "United States", "America/Chicago": "United States", "America/Denver": "United States", "America/Los_Angeles": "United States", "America/Phoenix": "United States",
      "America/Toronto": "Canada", "America/Vancouver": "Canada", "Asia/Singapore": "Singapore", "Asia/Kolkata": "India", "Asia/Tokyo": "Japan", "Asia/Manila": "Philippines", "Africa/Johannesburg": "South Africa" };
    var country = COUNTRY[tz] || COUNTRY[region] || region || "Unknown";
    var w = window.innerWidth || 1024;
    var body = { visitor_id: vid, path: (location.pathname + (location.hash.split("?")[0] || "")).slice(0, 200), referrer: (document.referrer || "").slice(0, 300),
      time_zone: tz.slice(0, 64), country: country, city: place || null, language: (navigator.language || "").slice(0, 20), device: w < 768 ? "mobile" : w < 1100 ? "tablet" : "desktop" };
    fetch(URL_, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", apikey: KEY, Prefer: "return=minimal" }, body: JSON.stringify(body) }).catch(function () {});
  } catch (e) { /* never break the page */ }
})();
