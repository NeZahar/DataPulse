import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { attemptAdminLogin } from "@/lib/auth/admin";
import { getAdminSession } from "@/lib/auth/session";

const bodySchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const result = await attemptAdminLogin(parsed.data.username, parsed.data.password);
  if (!result.ok) {
    const headers: HeadersInit = {};
    if (result.retryAfterSec) {
      headers["Retry-After"] = String(result.retryAfterSec);
    }
    return NextResponse.json({ error: result.error }, { status: 401, headers });
  }

  const session = await getAdminSession();
  return NextResponse.json({
    ok: true,
    username: session.username,
    csrfToken: session.csrfToken,
  });
}
