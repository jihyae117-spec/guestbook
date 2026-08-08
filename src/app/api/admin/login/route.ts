import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { adminLoginSchema } from "@/lib/validation";
import { createAdminSessionToken, ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE_SEC } from "@/lib/adminSession";
import { isPasswordLocked, recordPasswordFailure, resetPasswordFailures, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const lockKey = `admin-login:${ip}`;
  const lock = isPasswordLocked(lockKey);
  if (lock.locked) {
    return NextResponse.json(
      { error: "로그인을 여러 번 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { username } });

  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    recordPasswordFailure(lockKey);
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  resetPasswordFailures(lockKey);

  const token = createAdminSessionToken(admin.username);
  const res = NextResponse.json({ username: admin.username });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE_SEC,
  });
  return res;
}
