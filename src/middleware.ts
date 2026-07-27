import {
  FLYWHEEL_ACCESS_DENIED_MESSAGE,
  isFlywheelOperatorEmail,
} from "@/lib/auth/flywheel";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const staticFileExtensions =
    /\.(png|jpg|jpeg|gif|svg|webp|avif|ico|mp4|webm|mov|woff|woff2|ttf|otf|eot|json|xml|txt)$/i;
  if (staticFileExtensions.test(path)) {
    return NextResponse.next();
  }

  if (
    path.startsWith("/_next/") ||
    path.startsWith("/api/") ||
    path === "/favicon.ico" ||
    path === "/sitemap.xml" ||
    path === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath =
    path === "/login" || path.startsWith("/auth/");

  if (user && !isFlywheelOperatorEmail(user.email)) {
    await supabase.auth.signOut();
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", FLYWHEEL_ACCESS_DENIED_MESSAGE);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
