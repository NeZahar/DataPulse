import { SessionOptions } from "iron-session";

export type AdminSessionData = {
  isAdmin: boolean;
  username: string;
  loginAt: number;
  csrfToken: string;
};

function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return secret;
}

export function getSessionOptions(): SessionOptions {
  return {
    password: requireSessionSecret(),
    cookieName: "__Host-dp_admin",
    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  };
}

/** Development uses a non-__Host cookie (Secure not required on http://localhost). */
export function getSessionOptionsSafe(): SessionOptions {
  const base = getSessionOptions();
  if (process.env.NODE_ENV !== "production") {
    return {
      ...base,
      cookieName: "dp_admin_session",
      cookieOptions: {
        ...base.cookieOptions,
        secure: false,
      },
    };
  }
  return base;
}

export function verifyCsrf(sessionToken: string | undefined, provided: string | null): boolean {
  if (!sessionToken || !provided) return false;
  if (sessionToken.length !== provided.length) return false;
  let mismatch = 0;
  for (let i = 0; i < sessionToken.length; i++) {
    mismatch |= sessionToken.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}
