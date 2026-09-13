import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const level = request.nextUrl.searchParams.get("level") || undefined;
  const accountId = request.nextUrl.searchParams.get("accountId") || undefined;
  const take = Math.min(Number(request.nextUrl.searchParams.get("limit") || 100), 500);

  const logs = await prisma.connectionLog.findMany({
    where: {
      ...(level ? { level } : {}),
      ...(accountId ? { accountId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      account: { select: { id: true, email: true, displayName: true } },
      connection: { select: { id: true, label: true, serverUrl: true, status: true } },
    },
  });

  return NextResponse.json({ logs });
}
