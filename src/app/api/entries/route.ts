import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { verifyCaptcha } from "@/lib/captcha";
import { checkPostRateLimit, getClientIp } from "@/lib/rateLimit";
import { entryCreateSchema } from "@/lib/validation";
import { serializeEntry } from "@/lib/serialize";

const MAX_PAGE_SIZE = 30;
const DEFAULT_PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE));

  const where = { isDeleted: false };

  const [total, entries] = await Promise.all([
    prisma.entry.count({ where }),
    prisma.entry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        replies: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ]);

  return NextResponse.json({
    entries: entries.map(serializeEntry),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkPostRateLimit(ip, "entry");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "너무 빠르게 요청했어요. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = entryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }, { status: 400 });
  }

  const { name, content, password, captchaToken, captchaAnswer } = parsed.data;

  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    return NextResponse.json({ error: "캡차 정답이 올바르지 않습니다." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const entry = await prisma.entry.create({
    data: { name, content, passwordHash },
  });

  return NextResponse.json(serializeEntry({ ...entry, replies: [] }), { status: 201 });
}
