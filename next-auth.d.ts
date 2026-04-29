import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    provider?: string;
    googleSub?: string;
    roles?: string[];
    user?: DefaultSession["user"] & {
      id?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appUserId?: string;
    provider?: string;
    googleSub?: string;
    roles?: string[];
  }
}
