import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { LoginNextHandler } from "./login-next";

export default function LoginPage() {
  return (
    <div className="fixed inset-0 flex min-h-screen w-screen items-center justify-center overflow-hidden p-6">
      <Suspense fallback={null}>
        <LoginNextHandler />
      </Suspense>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-100" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
