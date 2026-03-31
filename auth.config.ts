import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth configuration.
 * This file must NOT import Prisma or any Node.js-only modules
 * because it is used by middleware which runs in the Edge Runtime.
 */
export const authConfig = {
    session: { strategy: 'jwt' as const },
    pages: { signIn: '/login' },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLogin = nextUrl.pathname.startsWith('/login');

            if (isOnLogin) {
                // Redirect logged-in users away from the login page
                if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
                return true; // Allow access to login page
            }

            // Protect all other routes
            return isLoggedIn;
        },
        jwt({ token, user }) {
            if (user) token.id = user.id;
            return token;
        },
        session({ session, token }) {
            session.user.id = token.id as string;
            return session;
        },
    },
    providers: [], // Providers are added in the full auth.ts
} satisfies NextAuthConfig;
