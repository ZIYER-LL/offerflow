import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions = {
  secret: process.env.AUTH_SECRET || 'offerflow-dev-secret-do-not-use-in-production',
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authorize: async (credentials: any) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: {
    jwt: async ({ token, user, account }: any) => {
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    session: async ({ session, token }: any) => {
      if (token && session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { provider?: string }).provider = token.provider as string;
      }
      return session;
    },
    signIn: async ({ user, account }: any) => {
      if (account?.provider && account.provider !== 'credentials') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || user.email?.split('@')[0],
              image: user.image,
              provider: account.provider,
            },
          });
        } else if (!existingUser.image && user.image) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { image: user.image },
          });
        }
      }
      return true;
    },
  },
};

const handler = NextAuth(authOptions);
export const { handlers, signIn, signOut, auth } = handler;
