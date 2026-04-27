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

if (!contactToEmail) {
  console.warn("Missing CONTACT_TO_EMAIL in .env.");
}

const hasResendConfig = Boolean(resendApiKey && resendFromEmail);
const resend = hasResendConfig ? new Resend(resendApiKey) : null;

const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 2;
const submissionsByPerson = new Map();

if (!hasResendConfig) {
  // Keep startup warning explicit so configuration issues are visible immediately.
  console.warn(
    "No email provider configured. Set RESEND_API_KEY + RESEND_FROM_EMAIL in .env.",
  );
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const sendViaResend = async ({
  safeSchoolName,
  safeContactName,
  safeEmail,
  safeChallenge,
}) => {
  if (!hasResendConfig) {
    throw new Error("Resend not configured");
  }

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

const getRateLimitKey = ({ email, ip }) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }
  return `ip:${ip || "unknown-ip"}`;
};

const checkAndTrackRateLimit = (key, nowMs) => {
  const existingTimestamps = submissionsByPerson.get(key) || [];
  const recentTimestamps = existingTimestamps.filter(
    (timestamp) => nowMs - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestWithinWindow = recentTimestamps[0];
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (nowMs - oldestWithinWindow);
    return {
      isLimited: true,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  recentTimestamps.push(nowMs);
  submissionsByPerson.set(key, recentTimestamps);
  return { isLimited: false };
};

app.post("/api/contact", async (req, res) => {
  const { schoolName, contactName, email, challenge, companyWebsite } =
    req.body || {};

  if (companyWebsite) {
    // Honeypot hit: pretend success to silently drop obvious bot traffic.
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

  const safeSchoolName = String(schoolName || "").trim();
  const safeContactName = String(contactName).trim();
  const safeEmail = String(email).trim();
  const safeChallenge = String(challenge || "").trim();
  const rateLimitKey = getRateLimitKey({ email: safeEmail, ip: req.ip });
  const rateLimitState = checkAndTrackRateLimit(rateLimitKey, Date.now());

  if (rateLimitState.isLimited) {
    return res.status(429).json({
      ok: false,
      error: "Too many submissions",
      code: "RATE_LIMITED",
      retryAfterSec: rateLimitState.retryAfterSec,
    });
  }

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
