import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/adminSession";
import { formatDate } from "@/lib/format";

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const entries = await prisma.entry.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "asc" },
    include: {
      replies: {
        where: { isDeleted: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "방명록";
  workbook.created = new Date();

  const entrySheet = workbook.addWorksheet("글");
  entrySheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "이름", key: "name", width: 20 },
    { header: "내용", key: "content", width: 60 },
    { header: "작성일시", key: "createdAt", width: 20 },
    { header: "수정일시", key: "updatedAt", width: 20 },
    { header: "답글 수", key: "replyCount", width: 10 },
  ];
  entrySheet.getRow(1).font = { bold: true };

  for (const entry of entries) {
    entrySheet.addRow({
      id: entry.id,
      name: entry.name,
      content: entry.content,
      createdAt: formatDate(entry.createdAt.toISOString()),
      updatedAt: entry.updatedAt ? formatDate(entry.updatedAt.toISOString()) : "",
      replyCount: entry.replies.length,
    });
  }

  const replySheet = workbook.addWorksheet("답글");
  replySheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "원글 ID", key: "entryId", width: 10 },
    { header: "이름", key: "name", width: 20 },
    { header: "내용", key: "content", width: 60 },
    { header: "작성일시", key: "createdAt", width: 20 },
    { header: "수정일시", key: "updatedAt", width: 20 },
  ];
  replySheet.getRow(1).font = { bold: true };

  for (const entry of entries) {
    for (const reply of entry.replies) {
      replySheet.addRow({
        id: reply.id,
        entryId: reply.entryId,
        name: reply.name,
        content: reply.content,
        createdAt: formatDate(reply.createdAt.toISOString()),
        updatedAt: reply.updatedAt ? formatDate(reply.updatedAt.toISOString()) : "",
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `guestbook-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
