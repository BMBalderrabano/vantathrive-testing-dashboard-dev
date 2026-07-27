"use server";

import {
  FLYWHEEL_ACCESS_DENIED_MESSAGE,
  isFlywheelOperatorEmail,
} from "@/lib/auth/flywheel";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function isNextRedirectError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.includes("NEXT_REDIRECT")
  );
}

export async function serverSaveNext(next: string) {
  const cookieStore = await cookies();
  cookieStore.set("next", next, {
    expires: Date.now() + 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function serverGetNext() {
  const cookieStore = await cookies();
  const next = cookieStore.get("next")?.value;

  if (next) {
    cookieStore.delete("next");
  }

  return next || "/";
}

export async function serverSignInWithPassword(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();

  if (!isFlywheelOperatorEmail(normalizedEmail)) {
    redirect(
      `/login?error=${encodeURIComponent(FLYWHEEL_ACCESS_DENIED_MESSAGE)}`,
    );
  }

  if (!password) {
    redirect(
      `/login?error=${encodeURIComponent("Password is required")}&email=${encodeURIComponent(normalizedEmail)}`,
    );
  }

  try {
    const supabase = await createAuthServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      redirect(
        `/login?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(normalizedEmail)}`,
      );
    }

    if (!data.user) {
      redirect(
        `/login?error=${encodeURIComponent("Sign in failed")}&email=${encodeURIComponent(normalizedEmail)}`,
      );
    }

    if (!isFlywheelOperatorEmail(data.user.email)) {
      await supabase.auth.signOut();
      redirect(
        `/login?error=${encodeURIComponent(FLYWHEEL_ACCESS_DENIED_MESSAGE)}`,
      );
    }

    const next = await serverGetNext();
    redirect(next);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Password sign-in error:", error);
    redirect(
      `/login?error=${encodeURIComponent("An error occurred. Please try again.")}&email=${encodeURIComponent(normalizedEmail)}`,
    );
  }
}

export async function serverSignOut() {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
