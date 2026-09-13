import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { decryptSecret, maskSecret } from "@/lib/crypto";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const { id } = await ctx.params;
  const reveal = request.nextUrl.searchParams.get("reveal") === "1";

  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      connections: true,
      logs: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    account: {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      deviceId: account.deviceId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      lastSeenAt: account.lastSeenAt,
      connections: account.connections.map((c) => {
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
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      }),
      logs: account.logs,
    },
  });
}
