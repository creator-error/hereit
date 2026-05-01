"use client";

import type { ReactNode } from "react";
import { joinClasses } from "@/components/util/joinClasses";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={joinClasses(
        "pointer-events-auto",
        "inline-flex items-center gap-3",
        "rounded-[18px] border border-[rgba(212,175,55,0.34)]",
        "bg-[linear-gradient(180deg,rgba(26,31,40,0.92),rgba(15,19,28,0.9))]",
        "shadow-[0_20px_40px_rgba(0,0,0,0.34)]",
        "text-white px-4 py-2",
        "font-size: 0.75rem; line-height: 1.25rem;",
        "backdrop-blur-[12px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
