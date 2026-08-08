import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { isPasswordLocked, recordPasswordFailure, resetPasswordFailures, getClientIp } from "@/lib/rateLimit";
import { replyUpdateSchema, passwordOnlySchema } from "@/lib/validation";
import { serializeReply } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

async function loadReply(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id)) return null;
  const reply = await prisma.reply.findUnique({ where: { id }, include: { entry: true } });
  if (!reply || reply.isDeleted || reply.entry.isDeleted) return null;
  return reply;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const reply = await loadReply(idParam);
  if (!reply) {
    return NextResponse.json({ error: "존재하지 않는 답글입니다." }, { status: 404 });
  }

  const lockKey = `reply:${reply.id}:${getClientIp(req)}`;
  const lock = isPasswordLocked(lockKey);
  if (lock.locked) {
    return NextResponse.json(
      { error: "비밀번호를 여러 번 잘못 입력했습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = replyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }, { status: 400 });
  }

  const { name, content, password } = parsed.data;

  const passwordOk = await verifyPassword(password, reply.passwordHash);
  if (!passwordOk) {
    recordPasswordFailure(lockKey);
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 });
  }
  resetPasswordFailures(lockKey);

  const updated = await prisma.reply.update({
    where: { id: reply.id },
    data: { name, content, updatedAt: new Date() },
  });

  return NextResponse.json(serializeReply(updated));
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const reply = await loadReply(idParam);
  if (!reply) {
    return NextResponse.json({ error: "존재하지 않는 답글입니다." }, { status: 404 });
  }

  const lockKey = `reply:${reply.id}:${getClientIp(req)}`;
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

  const passwordOk = await verifyPassword(parsed.data.password, reply.passwordHash);
  if (!passwordOk) {
    recordPasswordFailure(lockKey);
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 });
  }
  resetPasswordFailures(lockKey);

  await prisma.reply.update({ where: { id: reply.id }, data: { isDeleted: true } });

  return NextResponse.json({ ok: true });
}
