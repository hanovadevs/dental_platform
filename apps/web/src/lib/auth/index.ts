import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@dental/db';
import { users } from '@dental/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Auth.js (NextAuth v5) configuration.
 * Provider-agnostic abstraction — credentials provider for now.
 * Per spec (00_START_HERE.md Section 6, 08_SECURITY_PRIVACY_AND_AUDIT.md Section 3).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase().trim()),
        });

        if (!user || !user.passwordHash || !user.active) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        // Update last login
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.firstName = (user as { firstName?: string }).firstName;
        token.lastName = (user as { lastName?: string }).lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { firstName?: string }).firstName = token.firstName as string;
        (session.user as { lastName?: string }).lastName = token.lastName as string;
      }
      return session;
    },
  },
});
