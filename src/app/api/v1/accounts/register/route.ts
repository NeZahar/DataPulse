import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { encryptSecret, generateApiToken, hashToken } from "@/lib/crypto";

const schema = z.object({
  email: z.string().email().max(320),
  displayName: z.string().max(200).optional(),
  deviceId: z.string().max(200).optional(),
  connection: z
    .object({
      label: z.string().max(200).optional(),
      serverUrl: z.string().min(1).max(2000),
      baseName: z.string().max(500).optional(),
      username: z.string().min(1).max(500),
      password: z.string().min(1).max(2000),
      protocol: z.enum(["http", "com", "odata", "other"]).default("http"),
    })
    .optional(),
});

/**
 * Register a Pulse account and receive an API token for subsequent reporting.
 * In production, protect this route (VPN / shared registration secret).
 */
export async function POST(request: NextRequest) {
  const registrationSecret = process.env.CLIENT_REGISTRATION_SECRET;
  if (registrationSecret) {
    const provided = request.headers.get("x-registration-secret");
    if (provided !== registrationSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, displayName, deviceId, connection } = parsed.data;
  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Account already exists" }, { status: 409 });
  }

  const apiToken = generateApiToken();
  const account = await prisma.account.create({
    data: {
      email,
      displayName: displayName ?? null,
      deviceId: deviceId ?? null,
      apiTokenHash: hashToken(apiToken),
      lastSeenAt: new Date(),
      connections: connection
        ? {
            create: {
              label: connection.label ?? null,
              serverUrl: connection.serverUrl,
              baseName: connection.baseName ?? null,
              username: connection.username,
              passwordEncrypted: encryptSecret(connection.password),
              protocol: connection.protocol,
              status: "unknown",
            },
          }
        : undefined,
    },
    include: { connections: true },
  });

  await prisma.connectionLog.create({
    data: {
      accountId: account.id,
      connectionId: account.connections[0]?.id,
      level: "info",
      event: "account_registered",
      message: "Аккаунт зарегистрирован",
    },
  });

  return NextResponse.json(
    {
      accountId: account.id,
      apiToken,
      connections: account.connections.map((c) => ({ id: c.id, status: c.status })),
    },
    { status: 201 },
  );
}
