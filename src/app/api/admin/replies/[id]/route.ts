import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/adminSession";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "존재하지 않는 답글입니다." }, { status: 404 });
  }

  const reply = await prisma.reply.findUnique({ where: { id } });
  if (!reply || reply.isDeleted) {
    return NextResponse.json({ error: "존재하지 않는 답글입니다." }, { status: 404 });
  }

  await prisma.reply.update({ where: { id }, data: { isDeleted: true } });
  return NextResponse.json({ ok: true });
}
