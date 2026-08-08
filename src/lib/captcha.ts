import crypto from "crypto";

const SECRET = process.env.CAPTCHA_SECRET || "";
const TTL_MS = 5 * 60 * 1000;

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export interface CaptchaChallenge {
  question: string;
  token: string;
}

export function issueCaptcha(): CaptchaChallenge {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const expires = Date.now() + TTL_MS;
  const payload = `${a}.${b}.${expires}`;
  const signature = sign(payload);
  const token = Buffer.from(`${payload}.${signature}`).toString("base64url");
  return { question: `${a} + ${b} = ?`, token };
}

export function verifyCaptcha(token: string | undefined, answer: string | number | undefined): boolean {
  if (!token || answer === undefined || answer === null || answer === "") return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 4) return false;
    const [aStr, bStr, expiresStr, signature] = parts;
    const payload = `${aStr}.${bStr}.${expiresStr}`;
    const expected = sign(payload);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
    if (Date.now() > Number(expiresStr)) return false;
    const correct = Number(aStr) + Number(bStr);
    return Number(answer) === correct;
  } catch {
    return false;
  }
}
