// auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db";
import { findUserByEmail, findUserById } from "@/models/User";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig, // Spread the shared configurations
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }

      if (trigger === "update" && token.id) {
        const currentUser = await findUserById(String(token.id));
        if (currentUser) {
          token.name = currentUser.name ?? null;
          token.email = currentUser.email;
        }
      }

      return token;
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await findUserByEmail(credentials.email as string);
        if (!user) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user._id?.toString(),
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
});
