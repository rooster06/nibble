import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that don't require authentication
const publicRoutes = ["/login", "/auth/callback"];

// Routes that don't require allowlist check (but do require auth)
const authOnlyRoutes = ["/not-allowed"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Update session and get user
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // No user - redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // For auth-only routes (like not-allowed), don't check allowlist
  if (authOnlyRoutes.some((route) => pathname.startsWith(route))) {
    return supabaseResponse;
  }

  // Check if user is in allowlist
  const { data: allowedUser } = await supabase
    .from("allowed_users")
    .select("email, role")
    .eq("email", user.email)
    .single();

  if (!allowedUser) {
    // User is authenticated but not allowed
    const url = request.nextUrl.clone();
    url.pathname = "/not-allowed";
    return NextResponse.redirect(url);
  }

  // Admin routes check
  if (pathname.startsWith("/admin") && allowedUser.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|manifest\\.json)$).*)",
  ],
};
