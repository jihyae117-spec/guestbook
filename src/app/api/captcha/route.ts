import { NextResponse } from "next/server";
import { issueCaptcha } from "@/lib/captcha";

export async function GET() {
  const challenge = issueCaptcha();
  return NextResponse.json(challenge);
}
