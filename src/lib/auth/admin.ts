import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAdminSession, newCsrfToken } from "@/lib/auth/session";
import { isIpAllowed } from "@/lib/auth/ip-allowlist";
import { headers } from "next/headers";

export { isIpAllowed };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 30 * 60 * 1000;

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterSec?: number };

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still run a compare to reduce timing variance on length mismatch paths
    const dummy = "$2b$12$" + "0".repeat(53);
    void bcrypt.compareSync(b || "x", dummy);
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") || "unknown";
}

async function recentFailures(ip: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS);
  return prisma.loginAttempt.count({
    where: { ip, success: false, createdAt: { gte: since } },
  });
}

async function isLockedOut(ip: string): Promise<{ locked: boolean; retryAfterSec?: number }> {
  const failures = await recentFailures(ip);
  if (failures < MAX_FAILURES) return { locked: false };

  const last = await prisma.loginAttempt.findFirst({
    where: { ip, success: false },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return { locked: false };

  const unlockAt = last.createdAt.getTime() + LOCKOUT_MS;
  if (Date.now() < unlockAt) {
    return { locked: true, retryAfterSec: Math.ceil((unlockAt - Date.now()) / 1000) };
  }
  return { locked: false };
}

export async function attemptAdminLogin(
  username: string,
  password: string,
): Promise<AuthResult> {
  const ip = await getClientIp();

  if (!isIpAllowed(ip)) {
    await prisma.loginAttempt.create({ data: { ip, success: false } });
    return { ok: false, error: "Доступ запрещён" };
  }

  const lock = await isLockedOut(ip);
  if (lock.locked) {
    return {
      ok: false,
      error: "Слишком много неудачных попыток. Попробуйте позже.",
      retryAfterSec: lock.retryAfterSec,
    };
  }

  const expectedUser = process.env.ADMIN_USERNAME || "";
  const expectedHash = process.env.ADMIN_PASSWORD_HASH || "";

  if (!expectedUser || !expectedHash) {
    return { ok: false, error: "Админка не сконфигурирована" };
  }

  const userOk = constantTimeEqual(username.trim(), expectedUser);
  const passOk = expectedHash.startsWith("$2")
    ? await bcrypt.compare(password, expectedHash)
    : false;

  if (!userOk || !passOk) {
    await prisma.loginAttempt.create({ data: { ip, success: false } });
    await prisma.adminAuditLog.create({
      data: {
        action: "login_failed",
        ip,
        details: JSON.stringify({ username: username.slice(0, 64) }),
      },
    });
    return { ok: false, error: "Неверный логин или пароль" };
  }

  await prisma.loginAttempt.create({ data: { ip, success: true } });

  const session = await getAdminSession();
  session.isAdmin = true;
  session.username = expectedUser;
  session.loginAt = Date.now();
  session.csrfToken = newCsrfToken();
  await session.save();

  await prisma.adminAuditLog.create({
    data: { action: "login_success", ip, details: JSON.stringify({ username: expectedUser }) },
  });

  return { ok: true };
}

export async function requireAdmin(): Promise<{ username: string; csrfToken: string }> {
  const session = await getAdminSession();
  if (!session.isAdmin || !session.username) {
    throw new AdminAuthError();
  }
  const ip = await getClientIp();
  if (!isIpAllowed(ip)) {
    throw new AdminAuthError("IP не в allowlist");
  }
  if (!session.csrfToken) {
    session.csrfToken = newCsrfToken();
    await session.save();
  }
  return { username: session.username, csrfToken: session.csrfToken };
}

export async function destroyAdminSession(): Promise<void> {
  const ip = await getClientIp();
  const session = await getAdminSession();
  await prisma.adminAuditLog.create({
    data: {
      action: "logout",
      ip,
      details: JSON.stringify({ username: session.username ?? null }),
    },
  });
  session.destroy();
}

export class AdminAuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AdminAuthError";
  }
}
