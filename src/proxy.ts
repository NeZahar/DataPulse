import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  AdminSessionData,
  getSessionOptionsSafe,
  verifyCsrf,
} from "@/lib/auth/session-shared";
import { isIpAllowed } from "@/lib/auth/ip-allowlist";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();
  applySecurityHeaders(response);

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return response;
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!isIpAllowed(ip)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname) || pathname === "/api/admin/login") {
    return response;
  }

  const session = await getIronSession<AdminSessionData>(
    request,
    response,
    getSessionOptionsSafe(),
  );

  if (!session.isAdmin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // CSRF for mutating admin API calls
  if (
    pathname.startsWith("/api/admin") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const csrf = request.headers.get("x-csrf-token");
    if (!verifyCsrf(session.csrfToken, csrf)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }
  }

  return response;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
