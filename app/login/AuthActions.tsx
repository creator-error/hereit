"use client";

import { signIn, signOut } from "next-auth/react";

type AuthActionsProps = {
  isAuthenticated: boolean;
  isConfigured: boolean;
};

export function AuthActions({ isAuthenticated, isConfigured }: AuthActionsProps) {
  if (!isConfigured) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/16"
      >
        ログアウト
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/admin" })}
      className="inline-flex items-center justify-center rounded-lg bg-[#f59e0b] px-5 py-3 text-sm font-semibold text-[#0f1729] transition hover:bg-[#fbbf24]"
    >
      Googleでログイン
    </button>
  );
}
