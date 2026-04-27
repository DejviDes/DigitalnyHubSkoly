import { Resend } from "resend";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const contactToEmail = process.env.CONTACT_TO_EMAIL;
const contactFromEmail = process.env.CONTACT_FROM_EMAIL;
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

const DAILY_CAP = Number(process.env.DAILY_EMAIL_CAP) || 80;
const EMAIL_COOLDOWN_SEC = 30 * 60;
const IP_HOURLY_LIMIT = 5;
const IP_HOURLY_WINDOW_SEC = 60 * 60;
const MIN_FORM_FILL_MS = 3000;

const hasResendConfig = Boolean(resendApiKey && resendFromEmail);
const resend = hasResendConfig ? new Resend(resendApiKey) : null;

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

const sha256 = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 24);

const todayKey = () => {
  const now = new Date();
  return `daily:${now.toISOString().slice(0, 10)}`;
};

const verifyTurnstile = async (token, ip) => {
  if (!turnstileSecret) {
    throw new Error("Turnstile not configured");
  }
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

const getBody = (req) => {
  if (!req.body) return {};
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = getBody(req);
  const {
    schoolName,
    contactName,
    email,
    challenge,
    companyWebsite,
    formStartTs,
    turnstileToken,
  } = body;

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

  const ip = getClientIp(req);

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

  if (redis) {
    try {
      const emailKey = `cooldown:email:${sha256(safeEmail)}`;
      const ipKey = `count:ip:${sha256(ip)}`;
      const dailyCounterKey = todayKey();

      const emailLocked = await redis.get(emailKey);
      if (emailLocked) {
        const ttl = await redis.ttl(emailKey);
        return res.status(429).json({
          ok: false,
          error: "Too many submissions",
          code: "RATE_LIMITED",
          retryAfterSec: Math.max(1, ttl),
        });
      }

      const ipCount = await redis.incr(ipKey);
      if (ipCount === 1) {
        await redis.expire(ipKey, IP_HOURLY_WINDOW_SEC);
      }
      if (ipCount > IP_HOURLY_LIMIT) {
        const ttl = await redis.ttl(ipKey);
        return res.status(429).json({
          ok: false,
          error: "Too many submissions from this network",
          code: "RATE_LIMITED",
          retryAfterSec: Math.max(60, ttl),
        });
      }

      const dailyCount = await redis.incr(dailyCounterKey);
      if (dailyCount === 1) {
        await redis.expire(dailyCounterKey, 60 * 60 * 36);
      }
      if (dailyCount > DAILY_CAP) {
        return res.status(503).json({
          ok: false,
          error: "Daily limit reached",
          code: "DAILY_CAP_REACHED",
        });
      }

      await redis.set(emailKey, "1", { ex: EMAIL_COOLDOWN_SEC });
    } catch (redisError) {
      console.error("Redis rate-limit error (failing open):", redisError);
    }
  } else {
    console.warn("Redis not configured — rate limiting disabled.");
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
