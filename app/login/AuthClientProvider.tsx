"use client";

import { SessionProvider } from "next-auth/react";

type AuthClientProviderProps = {
  children: React.ReactNode;
};

export function AuthClientProvider({ children }: AuthClientProviderProps) {
  return <SessionProvider basePath="/auth">{children}</SessionProvider>;
}
