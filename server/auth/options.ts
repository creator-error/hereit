import type { NextAuthOptions, Profile } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { upsertGoogleUser } from "@/server/repositories/user-repository";

const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

const providers =
  googleClientId && googleClientSecret
    ? [
        GoogleProvider({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      ]
    : [];

type GoogleProfile = Profile & {
  picture?: string;
};

function getGoogleProfileUserInput(profile: GoogleProfile) {
  if (typeof profile.sub !== "string" || typeof profile.email !== "string") {
    return null;
  }

  return {
    googleSub: profile.sub,
    email: profile.email,
    displayName: typeof profile.name === "string" ? profile.name : null,
    avatarUrl: typeof profile.picture === "string" ? profile.picture : null,
  };
}

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google") {
        token.provider = account.provider;
      }

      if (account?.provider === "google" && profile) {
        const userInput = getGoogleProfileUserInput(profile as GoogleProfile);

        if (!userInput) {
          return token;
        }

        token.googleSub = userInput.googleSub;
        token.email = userInput.email;
        token.name = userInput.displayName ?? undefined;
        token.picture = userInput.avatarUrl ?? undefined;

        const appUser = await upsertGoogleUser(userInput);

        token.appUserId = appUser.id;
        token.roles = appUser.roles;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.appUserId === "string" ? token.appUserId : undefined;
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.image = typeof token.picture === "string" ? token.picture : session.user.image;
      }

      if (typeof token.googleSub === "string") {
        session.googleSub = token.googleSub;
      }

      if (typeof token.provider === "string") {
        session.provider = token.provider;
      }

      if (Array.isArray(token.roles)) {
        session.roles = token.roles.filter((role): role is string => typeof role === "string");
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return `${baseUrl}/login`;
    },
  },
};

export const isGoogleAuthConfigured = providers.length > 0;
