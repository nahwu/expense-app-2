import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { query } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function authorizeCredentials(rawCredentials: unknown) {
  const parsed = credentialsSchema.safeParse(rawCredentials);
  if (!parsed.success) {
    return null;
  }

  const credentials = parsed.data;
  const result = await query<{
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
  }>(
    `
      select
        id::text as id,
        email::text as email,
        password_hash as "passwordHash",
        is_active as "isActive"
      from app_users
      where lower(email::text) = lower($1)
      limit 1
    `,
    [credentials.email],
  );

  const user = result.rows[0];
  if (!user || !user.isActive) {
    return null;
  }

  const passwordMatches = await compare(credentials.password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        return authorizeCredentials(rawCredentials);
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return url;
      }

      try {
        const targetUrl = new URL(url);
        const resolvedBase = new URL(process.env.NEXTAUTH_URL ?? baseUrl);
        if (targetUrl.origin === resolvedBase.origin) {
          return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
        }
      } catch {
        return "/";
      }

      return "/";
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
