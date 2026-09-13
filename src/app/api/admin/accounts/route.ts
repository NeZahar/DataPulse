import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { decryptSecret, maskSecret } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  const accounts = await prisma.account.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q } },
            { displayName: { contains: q } },
            { deviceId: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      connections: {
        select: {
          id: true,
          label: true,
          serverUrl: true,
          baseName: true,
          username: true,
          passwordEncrypted: true,
          protocol: true,
          status: true,
          lastStatusMessage: true,
          lastCheckedAt: true,
          updatedAt: true,
        },
      },
      _count: { select: { logs: true } },
    },
  });

  const reveal = request.nextUrl.searchParams.get("reveal") === "1";

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      email: a.email,
      displayName: a.displayName,
      deviceId: a.deviceId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      lastSeenAt: a.lastSeenAt,
      logCount: a._count.logs,
      connections: a.connections.map((c) => {
        let password = "••••••••";
        try {
          const plain = decryptSecret(c.passwordEncrypted);
          password = reveal ? plain : maskSecret(plain);
        } catch {
          password = "[ошибка расшифровки]";
        }
        return {
          id: c.id,
          label: c.label,
          serverUrl: c.serverUrl,
          baseName: c.baseName,
          username: c.username,
          password,
          protocol: c.protocol,
          status: c.status,
          lastStatusMessage: c.lastStatusMessage,
          lastCheckedAt: c.lastCheckedAt,
          updatedAt: c.updatedAt,
        };
      }),
    })),
  });
}
