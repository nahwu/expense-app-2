import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function getBootstrapUser() {
  return {
    id: process.env.BOOTSTRAP_USER_ID ?? "00000000-0000-0000-0000-000000000001",
    email: process.env.BOOTSTRAP_USER_EMAIL ?? "",
    password: process.env.BOOTSTRAP_USER_PASSWORD ?? "",
    passwordHash: process.env.BOOTSTRAP_USER_PASSWORD_HASH ?? "",
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
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const credentials = parsed.data;
        const bootstrap = getBootstrapUser();
        if (!bootstrap.email || (!bootstrap.password && !bootstrap.passwordHash)) {
          return null;
        }

        if (credentials.email.toLowerCase() !== bootstrap.email.toLowerCase()) {
          return null;
        }

        const passwordMatches = bootstrap.passwordHash
          ? await compare(credentials.password, bootstrap.passwordHash)
          : credentials.password === bootstrap.password;

        if (!passwordMatches) {
          return null;
        }

        return {
          id: bootstrap.id,
          email: bootstrap.email,
        };
      },
    }),
  ],
  callbacks: {
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
