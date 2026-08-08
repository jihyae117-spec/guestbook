import crypto from "crypto";
import type { NextRequest } from "next/server";

const SECRET = process.env.SESSION_SECRET || "";
const TTL_MS = 2 * 60 * 60 * 1000;

export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_COOKIE_MAX_AGE_SEC = TTL_MS / 1000;

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createAdminSessionToken(username: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${username}.${expires}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyAdminSessionToken(token: string | undefined | null): { username: string } | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;
    const [username, expiresStr, signature] = parts;
    const payload = `${username}.${expiresStr}`;
    const expected = sign(payload);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    if (Date.now() > Number(expiresStr)) return null;
    return { username };
  } catch {
    return null;
  }
}

export function getAdminFromRequest(req: NextRequest): { username: string } | null {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}
