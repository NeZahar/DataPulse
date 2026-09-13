import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/crypto";

export async function authenticateClient(
  request: NextRequest,
): Promise<{ accountId: string } | NextResponse> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const account = await prisma.account.findUnique({
    where: { apiTokenHash: hashToken(token) },
    select: { id: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  await prisma.account.update({
    where: { id: account.id },
    data: { lastSeenAt: new Date() },
  });

  return { accountId: account.id };
}

export function isAuthError(
  result: { accountId: string } | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
