import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Gate the whole app behind HTTP Basic Auth once credentials are configured
// (BASIC_AUTH_USER / BASIC_AUTH_PASSWORD). Without them set, proxy is a
// no-op - local dev needs nothing extra.
const USER = process.env.BASIC_AUTH_USER;
const PASSWORD = process.env.BASIC_AUTH_PASSWORD;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;
  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  return safeEqual(user, USER!) && safeEqual(password, PASSWORD!);
}

export function proxy(request: NextRequest) {
  if (!USER || !PASSWORD) return NextResponse.next();

  if (!isAuthorized(request)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Pricing Tool"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
