import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { isPasswordLocked, recordPasswordFailure, resetPasswordFailures, getClientIp } from "@/lib/rateLimit";
import { entryUpdateSchema, passwordOnlySchema } from "@/lib/validation";
import { serializeEntry } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

async function loadEntry(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id)) return null;
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry || entry.isDeleted) return null;
  return entry;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const entry = await loadEntry(idParam);
  if (!entry) {
    return NextResponse.json({ error: "존재하지 않는 글입니다." }, { status: 404 });
  }

  const lockKey = `entry:${entry.id}:${getClientIp(req)}`;
  const lock = isPasswordLocked(lockKey);
  if (lock.locked) {
    return NextResponse.json(
      { error: "비밀번호를 여러 번 잘못 입력했습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = entryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }, { status: 400 });
  }

  const { name, content, password } = parsed.data;

  const passwordOk = await verifyPassword(password, entry.passwordHash);
  if (!passwordOk) {
    recordPasswordFailure(lockKey);
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 });
  }
  resetPasswordFailures(lockKey);

  const updated = await prisma.entry.update({
    where: { id: entry.id },
    data: { name, content, updatedAt: new Date() },
    include: { replies: { where: { isDeleted: false }, orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(serializeEntry(updated));
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const entry = await loadEntry(idParam);
  if (!entry) {
    return NextResponse.json({ error: "존재하지 않는 글입니다." }, { status: 404 });
  }

  const lockKey = `entry:${entry.id}:${getClientIp(req)}`;
  const lock = isPasswordLocked(lockKey);
  if (lock.locked) {
    return NextResponse.json(
      { error: "비밀번호를 여러 번 잘못 입력했습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = passwordOnlySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
  }

  const passwordOk = await verifyPassword(parsed.data.password, entry.passwordHash);
  if (!passwordOk) {
    recordPasswordFailure(lockKey);
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 });
  }
  resetPasswordFailures(lockKey);

  await prisma.entry.update({ where: { id: entry.id }, data: { isDeleted: true } });

  return NextResponse.json({ ok: true });
}
