import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const contactToEmail = process.env.CONTACT_TO_EMAIL;
const contactFromEmail = process.env.CONTACT_FROM_EMAIL;

const hasResendConfig = Boolean(resendApiKey && resendFromEmail);
const resend = hasResendConfig ? new Resend(resendApiKey) : null;

const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 2;
const submissionsByPerson = new Map();

const sendViaResend = async ({
  safeSchoolName,
  safeContactName,
  safeEmail,
  safeChallenge,
}) => {
  if (!hasResendConfig || !resend) {
    throw new Error("Resend not configured");
  }

  const { error } = await resend.emails.send({
    from: contactFromEmail || resendFromEmail,
    to: contactToEmail,
    replyTo: safeEmail,
    subject: `Novy predbezny zaujem - ${safeContactName}`,
    text: [
      "Novy predbezny zaujem z webu.",
      "",
      `Skola / organizacia: ${safeSchoolName || "Neuvedene"}`,
      `Kontaktna osoba: ${safeContactName}`,
      `E-mail: ${safeEmail}`,
      "",
      "Poznamka:",
      safeChallenge || "Neuvedene",
    ].join("\n"),
    html: `
      <h2>Novy predbezny zaujem z webu</h2>
      <p><strong>Skola / organizacia:</strong> ${safeSchoolName || "Neuvedene"}</p>
      <p><strong>Kontaktna osoba:</strong> ${safeContactName}</p>
      <p><strong>E-mail:</strong> ${safeEmail}</p>
      <p><strong>Poznamka:</strong><br/>${(safeChallenge || "Neuvedene").replace(/\n/g, "<br/>")}</p>
    `,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message || "Unknown error"}`);
  }
};

const getBody = (req) => {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
};

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  const maybeIp = req.headers["x-real-ip"];
  if (typeof maybeIp === "string" && maybeIp.trim()) {
    return maybeIp.trim();
  }

  return "unknown-ip";
};

const getRateLimitKey = ({ email, ip }) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }
  return `ip:${ip}`;
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { schoolName, contactName, email, challenge, companyWebsite } =
    getBody(req);

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
  const rateLimitKey = getRateLimitKey({
    email: safeEmail,
    ip: getClientIp(req),
  });
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
}
