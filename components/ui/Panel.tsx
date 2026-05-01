"use client";

import type { ReactNode } from "react";
import { joinClasses } from "@/components/util/joinClasses";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={joinClasses(
        "pointer-events-auto rounded-xl",
        "p-4",
        "border border-[rgba(212,175,55,0.34)]",
        "bg-[linear-gradient(180deg,rgba(26,31,40,0.96),rgba(15,19,28,0.95))]  backdrop-blur-[12px]",
        "bg-[linear-gradient(180deg,rgba(26,31,40,0.92),rgba(15,19,28,0.9))]",
        "text-white shadow-[0_24px_48px_rgba(0,0,0,0.38)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
