import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || 'offerflow-dev-secret-do-not-use-in-production',
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      authorize: async (credentials) => {
        console.log('[Auth] authorize called, credentials:', JSON.stringify(credentials));

        if (!credentials?.email || !credentials?.password) {
          console.log('[Auth] missing email or password');
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        console.log('[Auth] looking up user:', email);
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.log('[Auth] user not found');
          return null;
        }

        console.log('[Auth] user found, comparing password');
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          console.log('[Auth] password invalid');
          return null;
        }

        console.log('[Auth] login success');
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token && session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
});
