"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { serverSaveNext } from "@/app/auth/actions";

export function LoginNextHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next");
    if (next) {
      void serverSaveNext(next);
    }
  }, [searchParams]);

  return null;
}
