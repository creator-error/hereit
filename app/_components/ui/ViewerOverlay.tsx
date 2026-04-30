"use client";

import type { ReactNode } from "react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ViewerOverlayPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "pointer-events-auto rounded-[24px] border border-[rgba(212,175,55,0.35)] bg-[linear-gradient(180deg,rgba(26,31,40,0.96),rgba(15,19,28,0.95))] text-white shadow-[0_24px_48px_rgba(0,0,0,0.38)] backdrop-blur-[12px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ViewerOverlayBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "pointer-events-auto inline-flex items-center gap-3 rounded-[18px] border border-[rgba(212,175,55,0.34)] bg-[linear-gradient(180deg,rgba(26,31,40,0.92),rgba(15,19,28,0.9))] px-4 py-3 text-white shadow-[0_20px_40px_rgba(0,0,0,0.34)] backdrop-blur-[12px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
