// Tridika Rituals — Panchang proxy (Vercel serverless function)
// Holds the ProKerala credentials server-side (never exposed to the browser),
// fetches today's Panchang for Delhi/NCR once per day and returns clean JSON.
//
// Required environment variables (set these in Vercel → Project → Settings → Environment Variables):
//   PROKERALA_CLIENT_ID      your ProKerala Client ID
//   PROKERALA_CLIENT_SECRET  your ProKerala Client Secret
// Optional:
//   PANCHANG_COORDS   default "28.6139,77.2090" (Delhi). Format "lat,long"
//   PANCHANG_AYANAMSA default "1" (Lahiri)

let tokenCache = { token: null, exp: 0 };
let dayCache = { date: null, data: null };

const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;
const COORDS = process.env.PANCHANG_COORDS || "28.6139,77.2090";
const AYANAMSA = process.env.PANCHANG_AYANAMSA || "1";

async function getToken() {
  const now = Date.now() / 1000;
  if (tokenCache.token && tokenCache.exp - 60 > now) return tokenCache.token;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const r = await fetch("https://api.prokerala.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const txt = await r.text();
  if (!r.ok) throw new Error("token " + r.status + " " + txt);
  const j = JSON.parse(txt);
  tokenCache = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return tokenCache.token;
}

function istParts() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const p = {};
  for (const x of fmt.formatToParts(new Date())) p[x.type] = x.value;
  return p;
}
function istDateTime() {
  const p = istParts();
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+05:30`;
}
function istDateKey() {
  const p = istParts();
  return `${p.year}-${p.month}-${p.day}`;
}
function fmtTime(s) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(new Date(s));
  } catch (_) { return s || ""; }
}
function first(a) { return Array.isArray(a) && a.length ? a[0] : (a || null); }
function nm(x) { return x ? (x.name || x.tithi || x.nakshatra || x.yoga || x.karana || "") : ""; }
function pick(list, label) {
  const arr = Array.isArray(list) ? list : [];
  const hit = arr.find((p) => (p.name || "").toLowerCase().includes(label.toLowerCase()));
  if (!hit) return "";
  if (hit.period && hit.period.length) return fmtTime(hit.period[0].start) + " – " + fmtTime(hit.period[0].end);
  if (hit.start) return fmtTime(hit.start) + " – " + fmtTime(hit.end);
  return "";
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      res.status(500).json({ error: "Missing PROKERALA_CLIENT_ID / PROKERALA_CLIENT_SECRET env vars" });
      return;
    }
    const debug = req.query && req.query.debug === "1";
    const today = istDateKey();
    if (!debug && dayCache.date === today && dayCache.data) {
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).json(dayCache.data);
      return;
    }
    const token = await getToken();
    const url =
      "https://api.prokerala.com/v2/astrology/panchang/advanced?ayanamsa=" +
      encodeURIComponent(AYANAMSA) +
      "&coordinates=" + encodeURIComponent(COORDS) +
      "&datetime=" + encodeURIComponent(istDateTime());
    const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    const raw = await r.json();
    if (debug) { res.status(200).json({ requestUrl: url, httpStatus: r.status, raw }); return; }
    if (!r.ok) { res.status(502).json({ error: "panchang " + r.status, raw }); return; }
    const d = raw.data || raw;
    const inaus = d.inauspicious_period || d.inauspicious_periods || d.inauspicious || [];
    const aus = d.auspicious_period || d.auspicious_periods || d.auspicious || [];
    const out = {
      date: today,
      vaara: d.vaara || d.day || "",
      tithi: nm(first(d.tithi)),
      nakshatra: nm(first(d.nakshatra)),
      yoga: nm(first(d.yoga)),
      karana: nm(first(d.karana)),
      rahu: pick(inaus, "Rahu"),
      abhijit: pick(aus, "Abhijit"),
    };
    dayCache = { date: today, data: out };
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
