"use client";

import type { ReactNode } from "react";
import { signOut } from "next-auth/react";

type AdminLogoutButtonProps = {
  className?: string;
  children?: ReactNode;
};

export function AdminLogoutButton({ className, children }: AdminLogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={
        className ??
        "rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
      }
    >
      {children ?? "ログアウト"}
    </button>
  );
}
