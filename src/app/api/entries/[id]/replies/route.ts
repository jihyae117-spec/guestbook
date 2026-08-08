import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { verifyCaptcha } from "@/lib/captcha";
import { checkPostRateLimit, getClientIp } from "@/lib/rateLimit";
import { replyCreateSchema } from "@/lib/validation";
import { serializeReply } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const entryId = Number(idParam);
  if (!Number.isInteger(entryId)) {
    return NextResponse.json({ error: "존재하지 않는 글입니다." }, { status: 404 });
  }

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry || entry.isDeleted) {
    return NextResponse.json({ error: "존재하지 않는 글입니다." }, { status: 404 });
  }

  const ip = getClientIp(req);
  const rateLimit = checkPostRateLimit(ip, "reply");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "너무 빠르게 요청했어요. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = replyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }, { status: 400 });
  }

  const { name, content, password, captchaToken, captchaAnswer } = parsed.data;

  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    return NextResponse.json({ error: "캡차 정답이 올바르지 않습니다." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const reply = await prisma.reply.create({
    data: { entryId, name, content, passwordHash },
  });

  return NextResponse.json(serializeReply(reply), { status: 201 });
}
