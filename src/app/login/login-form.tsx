"use client";

import { useTransition, useState } from "react";
import { useSearchParams } from "next/navigation";
import { serverSignInWithPassword } from "@/app/auth/actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");

  const error = searchParams.get("error");
  const message = searchParams.get("message");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) {
      return;
    }

    startTransition(async () => {
      await serverSignInWithPassword(email, password);
    });
  }

  return (
    <div className="w-full space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}
      {message ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {message}
        </div>
      ) : null}

      <h1 className="text-center text-2xl font-bold tracking-tight text-[#1E3A5F]">
        Operator Login
      </h1>
      <p className="text-center text-sm text-[#64748B]">
        Sign in with your @flywheel.so email and password. Operators must
        already exist in mirror Auth — there is no signup.
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-center space-y-4"
      >
        <div className="w-full max-w-xs space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@flywheel.so"
            required
            autoComplete="username"
            disabled={isPending}
            className="h-12 w-full rounded-full border border-gray-300 bg-white px-4 text-gray-900 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2454FF] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            disabled={isPending}
            className="h-12 w-full rounded-full border border-gray-300 bg-white px-4 text-gray-900 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2454FF] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !email.trim() || !password}
          className="h-12 w-full max-w-xs rounded-full bg-[#2454FF] font-semibold text-white hover:bg-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
