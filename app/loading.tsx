"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-background px-6 text-foreground"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <Loader2 className="size-18 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </div>
    </main>
  );
}
