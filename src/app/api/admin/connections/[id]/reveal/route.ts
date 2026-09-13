import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdminAuthError, requireAdmin, getClientIp } from "@/lib/auth/admin";
import { decryptSecret } from "@/lib/crypto";

type Ctx = { params: Promise<{ id: string }> };

/** Reveal a decrypted 1C password — audited, admin-only, CSRF-protected. */
export async function POST(_request: NextRequest, ctx: Ctx) {
  let username: string;
  try {
    ({ username } = await requireAdmin());
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const { id } = await ctx.params;
  const connection = await prisma.oneCConnection.findUnique({
    where: { id },
    include: { account: { select: { email: true } } },
  });

  if (!connection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let password: string;
  try {
    password = decryptSecret(connection.passwordEncrypted);
  } catch {
    return NextResponse.json({ error: "Decrypt failed" }, { status: 500 });
  }

  const ip = await getClientIp();
  await prisma.adminAuditLog.create({
    data: {
      action: "reveal_1c_password",
      target: connection.id,
      ip,
      details: JSON.stringify({
        admin: username,
        accountEmail: connection.account.email,
      }),
    },
  });

  return NextResponse.json({ password });
}
