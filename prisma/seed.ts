import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { encryptSecret, generateApiToken, hashToken } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  await prisma.connectionLog.deleteMany();
  await prisma.oneCConnection.deleteMany();
  await prisma.account.deleteMany();

  const token1 = generateApiToken();
  const token2 = generateApiToken();

  const alice = await prisma.account.create({
    data: {
      email: "alice@example.com",
      displayName: "Алиса Иванова",
      deviceId: "pulse-device-001",
      apiTokenHash: hashToken(token1),
      lastSeenAt: new Date(),
      connections: {
        create: {
          label: "Основная база",
          serverUrl: "http://1c.example.local/erp",
          baseName: "ERP_PROD",
          username: "pulse_user",
          passwordEncrypted: encryptSecret("demo-1c-password"),
          protocol: "http",
          status: "connected",
          lastStatusMessage: "Успешный обмен",
          lastCheckedAt: new Date(),
        },
      },
    },
    include: { connections: true },
  });

  const bob = await prisma.account.create({
    data: {
      email: "bob@example.com",
      displayName: "Борис Петров",
      deviceId: "pulse-device-002",
      apiTokenHash: hashToken(token2),
      lastSeenAt: new Date(Date.now() - 3600_000),
      connections: {
        create: {
          label: "Бухгалтерия",
          serverUrl: "http://1c.office.local/buh",
          baseName: "BUH_2026",
          username: "obmen",
          passwordEncrypted: encryptSecret("another-secret"),
          protocol: "odata",
          status: "error",
          lastStatusMessage: "Таймаут HTTP 1С",
          lastCheckedAt: new Date(Date.now() - 600_000),
        },
      },
    },
    include: { connections: true },
  });

  await prisma.connectionLog.createMany({
    data: [
      {
        accountId: alice.id,
        connectionId: alice.connections[0].id,
        level: "info",
        event: "sync_ok",
        message: "Синхронизация номенклатуры завершена",
        detailsJson: JSON.stringify({ items: 128 }),
      },
      {
        accountId: bob.id,
        connectionId: bob.connections[0].id,
        level: "error",
        event: "http_timeout",
        message: "Не удалось достучаться до сервера 1С",
        detailsJson: JSON.stringify({ timeoutMs: 15000 }),
      },
      {
        accountId: bob.id,
        connectionId: bob.connections[0].id,
        level: "warn",
        event: "retry",
        message: "Повторная попытка подключения (#2)",
      },
    ],
  });

  console.log("Seed OK");
  console.log("Demo API tokens (сохраните локально, в БД только hash):");
  console.log(`  alice: ${token1}`);
  console.log(`  bob:   ${token2}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
