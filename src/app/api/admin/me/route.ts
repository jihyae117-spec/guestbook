import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminSession";

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ admin: null }, { status: 200 });
  }
  return NextResponse.json({ admin });
}
