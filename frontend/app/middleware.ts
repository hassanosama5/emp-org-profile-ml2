// middleware.ts (minimal version)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ONLY protect employee-profile routes (leave other subsystems alone)
  const isEmployeeProfileRoute = path.startsWith("/dashboard/employee-profile");

  if (!isEmployeeProfileRoute) {
    return NextResponse.next(); // Don't interfere with other subsystems
  }

  // Check for token only on employee-profile routes
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    // Redirect to login if trying to access employee-profile without auth
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/employee-profile/:path*", // ONLY protect employee-profile
  ],
};
