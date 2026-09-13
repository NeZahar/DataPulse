import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import {
  AdminSessionData,
  getSessionOptionsSafe,
} from "@/lib/auth/session-shared";

export type { AdminSessionData };
export {
  getSessionOptions,
  getSessionOptionsSafe,
  verifyCsrf,
} from "@/lib/auth/session-shared";

export async function getAdminSession(): Promise<IronSession<AdminSessionData>> {
  return getIronSession<AdminSessionData>(await cookies(), getSessionOptionsSafe());
}

export function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}
