import {
  FLYWHEEL_ACCESS_DENIED_MESSAGE,
  isFlywheelOperatorEmail,
} from "@/lib/auth/flywheel";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { NextResponse } from "next/server";
import { serverGetNext } from "../actions";

const errorMessage = "An error occurred during sign in. Please try again.";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = await serverGetNext();

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorMessage)}`,
        origin,
      ),
    );
  }

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
    );
  }

  const email = data.session?.user?.email;
  if (!email || !isFlywheelOperatorEmail(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(FLYWHEEL_ACCESS_DENIED_MESSAGE)}`,
        origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, origin));
}
