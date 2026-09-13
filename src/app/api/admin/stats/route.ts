import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const [accounts, connections, errorLogs, recentLogs, byStatus] = await Promise.all([
    prisma.account.count(),
    prisma.oneCConnection.count(),
    prisma.connectionLog.count({
      where: { level: "error", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.connectionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        account: { select: { email: true } },
      },
    }),
    prisma.oneCConnection.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    stats: {
      accounts,
      connections,
      errorLogs24h: errorLogs,
      statusBreakdown: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
    },
    recentLogs,
  });
}
