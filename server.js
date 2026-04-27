import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const contactToEmail = process.env.CONTACT_TO_EMAIL;
const contactFromEmail = process.env.CONTACT_FROM_EMAIL;
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

const DAILY_CAP = Number(process.env.DAILY_EMAIL_CAP) || 80;
const EMAIL_COOLDOWN_MS = 30 * 60 * 1000;
const IP_HOURLY_LIMIT = 5;
const IP_HOURLY_WINDOW_MS = 60 * 60 * 1000;
const MIN_FORM_FILL_MS = 3000;

if (!contactToEmail) {
  console.warn("Missing CONTACT_TO_EMAIL in .env.");
}

const hasResendConfig = Boolean(resendApiKey && resendFromEmail);
const resend = hasResendConfig ? new Resend(resendApiKey) : null;

if (!hasResendConfig) {
  console.warn(
    "No Resend config found. Set RESEND_API_KEY + RESEND_FROM_EMAIL in .env.",
  );
}
if (!turnstileSecret) {
  console.warn(
    "Missing TURNSTILE_SECRET_KEY in .env — captcha verification will fail.",
  );
}

// In-memory store for local dev only. On Vercel, api/contact.js uses Vercel KV.
const emailCooldown = new Map();
const ipCounter = new Map();
let dailyDate = new Date().toISOString().slice(0, 10);
let dailyCount = 0;

const rolloverDailyIfNeeded = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyDate) {
    dailyDate = today;
    dailyCount = 0;
  }
};

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const verifyTurnstile = async (token, ip) => {
  if (!turnstileSecret) return false;
  if (!token) return false;

  const params = new URLSearchParams();
  params.append("secret", turnstileSecret);
  params.append("response", token);
  if (ip) params.append("remoteip", ip);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: params },
    );
    const data = await res.json();
    return Boolean(data?.success);
  } catch {
    return false;
  }
};

const sendViaResend = async ({
  safeSchoolName,
  safeContactName,
  safeEmail,
  safeChallenge,
}) => {
  if (!resend) throw new Error("Resend not configured");

  const { error } = await resend.emails.send({
    from: contactFromEmail || resendFromEmail,
    to: contactToEmail,
    replyTo: safeEmail,
    subject: `Nový predbežný záujem - ${safeContactName}`,
    text: [
      "Nový predbežný záujem z webu.",
      "",
      `Škola / organizácia: ${safeSchoolName || "Neuvedené"}`,
      `Kontaktná osoba: ${safeContactName}`,
      `E-mail: ${safeEmail}`,
      "",
      "Poznámka:",
      safeChallenge || "Neuvedené",
    ].join("\n"),
    html: `
      <h2>Nový predbežný záujem z webu</h2>
      <p><strong>Škola / organizácia:</strong> ${safeSchoolName || "Neuvedené"}</p>
      <p><strong>Kontaktná osoba:</strong> ${safeContactName}</p>
      <p><strong>E-mail:</strong> ${safeEmail}</p>
      <p><strong>Poznámka:</strong><br/>${(safeChallenge || "Neuvedené").replace(/\n/g, "<br/>")}</p>
    `,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message || "Unknown error"}`);
  }
};

app.post("/api/contact", async (req, res) => {
  const {
    schoolName,
    contactName,
    email,
    challenge,
    companyWebsite,
    formStartTs,
    turnstileToken,
  } = req.body || {};

  if (companyWebsite) {
    return res.status(200).json({ ok: true });
  }

  const startTs = Number(formStartTs);
  if (!startTs || Date.now() - startTs < MIN_FORM_FILL_MS) {
    return res.status(200).json({ ok: true });
  }

  if (!contactName || !email) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing required fields" });
  }

  if (!hasResendConfig || !contactToEmail) {
    return res.status(500).json({ ok: false, error: "Email not configured" });
  }

  const ip = req.ip || "unknown-ip";

  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return res
      .status(403)
      .json({ ok: false, error: "Captcha failed", code: "CAPTCHA_FAILED" });
  }

  const safeSchoolName = String(schoolName || "").trim();
  const safeContactName = String(contactName).trim();
  const safeEmail = String(email).trim().toLowerCase();
  const safeChallenge = String(challenge || "").trim();

  rolloverDailyIfNeeded();
  const now = Date.now();

  const lockedUntil = emailCooldown.get(safeEmail);
  if (lockedUntil && lockedUntil > now) {
    return res.status(429).json({
      ok: false,
      error: "Too many submissions",
      code: "RATE_LIMITED",
      retryAfterSec: Math.ceil((lockedUntil - now) / 1000),
    });
  }

  const ipBucket = ipCounter.get(ip) || { count: 0, resetAt: now + IP_HOURLY_WINDOW_MS };
  if (ipBucket.resetAt < now) {
    ipBucket.count = 0;
    ipBucket.resetAt = now + IP_HOURLY_WINDOW_MS;
  }
  if (ipBucket.count >= IP_HOURLY_LIMIT) {
    return res.status(429).json({
      ok: false,
      error: "Too many submissions from this network",
      code: "RATE_LIMITED",
      retryAfterSec: Math.ceil((ipBucket.resetAt - now) / 1000),
    });
  }
  ipBucket.count += 1;
  ipCounter.set(ip, ipBucket);

  if (dailyCount >= DAILY_CAP) {
    return res.status(503).json({
      ok: false,
      error: "Daily limit reached",
      code: "DAILY_CAP_REACHED",
    });
  }
  dailyCount += 1;

  emailCooldown.set(safeEmail, now + EMAIL_COOLDOWN_MS);

  try {
    await sendViaResend({
      safeSchoolName,
      safeContactName,
      safeEmail,
      safeChallenge,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Contact form email send failed:", error);
    return res.status(500).json({ ok: false, error: "Email send failed" });
  }
});

app.get("*", (req, res) => {
  const requestedPath = req.path === "/" ? "/index.html" : req.path;
  const fullPath = path.join(__dirname, requestedPath);
  res.sendFile(fullPath, (err) => {
    if (err) {
      res.status(404).sendFile(path.join(__dirname, "404.html"));
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
