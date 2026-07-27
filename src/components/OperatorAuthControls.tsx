"use client";

import { useEffect, useState } from "react";
import { serverSignOut } from "@/app/auth/actions";
import { createAuthBrowserClient } from "@/lib/supabase/auth-browser";

export function OperatorAuthControls() {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createAuthBrowserClient();

    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading || !email) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-gray-600 sm:inline">{email}</span>
      <form action={serverSignOut}>
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Logout
        </button>
      </form>
    </div>
  );
}
