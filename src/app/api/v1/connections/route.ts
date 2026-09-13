import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { authenticateClient, isAuthError } from "@/lib/client-auth";

const schema = z.object({
  label: z.string().max(200).optional(),
  serverUrl: z.string().min(1).max(2000),
  baseName: z.string().max(500).optional(),
  username: z.string().min(1).max(500),
  password: z.string().min(1).max(2000),
  protocol: z.enum(["http", "com", "odata", "other"]).default("http"),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateClient(request);
  if (isAuthError(auth)) return auth;

  const connections = await prisma.oneCConnection.findMany({
    where: { accountId: auth.accountId },
    select: {
      id: true,
      label: true,
      serverUrl: true,
      baseName: true,
      username: true,
      protocol: true,
      status: true,
      lastStatusMessage: true,
      lastCheckedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ connections });
}

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
  const connection = await prisma.oneCConnection.create({
    data: {
      accountId: auth.accountId,
      label: data.label ?? null,
      serverUrl: data.serverUrl,
      baseName: data.baseName ?? null,
      username: data.username,
      passwordEncrypted: encryptSecret(data.password),
      protocol: data.protocol,
      status: "unknown",
    },
  });

  await prisma.connectionLog.create({
    data: {
      accountId: auth.accountId,
      connectionId: connection.id,
      level: "info",
      event: "connection_created",
      message: `Добавлено подключение к 1С: ${data.serverUrl}`,
    },
  });

  return NextResponse.json({ id: connection.id, status: connection.status }, { status: 201 });
}
