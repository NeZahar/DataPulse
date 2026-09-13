import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateClient, isAuthError } from "@/lib/client-auth";

const schema = z.object({
  status: z.enum(["unknown", "connected", "degraded", "error", "disconnected"]),
  message: z.string().max(2000).optional(),
  log: z
    .object({
      level: z.enum(["debug", "info", "warn", "error"]).default("info"),
      event: z.string().min(1).max(200),
      message: z.string().min(1).max(4000),
      details: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await authenticateClient(request);
  if (isAuthError(auth)) return auth;

  const { id } = await ctx.params;
  const connection = await prisma.oneCConnection.findFirst({
    where: { id, accountId: auth.accountId },
  });
  if (!connection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { status, message, log } = parsed.data;
  const updated = await prisma.oneCConnection.update({
    where: { id },
    data: {
      status,
      lastStatusMessage: message ?? null,
      lastCheckedAt: new Date(),
    },
  });

  if (log) {
    await prisma.connectionLog.create({
      data: {
        accountId: auth.accountId,
        connectionId: id,
        level: log.level,
        event: log.event,
        message: log.message,
        detailsJson: log.details ? JSON.stringify(log.details) : null,
      },
    });
  } else {
    await prisma.connectionLog.create({
      data: {
        accountId: auth.accountId,
        connectionId: id,
        level: status === "error" ? "error" : status === "degraded" ? "warn" : "info",
        event: "status_update",
        message: message || `Статус: ${status}`,
      },
    });
  }

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    lastCheckedAt: updated.lastCheckedAt,
  });
}
