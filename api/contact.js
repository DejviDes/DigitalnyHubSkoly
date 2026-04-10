import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const contactToEmail = process.env.CONTACT_TO_EMAIL;
const contactFromEmail = process.env.CONTACT_FROM_EMAIL;

const hasResendConfig = Boolean(resendApiKey && resendFromEmail);
const resend = hasResendConfig ? new Resend(resendApiKey) : null;

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
    subject: `Nova ziadost o demo - ${safeSchoolName}`,
    text: [
      "Nova ziadost o demo z webu.",
      "",
      `Skola: ${safeSchoolName}`,
      `Kontaktna osoba: ${safeContactName}`,
      `E-mail: ${safeEmail}`,
      "",
      "Najvacsia vyzva:",
      safeChallenge,
    ].join("\n"),
    html: `
      <h2>Nova ziadost o demo z webu</h2>
      <p><strong>Skola:</strong> ${safeSchoolName}</p>
      <p><strong>Kontaktna osoba:</strong> ${safeContactName}</p>
      <p><strong>E-mail:</strong> ${safeEmail}</p>
      <p><strong>Najvacsia vyzva:</strong><br/>${safeChallenge.replace(/\n/g, "<br/>")}</p>
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

  if (!schoolName || !contactName || !email || !challenge) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing required fields" });
  }

  if (!hasResendConfig || !contactToEmail) {
    return res.status(500).json({ ok: false, error: "Email not configured" });
  }

  const safeSchoolName = String(schoolName).trim();
  const safeContactName = String(contactName).trim();
  const safeEmail = String(email).trim();
  const safeChallenge = String(challenge).trim();

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
