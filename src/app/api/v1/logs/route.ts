import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateClient, isAuthError } from "@/lib/client-auth";

const schema = z.object({
  connectionId: z.string().optional(),
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  event: z.string().min(1).max(200),
  message: z.string().min(1).max(4000),
  details: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateClient(request);
  if (isAuthError(auth)) return auth;

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

  const data = parsed.data;
  if (data.connectionId) {
    const owned = await prisma.oneCConnection.findFirst({
      where: { id: data.connectionId, accountId: auth.accountId },
    });
    if (!owned) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }
  }

  const log = await prisma.connectionLog.create({
    data: {
      accountId: auth.accountId,
      connectionId: data.connectionId ?? null,
      level: data.level,
      event: data.event,
      message: data.message,
      detailsJson: data.details ? JSON.stringify(data.details) : null,
    },
  });

  return NextResponse.json({ id: log.id }, { status: 201 });
}
